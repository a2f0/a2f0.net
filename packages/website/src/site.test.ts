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
