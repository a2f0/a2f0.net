import { describe, expect, test } from "bun:test";

import { etchFrame, FILL_MS, share, VECTOR_MS } from "./timeline";

describe("share", () => {
  test("gives each item its whole amount before the next", () => {
    expect(share([100, 300], 0)).toEqual({ done: [0, 0], active: 0 });
    expect(share([100, 300], 0.5)).toEqual({ done: [100, 100], active: 1 });
    expect(share([100, 300], 1)).toEqual({ done: [100, 300], active: -1 });
  });
});

describe("etchFrame", () => {
  const lengths = [100, 300];
  const sweeps = [50, 150];

  test("traces the strokes at a steady rate before any filling", () => {
    expect(etchFrame(lengths, sweeps, VECTOR_MS / 2)).toEqual({
      traced: [100, 100],
      active: 1,
      filled: [0, 0],
      filling: -1,
      done: false,
    });
  });

  test("then fills each unit in turn", () => {
    expect(etchFrame(lengths, sweeps, VECTOR_MS)).toMatchObject({
      traced: lengths,
      active: -1,
      filled: [0, 0],
      filling: 0,
    });
    expect(etchFrame(lengths, sweeps, VECTOR_MS + FILL_MS / 2)).toMatchObject({
      filled: [1, 1 / 3],
      filling: 1,
      done: false,
    });
  });

  test("finishes once every unit is filled", () => {
    expect(etchFrame(lengths, sweeps, VECTOR_MS + FILL_MS)).toMatchObject({
      filled: [1, 1],
      filling: -1,
      done: true,
    });
  });
});
