import { expect, test } from "bun:test";

import { columnsFor, writtenPart } from "./display";

test("sizes the art at about seven pixels a column, within limits", () => {
  expect(columnsFor(700)).toBe(100);
  expect(columnsFor(320)).toBe(96);
  expect(columnsFor(1440)).toBe(200);
  expect(columnsFor(3000)).toBe(200);
});

test("shows a run's characters only above their columns' depths", () => {
  const run = { layer: "face" as const, text: "abcd", row: 2, column: 1 };
  expect(writtenPart(run, [0, 3, 2, 5, 3])).toBe("a cd");
  expect(writtenPart(run, [9, 0, 0, 0, 0])).toBe("    ");
});
