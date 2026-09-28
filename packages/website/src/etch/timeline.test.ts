import { describe, expect, test } from "bun:test";

import { etchFrame, RASTER_MS, sweep, VECTOR_MS } from "./timeline";

describe("etchFrame", () => {
  const lengths = [100, 300];

  test("starts with nothing traced", () => {
    expect(etchFrame(lengths, 0)).toEqual({
      traced: [0, 0],
      active: 0,
      scan: 0,
      done: false,
    });
  });

  test("traces the outlines in order at a steady rate", () => {
    const frame = etchFrame(lengths, VECTOR_MS / 2);
    expect(frame.traced).toEqual([100, 100]);
    expect(frame.active).toBe(1);
    expect(frame.scan).toBe(0);
  });

  test("hands over to the raster pass once every outline is traced", () => {
    expect(etchFrame(lengths, VECTOR_MS)).toMatchObject({
      traced: lengths,
      active: -1,
      scan: 0,
    });
    expect(etchFrame(lengths, VECTOR_MS + RASTER_MS / 2).scan).toBe(0.5);
  });

  test("finishes once the raster pass reaches the bottom", () => {
    expect(etchFrame(lengths, VECTOR_MS + RASTER_MS - 1).done).toBe(false);
    expect(etchFrame(lengths, VECTOR_MS + RASTER_MS)).toMatchObject({
      scan: 1,
      done: true,
    });
  });
});

describe("sweep", () => {
  test("zigzags across the art once per pass", () => {
    expect(sweep(0, 4)).toBe(0);
    expect(sweep(0.125, 4)).toBe(0.5);
    expect(sweep(0.25, 4)).toBe(1);
    expect(sweep(0.375, 4)).toBe(0.5);
    expect(sweep(0.5, 4)).toBe(0);
  });
});
