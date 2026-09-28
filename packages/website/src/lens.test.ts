import { expect, test } from "bun:test";

import { reach } from "./lens";

test("reaches the farthest corner of the stage", () => {
  expect(reach({ x: 50, y: 25 }, 100, 50)).toBeCloseTo(Math.hypot(50, 25));
  expect(reach({ x: 0, y: 0 }, 100, 50)).toBeCloseTo(Math.hypot(100, 50));
  expect(reach({ x: 90, y: 10 }, 100, 50)).toBeCloseTo(Math.hypot(90, 40));
});
