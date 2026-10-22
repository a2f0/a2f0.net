import { expect, test } from "bun:test";

import { CODE, codeAt } from "./code";

test("draws every cell's glyph from the code", () => {
  for (let column = 0; column < 20; column++) {
    expect(CODE).toContain(codeAt(column, 3, 500));
  }
});

test("mixes the glyphs across cells", () => {
  const glyphs = new Set(
    Array.from({ length: 200 }, (_, column) => codeAt(column, 5, 0)),
  );
  expect(glyphs.size).toBeGreaterThan(CODE.length / 2);
});

test("holds each glyph for a while, then changes it", () => {
  expect(codeAt(4, 9, 1000)).toBe(codeAt(4, 9, 1000));
  const over = (column: number) =>
    new Set(Array.from({ length: 100 }, (_, i) => codeAt(column, 9, i * 50)));
  // Every 50 ms for 5 s: a glyph lasts at least 150 ms, and it changes.
  for (let column = 0; column < 10; column++) {
    expect(over(column).size).toBeGreaterThan(1);
    expect(over(column).size).toBeLessThanOrEqual(34);
  }
});
