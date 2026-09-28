import { describe, expect, test } from "bun:test";

import {
  glowOf,
  headOf,
  RAIN_MS,
  rainEnd,
  schedule,
  writtenRows,
} from "./timeline";

// Falls a row every 16 ms from 32 ms, so its head is on row 6 at 128 ms.
const drop = { start: 32, speed: 1 / 16, trail: 4 };

// A repeatable source of numbers in [0, 1).
const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

describe("glowOf", () => {
  test("lights the head brightest and fades along the trail", () => {
    expect(headOf(drop, 128)).toBe(6);
    expect(glowOf(drop, 6, 128)).toBe(1);
    expect(glowOf(drop, 4, 128)).toBe(0.5);
    expect(glowOf(drop, 3, 128)).toBe(0.25);
  });

  test("leaves rows ahead of the head and past the trail dark", () => {
    expect(glowOf(drop, 7, 128)).toBe(0);
    expect(glowOf(drop, 2, 128)).toBe(0);
    expect(glowOf(drop, 0, 0)).toBe(0);
  });
});

describe("writtenRows", () => {
  test("counts the rows the trail has passed", () => {
    expect(writtenRows(drop, 0)).toBe(0);
    expect(writtenRows(drop, 80)).toBe(0);
    expect(writtenRows(drop, 96)).toBe(1);
    expect(writtenRows(drop, 128)).toBe(3);
  });

  test("meets the trail, so every row is either written or glowing", () => {
    for (const time of [100, 128, 150, 200]) {
      const written = writtenRows(drop, time);
      expect(glowOf(drop, written, time)).toBeGreaterThan(0);
      if (written > 0) expect(glowOf(drop, written - 1, time)).toBe(0);
    }
  });
});

describe("schedule", () => {
  const rows = 48;
  const columns = schedule(200, rows, seeded(7));

  test("rains in every column before its writer sets off", () => {
    expect(columns).toHaveLength(200);
    for (const { rain, writer } of columns) {
      expect(rain.length).toBeGreaterThan(0);
      for (const { start } of rain) expect(start).toBeLessThan(writer.start);
    }
  });

  test("writes nothing until the rain has trickled in", () => {
    for (const { writer } of columns) expect(writtenRows(writer, 1000)).toBe(0);
  });

  test("writes every column in full by the end", () => {
    const end = rainEnd(columns, rows);
    expect(end).toBeLessThanOrEqual(RAIN_MS);
    for (const { writer } of columns) {
      expect(writtenRows(writer, end)).toBeGreaterThanOrEqual(rows);
    }
  });
});
