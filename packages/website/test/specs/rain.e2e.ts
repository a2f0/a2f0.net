import { $, browser, expect } from "@wdio/globals";

import { drawAt, freezeClock } from "../clock";

const play = () => $(".play-toggle");
const stage = () => $(".stage");

const art = () =>
  browser.execute(
    () => document.querySelector(".ascii")?.textContent ?? "",
  ) as Promise<string>;
const ink = (text: string) => text.replace(/\s/g, "").length;
// The art's rows; the text ends with a newline.
const lines = (text: string) => text.split("\n").filter(Boolean);

// Switches to the ASCII view, giving the finished art.
const openAscii = async () => {
  await browser.url("/");
  await $(".view-toggle").click();
  await expect(stage()).toHaveAttribute("data-view", "ascii");
  return art();
};

const settled = async (finished: string) => {
  await expect($(".rain")).not.toBeExisting();
  await expect(stage()).not.toHaveAttribute("data-raining");
  await expect(play()).not.toHaveAttribute("data-playing");
  expect(await art()).toBe(finished);
};

// Reads the rain canvas: how many pixels are lit in its top and bottom
// halves, how many of those are not gray, and the sum of every channel.
const rainCanvas = () =>
  browser.execute(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(".rain");
    const ctx = canvas?.getContext("2d");
    if (!canvas?.width || !ctx) throw new Error("No rain canvas");
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const half = data.length / 2;
    let [top, bottom, colored, total] = [0, 0, 0, 0];
    for (let i = 0; i < data.length; i += 4) {
      total += data[i] + data[i + 1] + data[i + 2] + data[i + 3];
      if (data[i + 3] === 0) continue;
      if (i < half) top++;
      else bottom++;
      const channels = [data[i], data[i + 1], data[i + 2]];
      if (Math.max(...channels) - Math.min(...channels) > 2) colored++;
    }
    return { top, bottom, colored, total };
  });

describe("Code rain", () => {
  beforeEach(async () => {
    await browser.url("about:blank");
  });

  it("writes the ASCII art with falling code instead of etching", async () => {
    const finished = await openAscii();
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Play code rain animation",
    );
    await play().click();
    await expect(stage()).toHaveAttribute("data-raining");
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Stop code rain animation",
    );
    await expect(stage()).toHaveAttribute("data-view", "ascii");
    await expect($(".etch-lines")).not.toBeExisting();

    // The art starts blank, and the writers fill it in.
    expect(ink(await art())).toBe(0);
    await browser.waitUntil(async () => {
      const written = ink(await art());
      return written > 0 && written < ink(finished);
    });
    await browser.waitUntil(async () => !(await $(".rain").isExisting()), {
      timeout: 12000,
      timeoutMsg: "the rain never finished",
    });
    await settled(finished);
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Play code rain animation",
    );
  });

  it("falls from the top before writing any art", async () => {
    const clock = await freezeClock();
    try {
      await openAscii();
      await play().click();
      await drawAt(300);
      const { top, bottom } = await rainCanvas();
      expect(top).toBeGreaterThan(0);
      expect(bottom).toBe(0);
      expect(ink(await art())).toBe(0);
    } finally {
      await clock.remove();
    }
  });

  it("writes each column of the art from the top down", async () => {
    const clock = await freezeClock();
    try {
      const finished = lines(await openAscii());
      await play().click();
      for (const time of [3000, 4500, 6000]) {
        await drawAt(time);
        const shown = lines(await art());
        expect(shown).toHaveLength(finished.length);
        let written = 0;
        for (let column = 0; column < finished[0].length; column++) {
          let gap = false;
          for (let row = 0; row < finished.length; row++) {
            const char = shown[row][column];
            // Each cell is blank or its finished character, and once a
            // column has a gap, nothing below it is written yet.
            expect([" ", finished[row][column]]).toContain(char);
            if (finished[row][column] === " ") continue;
            if (char === " ") gap = true;
            else expect(gap).toBe(false);
            if (char !== " ") written++;
          }
        }
        expect(written).toBeGreaterThan(0);
      }
    } finally {
      await clock.remove();
    }
  });

  it("draws the rain in grayscale and holds it steady", async () => {
    const clock = await freezeClock();
    try {
      await openAscii();
      await play().click();
      for (const time of [1000, 3000, 5000]) {
        await drawAt(time);
        const first = await rainCanvas();
        expect(first.top + first.bottom).toBeGreaterThan(0);
        expect(first.colored).toBe(0);
        // Drawing the same moment again gives the same frame.
        await drawAt(time);
        expect((await rainCanvas()).total).toBe(first.total);
      }
    } finally {
      await clock.remove();
    }
  });

  it("stops at once when stop is pressed", async () => {
    const finished = await openAscii();
    await play().click();
    await expect($(".rain")).toBeExisting();
    await play().click();
    await settled(finished);
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Play code rain animation",
    );
  });

  it("stops the rain when the SVG view is chosen", async () => {
    const finished = await openAscii();
    await play().click();
    await expect(stage()).toHaveAttribute("data-raining");
    await $(".view-toggle").click();
    await settled(finished);
    await expect(stage()).toHaveAttribute("data-view", "svg");
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Play etching animation",
    );
  });

  it("keeps the lens shut and ignores clicks on the art while raining", async () => {
    await openAscii();
    await play().click();
    await stage().moveTo({ xOffset: -300, yOffset: -40 });
    await stage().click({ x: -300, y: -40 });
    await expect(stage()).toHaveAttribute("data-raining");
    await expect(stage()).toHaveAttribute("data-view", "ascii");
    expect(
      await browser.execute(() =>
        window
          .getComputedStyle(document.querySelector(".stage") as Element)
          .getPropertyValue("--lens"),
      ),
    ).toBe("0px");
  });

  it("ends the rain when a new width renders the art afresh", async () => {
    const columns = () =>
      browser.execute(() =>
        document
          .querySelector<HTMLElement>(".ascii")
          ?.style.getPropertyValue("--columns"),
      );
    const { width, height } = await browser.getWindowSize();
    try {
      await openAscii();
      expect(await columns()).toBe("200");
      await play().click();
      await expect(stage()).toHaveAttribute("data-raining");
      await browser.setWindowSize(900, height);
      await expect($(".rain")).not.toBeExisting();
      await expect(stage()).not.toHaveAttribute("data-raining");
      expect(await columns()).not.toBe("200");
      expect(ink(await art())).toBeGreaterThan(1000);
    } finally {
      await browser.setWindowSize(width, height);
    }
  });
});
