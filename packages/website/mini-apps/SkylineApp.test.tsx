import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  mock,
  test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { ThemeProvider, ThemeSwitch } from "@tearleads/windowing";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { WEBSITE_THEMES } from "../components/themes";

// A stand-in for one mounted skyline viewer.
interface FakeViewer {
  container: HTMLElement;
  options: unknown;
  destroyed: boolean;
}

let viewers: FakeViewer[] = [];

mock.module("@a2f0/skyline", () => ({
  mountSkyline(container: HTMLElement, options: unknown) {
    const viewer: FakeViewer = { container, options, destroyed: false };
    viewers.push(viewer);
    const element = document.createElement("div");
    container.append(element);
    return {
      element,
      ready: new Promise<void>(() => undefined),
      destroy() {
        viewer.destroyed = true;
        element.remove();
      },
    };
  },
}));

const { SkylineApp } = await import("./skyline/SkylineApp");

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterAll(() => GlobalRegistrator.unregister());
afterEach(() => {
  localStorage.removeItem("skyline-test.theme");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-scheme");
});

beforeEach(() => {
  viewers = [];
});

test("the skyline mounts its viewer with open controls and destroys it on unmount", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() =>
    root.render(
      <StrictMode>
        <SkylineApp />
      </StrictMode>,
    ),
  );

  // Strict Mode mounts, destroys, and mounts again into the same host.
  expect(viewers).toHaveLength(2);
  const [first, second] = viewers;
  if (!first || !second) throw new Error("The viewer did not mount twice");
  expect(first.destroyed).toBe(true);
  expect(second.destroyed).toBe(false);
  expect(second.container).toBe(first.container);
  expect(second.container.className).toBe("skyline-window");
  expect(second.options).toEqual({
    assetsUrl: "/skyline/",
    controls: "open",
    colour: false,
    theme: "dark",
  });
  // Only the live viewer's element stays in the host.
  expect(second.container.childElementCount).toBe(1);

  await act(() => root.unmount());
  container.remove();
  expect(second.destroyed).toBe(true);
});

test("Paper mounts a colour skyline and switching back releases that viewer", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() =>
    root.render(
      <ThemeProvider
        themes={WEBSITE_THEMES}
        defaultTheme="paper"
        storageKey="skyline-test.theme"
      >
        <SkylineApp />
        <ThemeSwitch />
      </ThemeProvider>,
    ),
  );
  expect(viewers[0]?.options).toEqual({
    assetsUrl: "/skyline/",
    controls: "open",
    colour: true,
    theme: "light",
  });
  await act(() => container.querySelector("button")?.click());
  expect(viewers).toHaveLength(2);
  expect(viewers[0]?.destroyed).toBe(true);
  expect(viewers[1]?.options).toEqual({
    assetsUrl: "/skyline/",
    controls: "open",
    colour: false,
    theme: "dark",
  });
  expect(viewers[1]?.container.childElementCount).toBe(1);
  await act(() => root.unmount());
  container.remove();
  expect(viewers[1]?.destroyed).toBe(true);
});
