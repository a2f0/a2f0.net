import { expect, test } from "bun:test";

import { lettersFirst, mostlyWithin } from "./order";

test("moves the lettering first, keeping each group in order", () => {
  const items = [
    { name: "brush", letter: false },
    { name: "face", letter: true },
    { name: "ribbon", letter: false },
    { name: "bevel", letter: true },
  ];
  expect(lettersFirst(items).map(({ name }) => name)).toEqual([
    "face",
    "bevel",
    "brush",
    "ribbon",
  ]);
});

test("counts a shape as on the letters when most of it is", () => {
  const onLeft = ({ x }: { x: number }) => x < 10;
  const points = (...xs: number[]) => xs.map((x) => ({ x, y: 0 }));
  expect(mostlyWithin(points(1, 2, 3, 20), onLeft)).toBe(true);
  expect(mostlyWithin(points(1, 2, 20, 30), onLeft)).toBe(false);
});
