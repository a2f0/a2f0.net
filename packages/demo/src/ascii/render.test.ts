import { describe, expect, test } from "bun:test";

import { append, layerOf, type Run, sharpen, tone } from "./render";

describe("sharpen", () => {
  test("keeps the peak and drops fainter values faster", () => {
    expect(sharpen(0.8, 0.8)).toBeCloseTo(0.8);
    expect(sharpen(0.4, 0.8)).toBeLessThan(0.4);
    expect(sharpen(0.4, 0)).toBe(0);
  });
});

describe("tone", () => {
  test("shades faces brightest and the extrusion dimmer", () => {
    expect(tone(1, 1, 1)).toBeCloseTo(1);
    expect(tone(1, 0, 1)).toBeCloseTo(0.4);
    expect(tone(0.5, 0, 0)).toBeCloseTo(0.2);
  });

  test("keeps true ink black on the letters", () => {
    expect(tone(0.05, 1, 1)).toBe(0);
  });
});

describe("layerOf", () => {
  test("classifies cells by the layer that covers them", () => {
    expect(layerOf(0.3, 0.1)).toBe("face");
    expect(layerOf(0.1, 0.3)).toBe("side");
    expect(layerOf(0.5, 0.5)).toBe("face");
    expect(layerOf(0.2, 0.2)).toBe("");
  });
});

describe("append", () => {
  test("extends the last run until the layer changes", () => {
    const runs: Run[] = [];
    for (const [layer, char] of [
      ["", " "],
      ["", "."],
      ["face", "#"],
      ["face", "@"],
      ["side", "\\"],
    ] as const) {
      append(runs, layer, char);
    }
    expect(runs).toEqual([
      { layer: "", text: " ." },
      { layer: "face", text: "#@" },
      { layer: "side", text: "\\" },
    ]);
  });
});
