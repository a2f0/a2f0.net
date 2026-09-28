import { describe, expect, test } from "bun:test";

import { runEnds, subpaths } from "./strokes";

describe("runEnds", () => {
  test("keeps only the ends of a run of three or more copies", () => {
    expect(runEnds(["#w", "#w", "#w", "#w", null, "#w"])).toEqual([
      true,
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  test("keeps short runs and unrelated siblings whole", () => {
    expect(runEnds(["#a", "#a", "#b", null, null])).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
  });
});

describe("subpaths", () => {
  const nowhere = () => {
    throw new Error("absolute data needs no end points");
  };

  test("splits absolute path data into its subpaths", () => {
    expect(subpaths("M0 0 10 0 10 10Z M2 2 4 2 4 4Z", nowhere)).toEqual([
      "M0 0 10 0 10 10Z",
      "M2 2 4 2 4 4Z",
    ]);
  });

  test("makes each relative move absolute from where the last ended", () => {
    const ends: string[] = [];
    const parts = subpaths("m5 5 10 0z m2 3 4 0 0 4z m1 1h2", (prefix) => {
      ends.push(prefix);
      return prefix.endsWith("m2 3 4 0 0 4z") ? { x: 7, y: 8 } : { x: 5, y: 5 };
    });
    expect(parts).toEqual(["m5 5 10 0z", "M7 8 l4 0 0 4 z", "M8 9 h2"]);
    expect(ends).toEqual(["m5 5 10 0z", "m5 5 10 0z m2 3 4 0 0 4z"]);
  });
});
