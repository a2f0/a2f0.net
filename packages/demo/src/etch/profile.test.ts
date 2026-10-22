import { describe, expect, test } from "bun:test";

import { mergeSpans, spansOf, widenRows } from "./profile";

describe("spansOf", () => {
  test("finds each row's painted runs", () => {
    // Two rows of five pixels.
    const mask = [0, 1, 1, 0, 1, 0, 0, 0, 0, 0];
    expect(spansOf(mask, 5, 2)).toEqual([
      [
        [1, 3],
        [4, 5],
      ],
      [],
    ]);
  });

  test("ignores paint too faint to count", () => {
    expect(spansOf([0.01, 0.5], 2, 1, 0.05)).toEqual([[[1, 2]]]);
  });
});

describe("mergeSpans", () => {
  test("joins overlapping spans and those within the gap", () => {
    expect(
      mergeSpans(
        [
          [10, 20],
          [0, 5],
          [18, 30],
          [34, 40],
        ],
        4,
      ),
    ).toEqual([
      [0, 5],
      [10, 40],
    ]);
  });
});

describe("widenRows", () => {
  test("lends each row its neighbours' spans, so gaps do not blink", () => {
    const rows = [[[0, 4] as const], [], [], [[10, 12] as const]];
    expect(widenRows(rows, 1)).toEqual([
      [[0, 4]],
      [[0, 4]],
      [[10, 12]],
      [[10, 12]],
    ]);
  });
});
