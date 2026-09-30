import { $, $$, browser, expect } from "@wdio/globals";

import { LINES, ZOOM_MS } from "../../src/terminal";

const toggle = () => $(".window-toggle");
const frame = () => $(".window");

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Where the art, the window, its bars, and the toggle's square sit.
const layout = () =>
  browser.execute(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const { left, top, right, bottom } = element.getBoundingClientRect();
      return { left, top, right, bottom };
    };
    return {
      stage: box(".stage"),
      frame: box(".window"),
      bar: box(".titlebar"),
      prompt: box(".prompt"),
      square: box(".window-toggle rect"),
    };
  });

// Holds every outline at a moment of the zoom, giving where each sits.
const zoomAt = (time: number) =>
  browser.execute((at: number) => {
    const lines = [...document.querySelectorAll(".zoom-line")];
    for (const animation of document.getAnimations()) {
      const { target } = animation.effect as KeyframeEffect;
      if (target && lines.includes(target)) {
        animation.pause();
        animation.currentTime = at;
      }
    }
    return lines.map((line) => {
      const { left, top, right, bottom } = line.getBoundingClientRect();
      return { left, top, right, bottom };
    });
  }, time);

// The stage fits the taller of the two views, so the art is measured once
// the page has opened on the rendered ASCII.
const loaded = async () => {
  await browser.url("/");
  await expect($(".stage")).toHaveAttribute("data-view", "ascii");
  await browser.action("pointer").move({ x: 1, y: 1 }).perform();
};

const settled = () =>
  browser.waitUntil(async () => (await $$(".zoom-line").length) === 0, {
    timeoutMsg: "the outlines never cleared",
  });

const expectNear = (actual: Box, expected: Box) => {
  for (const side of ["left", "top", "right", "bottom"] as const) {
    expect(Math.abs(actual[side] - expected[side])).toBeLessThanOrEqual(1);
  }
};

describe("Terminal window", () => {
  beforeEach(async () => {
    await browser.url("about:blank");
  });

  it("starts closed", async () => {
    await browser.url("/");
    await expect(toggle()).toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
    await expect(frame()).not.toBeDisplayed();
  });

  it("opens a window around the art without moving it", async () => {
    await loaded();
    const before = (await layout()).stage;
    await toggle().click();
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
    await settled();
    await expect(frame()).toBeDisplayed();
    await expect($(".title")).toHaveText("a2f0 — zsh");
    await expect($(".prompt")).toHaveText("a2f0@a2f0.net ~ %");
    await expect($(".cursor")).toBeExisting();

    const { stage, frame: window, bar, prompt } = await layout();
    expect(stage).toEqual(before);
    // The frame runs down the art's sides, with the title bar above the art
    // and the prompt below it.
    expect(window.left).toBe(stage.left);
    expect(window.right).toBe(stage.right);
    expect(bar.bottom).toBeCloseTo(stage.top, 0);
    expect(prompt.top).toBeCloseTo(stage.bottom, 0);
  });

  it("zooms a trail of outlines out from the square to the frame", async () => {
    await loaded();
    await toggle().click();
    const { square, frame: window } = await layout();

    const start = await zoomAt(0);
    expect(start).toHaveLength(LINES);
    for (const line of start) expectNear(line, square);

    // Midway, each outline has spread further than the one behind it.
    const widths = (await zoomAt(ZOOM_MS / 3)).map(
      ({ left, right }) => right - left,
    );
    expect(widths[0]).toBeGreaterThan(square.right - square.left + 100);
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeLessThanOrEqual(widths[i - 1]);
    }

    for (const line of await zoomAt(ZOOM_MS)) expectNear(line, window);
  });

  it("closes back into the square", async () => {
    await loaded();
    const before = (await layout()).stage;
    await toggle().click();
    await settled();
    const { frame: window, square } = await layout();

    await toggle().click();
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
    const start = await zoomAt(0);
    expect(start).toHaveLength(LINES);
    for (const line of start) expectNear(line, window);
    for (const line of await zoomAt(ZOOM_MS)) expectNear(line, square);

    // Let the held outlines finish.
    await browser.execute(() => {
      for (const animation of document.getAnimations()) {
        const { target } = animation.effect as KeyframeEffect;
        if (target?.matches(".zoom-line")) animation.finish();
      }
    });
    await settled();
    await expect(frame()).not.toBeDisplayed();
    await expect($(".canvas")).not.toHaveAttribute("data-window");
    expect((await layout()).stage).toEqual(before);
  });

  it("settles on the last choice when toggled quickly", async () => {
    await browser.url("/");
    await toggle().click();
    await toggle().click();
    await settled();
    await expect(frame()).not.toBeDisplayed();

    await toggle().click();
    await toggle().click();
    await toggle().click();
    await settled();
    await expect(frame()).toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("opens at once when motion is reduced", async () => {
    const reduced = await browser.addInitScript(() => {
      const match = window.matchMedia.bind(window);
      window.matchMedia = (query: string) =>
        query === "(prefers-reduced-motion: reduce)"
          ? ({ matches: true } as MediaQueryList)
          : match(query);
    });
    try {
      await browser.url("/");
      await toggle().click();
      expect(await $$(".zoom-line").length).toBe(0);
      await expect(frame()).toBeDisplayed();
      await toggle().click();
      await expect(frame()).not.toBeDisplayed();
    } finally {
      await reduced.remove();
    }
  });

  it("lets clicks through to the art", async () => {
    await loaded();
    await toggle().click();
    await settled();
    await $(".stage").click({ x: -300, y: -40 });
    await expect($(".stage")).toHaveAttribute("data-view", "svg");
  });
});
