import { $, browser, expect } from "@wdio/globals";
import { useDesktop, waitForResumeFit } from "../lib/desktop";

const canvas = () => $("canvas.laser-screensaver");

async function startFromDesktop() {
  await browser
    .action("pointer")
    .move({ x: 40, y: 760 })
    .down({ button: 2 })
    .up({ button: 2 })
    .perform();
  await $(".menu").$("button=Start Screensaver").click();
  await expect(canvas()).toBeDisplayed();
  await expect($(".menu")).not.toBeExisting();
}

const laserPixels = () =>
  browser.execute(() => {
    const element = document.querySelector<HTMLCanvasElement>(
      "canvas.laser-screensaver",
    );
    if (!element) throw new Error("Missing laser canvas");
    const context = element.getContext("2d");
    if (!context) throw new Error("Missing laser context");
    const { data } = context.getImageData(0, 0, element.width, element.height);
    let lit = 0;
    let colored = 0;
    let checksum = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 0) lit += 1;
      if (data[index] !== data[index + 1] || data[index] !== data[index + 2]) {
        colored += 1;
      }
      checksum = (checksum + data[index] * (index + 1)) % 2147483647;
    }
    const bounds = element.getBoundingClientRect();
    const overlay = element.closest("dialog.screensaver-overlay");
    const covers = [
      [1, 1],
      [innerWidth - 2, innerHeight - 2],
      [Math.floor(innerWidth / 2), Math.floor(innerHeight / 2)],
    ].every(([x, y]) => document.elementFromPoint(x, y) === overlay);
    return {
      lit,
      colored,
      checksum,
      covers,
      cursor: getComputedStyle(element).cursor,
      width: bounds.width,
      height: bounds.height,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });

const windowFrames = () =>
  browser.execute(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        ".desktop-surface section.window",
      ),
    ].map((frame) => ({
      id: frame.id,
      title: frame.getAttribute("aria-label"),
      style: frame.getAttribute("style"),
    })),
  );

describe("desktop laser screensaver", () => {
  useDesktop();

  it("starts from the desktop, paints animated grayscale, and preserves windows", async () => {
    await expect(canvas()).not.toBeExisting();
    await waitForResumeFit();
    const before = await windowFrames();
    await startFromDesktop();
    const first = await laserPixels();
    expect(first.lit).toBeGreaterThan(0);
    expect(first.colored).toBe(0);
    expect(first.covers).toBe(true);
    expect(first.cursor).toBe("none");
    expect(first.width).toBe(first.viewport.width);
    expect(first.height).toBe(first.viewport.height);
    await browser.waitUntil(
      async () => (await laserPixels()).checksum !== first.checksum,
      { timeoutMsg: "the laser trails did not animate" },
    );
    // Escape is also the immediate way out during the initial input grace period.
    await browser.keys("Escape");
    await expect(canvas()).not.toBeExisting();
    expect(await windowFrames()).toEqual(before);
  });

  it("is keyboard reachable from Start and leaves the desktop usable", async () => {
    const start = $(".desktop-taskbar button[aria-label='Menu']");
    await start.click();
    await browser.keys(["End", "Enter"]);
    await expect(canvas()).toBeDisplayed();
    await browser.keys("Escape");
    await expect(canvas()).not.toBeExisting();
    await start.click();
    await $(".menu").$("button=Display Properties").click();
    await expect($(".display-properties-window")).toBeDisplayed();
  });

  it("ignores launch motion, resizes, then dismisses without clicking through", async () => {
    await startFromDesktop();
    await browser.action("pointer").move({ x: 60, y: 750 }).perform();
    await expect(canvas()).toBeDisplayed();
    await browser.setViewport({ width: 1280, height: 800 });
    await browser.waitUntil(async () => {
      const pixels = await laserPixels();
      return (
        pixels.width === pixels.viewport.width &&
        pixels.height === pixels.viewport.height
      );
    });
    const position = await browser.execute(() => {
      const start = document.querySelector(
        ".desktop-taskbar button[aria-label='Menu']",
      );
      if (!start) throw new Error("Missing Start button");
      const bounds = start.getBoundingClientRect();
      return {
        x: Math.round(bounds.x + bounds.width / 2),
        y: Math.round(bounds.y + bounds.height / 2),
      };
    });
    await browser
      .action("pointer")
      .move({ origin: "viewport", ...position })
      .perform();
    // Keep the pointer above Start, then dismiss with a click, not a preceding
    // move: a later independent click after movement dismissal is valid input.
    await browser.pause(2100);
    await browser.action("pointer").down().up().perform();
    await expect(canvas()).not.toBeExisting();
    await expect($(".menu")).not.toBeExisting();
    await expect(
      $(".desktop-taskbar button[aria-label='Menu']"),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
