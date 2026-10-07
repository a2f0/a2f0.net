import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, type ComponentType, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { MiniAppProps } from "./types";

// A stand-in for one mounted dnbm app, whose `ready` the test settles.
interface FakeInstance {
  container: HTMLElement;
  destroyed: boolean;
  resolve: () => void;
  reject: (reason: Error) => void;
}

let instances: FakeInstance[] = [];

function mountFake(container: HTMLElement) {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const instance: FakeInstance = {
    container,
    destroyed: false,
    resolve,
    reject,
  };
  instances.push(instance);
  const element = document.createElement("div");
  container.append(element);
  return {
    element,
    ready: promise,
    destroy() {
      instance.destroyed = true;
      element.remove();
    },
  };
}

mock.module("@a2f0/dnbm", () => ({
  mountDnbm: mountFake,
  mountDnbmPlayer: mountFake,
}));

const { DnbmApp } = await import("./dnbm/DnbmApp");
const { DnbmPlayerApp } = await import("./dnbm-player/DnbmPlayerApp");

const APPS: [string, ComponentType<MiniAppProps>][] = [
  ["sequencer", DnbmApp],
  ["player", DnbmPlayerApp],
];

// Lets a settled `ready` deliver its callbacks.
const settle = () => act(() => Promise.resolve());

const render = async (App: ComponentType<MiniAppProps>) => {
  const onLoad = mock(() => undefined);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() =>
    root.render(
      <StrictMode>
        <App onLoad={onLoad} />
      </StrictMode>,
    ),
  );
  const unmount = async () => {
    await act(() => root.unmount());
    container.remove();
  };
  return { onLoad, unmount };
};

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterAll(() => GlobalRegistrator.unregister());

beforeEach(() => {
  instances = [];
});

for (const [name, App] of APPS) {
  test(`the ${name} reports loaded once its instance is ready`, async () => {
    const { onLoad, unmount } = await render(App);

    // Strict Mode mounts, destroys, and mounts again into the same host.
    expect(instances).toHaveLength(2);
    const [first, second] = instances;
    if (!first || !second) throw new Error("The app did not mount twice");
    expect(first.destroyed).toBe(true);
    expect(second.destroyed).toBe(false);
    expect(second.container).toBe(first.container);
    expect(onLoad).not.toHaveBeenCalled();

    // A destroyed instance never fits the window, even if it was ready.
    first.resolve();
    await settle();
    expect(onLoad).not.toHaveBeenCalled();

    second.resolve();
    await settle();
    expect(onLoad).toHaveBeenCalledTimes(1);

    await unmount();
    expect(second.destroyed).toBe(true);
  });

  test(`the ${name} reports loaded when it can't start`, async () => {
    const { onLoad, unmount } = await render(App);
    instances.at(-1)?.reject(new Error("Couldn't load the assets."));
    await settle();
    // The window fits to the app, which shows why it couldn't start.
    expect(onLoad).toHaveBeenCalledTimes(1);
    await unmount();
  });

  test(`the ${name} stays quiet once unmounted`, async () => {
    const { onLoad, unmount } = await render(App);
    const current = instances.at(-1);
    await unmount();
    expect(current?.destroyed).toBe(true);
    current?.resolve();
    await settle();
    expect(onLoad).not.toHaveBeenCalled();
  });
}
