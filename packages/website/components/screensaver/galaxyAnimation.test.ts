import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { GalaxyScreensaver } from "./GalaxyScreensaver";
import { startGalaxyAnimation } from "./galaxyAnimation";

let canvas: HTMLCanvasElement;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let stop: (() => void) | undefined;
let reducedMotion: MediaQueryList;
let resolution: MediaQueryList;
let originalWidth: PropertyDescriptor | undefined;
let originalScale: PropertyDescriptor | undefined;
let points: number[][];
let colors: string[];
const transform = mock();
const fillRect = mock();

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterAll(() => GlobalRegistrator.unregister());

beforeEach(() => {
  canvas = document.createElement("canvas");
  originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
  originalScale = Object.getOwnPropertyDescriptor(window, "devicePixelRatio");
  frames = new Map();
  nextFrame = 0;
  points = [];
  colors = [];
  transform.mockClear();
  fillRect.mockClear();
  const context = {
    fillStyle: "",
    globalAlpha: 1,
    fillRect,
    setTransform: transform,
    save: mock(),
    restore: mock(),
    translate: mock(),
    rotate: mock(),
    scale: mock(),
    beginPath: mock(),
    arc(x: number, y: number, radius: number) {
      points.push([x, y, radius]);
    },
    fill() {
      colors.push(this.fillStyle);
    },
    createRadialGradient: () => ({
      addColorStop: (_offset: number, color: string) => colors.push(color),
    }),
  };
  spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  const matchMedia = window.matchMedia.bind(window);
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(reducedMotion, "matches", {
    configurable: true,
    value: false,
  });
  spyOn(window, "matchMedia").mockImplementation((query) => {
    if (query.includes("prefers-reduced-motion")) return reducedMotion;
    resolution = matchMedia(query);
    return resolution;
  });
});

afterEach(() => {
  stop?.();
  stop = undefined;
  mock.restore();
  if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
  else Reflect.deleteProperty(window, "innerWidth");
  if (originalScale)
    Object.defineProperty(window, "devicePixelRatio", originalScale);
  else Reflect.deleteProperty(window, "devicePixelRatio");
});

function tick(time: number) {
  const callback = [...frames.values()][0];
  if (!callback) throw new Error("Missing galaxy animation frame");
  frames.clear();
  points = [];
  callback(time);
}

function setReducedMotion(matches: boolean) {
  Object.defineProperty(reducedMotion, "matches", {
    configurable: true,
    value: matches,
  });
  reducedMotion.dispatchEvent(new Event("change"));
}

test("mounts the galaxy canvas and cancels the frame on unmount", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(GalaxyScreensaver)));
    expect(container.querySelector("canvas.galaxy-screensaver")).not.toBeNull();
    expect(frames.size).toBe(1);
  } finally {
    await act(async () => root.unmount());
  }
  expect(frames.size).toBe(0);
});

test("paints grayscale stars immediately and turns the spiral on subsequent frames", () => {
  stop = startGalaxyAnimation(canvas);
  expect(points.length).toBeGreaterThanOrEqual(1600);
  expect(colors).toContain("#ffffff");
  for (const color of colors.filter((value) => value.startsWith("rgba"))) {
    const channels = color.match(/[\d.]+/g);
    expect(channels?.[0]).toBe(channels?.[1]);
    expect(channels?.[1]).toBe(channels?.[2]);
  }
  tick(0);
  const initial = points;
  tick(1000);
  expect(points).toHaveLength(1600);
  expect(points).not.toEqual(initial);
  expect(points.every((point) => point.every(Number.isFinite))).toBe(true);
  expect(frames.size).toBe(1);
});

test("reduced motion paints a static galaxy and changes do not accumulate frames", () => {
  setReducedMotion(true);
  stop = startGalaxyAnimation(canvas);
  expect(points.length).toBeGreaterThan(0);
  expect(frames.size).toBe(0);
  setReducedMotion(false);
  expect(frames.size).toBe(1);
  setReducedMotion(false);
  expect(frames.size).toBe(1);
  setReducedMotion(true);
  expect(frames.size).toBe(0);
  const draws = fillRect.mock.calls.length;
  stop();
  setReducedMotion(false);
  expect(frames.size).toBe(0);
  expect(fillRect.mock.calls.length).toBe(draws);
});

test("resizes and re-arms DPR changes even with reduced motion, then removes listeners", () => {
  setReducedMotion(true);
  stop = startGalaxyAnimation(canvas);
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 720,
  });
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 1.5,
  });
  window.dispatchEvent(new Event("resize"));
  expect(canvas.width).toBe(1080);
  expect(transform).toHaveBeenLastCalledWith(1.5, 0, 0, 1.5, 0, 0);
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 3,
  });
  const previousResolution = resolution;
  resolution.dispatchEvent(new Event("change"));
  expect(canvas.width).toBe(1440);
  expect(resolution).not.toBe(previousResolution);
  expect(frames.size).toBe(0);
  const draws = fillRect.mock.calls.length;
  previousResolution.dispatchEvent(new Event("change"));
  expect(fillRect.mock.calls.length).toBe(draws);
  stop();
  window.dispatchEvent(new Event("resize"));
  resolution.dispatchEvent(new Event("change"));
  expect(fillRect.mock.calls.length).toBe(draws);
});

test("an already queued callback cannot restart a disposed animation", () => {
  stop = startGalaxyAnimation(canvas);
  const callback = [...frames.values()][0];
  const draws = fillRect.mock.calls.length;
  stop();
  callback?.(100);
  expect(frames.size).toBe(0);
  expect(fillRect.mock.calls.length).toBe(draws);
});

test("missing canvas support creates neither frames nor listeners", () => {
  spyOn(canvas, "getContext").mockReturnValue(null);
  const addListener = spyOn(window, "addEventListener");
  stop = startGalaxyAnimation(canvas);
  expect(frames.size).toBe(0);
  expect(addListener).not.toHaveBeenCalled();
  expect(fillRect).not.toHaveBeenCalled();
});
