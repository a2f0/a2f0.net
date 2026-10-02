import { readFile } from "node:fs/promises";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  type Mock,
  spyOn,
  test,
} from "bun:test";

import { AsciiDisplay } from "./ascii/display";
import { Etcher } from "./etch/etcher";
import { Rain } from "./rain/rain";
import { mountSite } from "./site";

const page = await readFile(
  new URL("../public/index.html", import.meta.url),
  "utf8",
);

let fetchSpy: Mock<typeof fetch>;
let errorSpy: Mock<typeof console.error>;

beforeAll(() => {
  // Reduced motion keeps the terminal window from animating, which
  // happy-dom does not support.
  GlobalRegistrator.register({
    settings: { device: { prefersReducedMotion: "reduce" } },
  });
});
afterAll(() => GlobalRegistrator.unregister());

beforeEach(() => {
  // The artwork never loads, so the site falls back to the SVG.
  fetchSpy = spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
  errorSpy = spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  fetchSpy.mockRestore();
  errorSpy.mockRestore();
});

/** Puts index.html's <main> on the page, ready to mount. */
const render = (): HTMLElement => {
  const source = new DOMParser().parseFromString(page, "text/html");
  const main = document.createElement("main");
  main.innerHTML = source.querySelector("main")?.innerHTML ?? "";
  document.body.replaceChildren(main);
  return main;
};

const settled = () => new Promise((resolve) => setTimeout(resolve, 20));

const windowPressed = (container: HTMLElement) =>
  container.querySelector(".window-toggle")?.getAttribute("aria-pressed");

const pressWindow = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>(".window-toggle")?.click();

test("falls back to the SVG when the artwork cannot load", async () => {
  const container = render();
  const unmount = mountSite(container);
  await settled();
  const stage = container.querySelector<HTMLElement>(".stage");
  expect(stage?.dataset.ready).toBe("");
  expect(stage?.dataset.view).toBe("svg");
  expect(
    container.querySelector(".view-toggle")?.getAttribute("aria-pressed"),
  ).toBe("false");
  expect(errorSpy).toHaveBeenCalled();
  unmount();
});

test("ignores its controls once unmounted", async () => {
  const container = render();
  const unmount = mountSite(container);
  pressWindow(container);
  expect(windowPressed(container)).toBe("true");
  unmount();
  pressWindow(container);
  expect(windowPressed(container)).toBe("true");
  await settled();
});

test("handles each control once when mounted again", async () => {
  const container = render();
  mountSite(container)();
  const unmount = mountSite(container);
  pressWindow(container);
  expect(windowPressed(container)).toBe("true");
  pressWindow(container);
  expect(windowPressed(container)).toBe("false");
  unmount();
  await settled();
});

test("leaves the markup alone when unmounted during the first render", async () => {
  const container = render();
  const unmount = mountSite(container);
  unmount();
  await settled();
  const stage = container.querySelector<HTMLElement>(".stage");
  // Unmounted, the failed render neither falls back to the SVG nor reveals it.
  expect(stage?.dataset.ready).toBeUndefined();
  expect(
    container.querySelector(".view-toggle")?.getAttribute("aria-pressed"),
  ).toBe("true");
  expect(errorSpy).not.toHaveBeenCalled();
});

test("abandons the render under way when unmounted", () => {
  const abandon = spyOn(AsciiDisplay.prototype, "abandon");
  try {
    const unmount = mountSite(render());
    expect(abandon).not.toHaveBeenCalled();
    unmount();
    expect(abandon).toHaveBeenCalledTimes(1);
  } finally {
    abandon.mockRestore();
  }
});

test("resets the play button when unmounted during an animation", async () => {
  // The ASCII fails to load, so the site settles on the SVG, and the etching
  // then waits on its own fetch of the artwork.
  fetchSpy.mockReturnValue(new Promise<Response>(() => undefined));
  fetchSpy.mockRejectedValueOnce(new Error("offline"));
  const container = render();
  const unmount = mountSite(container);
  await settled();
  const play = container.querySelector<HTMLButtonElement>(".play-toggle");
  play?.click();
  expect(play?.dataset.playing).toBe("");
  expect(play?.getAttribute("aria-label")).toBe("Stop etching animation");
  unmount();
  expect(play?.dataset.playing).toBeUndefined();
  expect(play?.getAttribute("aria-label")).toBe("Play etching animation");
});

test("stops both animations when unmounted", () => {
  const stops = [
    spyOn(Etcher.prototype, "stop"),
    spyOn(Rain.prototype, "stop"),
  ];
  try {
    const unmount = mountSite(render());
    unmount();
    for (const stop of stops) expect(stop).toHaveBeenCalledTimes(1);
  } finally {
    for (const stop of stops) stop.mockRestore();
  }
});

test("keeps Stop showing for an animation restarted as the last one stops", async () => {
  // A stand-in etching that runs until stopped.
  let running = false;
  let settle: () => void = () => undefined;
  const playing = Object.getOwnPropertyDescriptor(Etcher.prototype, "playing");
  Object.defineProperty(Etcher.prototype, "playing", {
    configurable: true,
    get: () => running,
  });
  const stubs = [
    spyOn(Etcher.prototype, "play").mockImplementation(() => {
      running = true;
      return new Promise((resolve) => {
        settle = resolve;
      });
    }),
    spyOn(Etcher.prototype, "stop").mockImplementation(() => {
      running = false;
      settle();
    }),
  ];
  try {
    const container = render();
    const unmount = mountSite(container);
    // The artwork fails to load, so the site settles on the SVG.
    await settled();
    const play = container.querySelector<HTMLButtonElement>(".play-toggle");
    // Play, stop, and play again before the first etching settles.
    play?.click();
    play?.click();
    play?.click();
    await settled();
    expect(running).toBe(true);
    expect(play?.dataset.playing).toBe("");
    expect(play?.getAttribute("aria-label")).toBe("Stop etching animation");
    play?.click();
    await settled();
    expect(play?.dataset.playing).toBeUndefined();
    unmount();
  } finally {
    for (const stub of stubs) stub.mockRestore();
    if (playing) Object.defineProperty(Etcher.prototype, "playing", playing);
  }
});
