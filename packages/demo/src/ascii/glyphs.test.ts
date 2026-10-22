import { describe, expect, test } from "bun:test";

import { CHARSET, CIRCLES, circleOffsets, EXTERNAL, nearest } from "./glyphs";

describe("circleOffsets", () => {
  test("keeps every offset within its circle", () => {
    const [width, height] = [12, 20];
    const circles = circleOffsets(CIRCLES, width, height);
    expect(circles).toHaveLength(CIRCLES.length);
    circles.forEach((offsets, i) => {
      const [cx, cy] = CIRCLES[i];
      expect(offsets.length).toBeGreaterThan(0);
      for (const [x, y] of offsets) {
        const distance = Math.hypot(
          x + 0.5 - cx * width,
          y + 0.5 - cy * height,
        );
        expect(distance).toBeLessThanOrEqual(0.24 * width);
      }
    });
  });

  test("reaches past the cell for the outer circles", () => {
    const offsets = circleOffsets(EXTERNAL, 12, 20).flat();
    expect(offsets.some(([x, y]) => x < 0 || y < 0)).toBe(true);
    expect(offsets.some(([x, y]) => x >= 12 || y >= 20)).toBe(true);
  });
});

describe("nearest", () => {
  const glyphs = [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 1],
  ];

  test("picks the character with the closest shape", () => {
    expect(nearest([0.9, 0.1, 0], glyphs)).toBe(CHARSET[1]);
    expect(nearest([0, 0.8, 0.7], glyphs)).toBe(CHARSET[2]);
  });

  test("prefers the earlier character on a tie", () => {
    expect(nearest([0.5, 0, 0], glyphs)).toBe(CHARSET[0]);
  });
});
