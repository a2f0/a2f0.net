import { expect, test } from "bun:test";

import { columnsFor } from "./display";

test("sizes the art at about seven pixels a column, within limits", () => {
  expect(columnsFor(700)).toBe(100);
  expect(columnsFor(320)).toBe(96);
  expect(columnsFor(1440)).toBe(200);
  expect(columnsFor(3000)).toBe(200);
});
