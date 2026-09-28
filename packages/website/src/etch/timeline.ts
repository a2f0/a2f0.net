// How far along the etching is at a given moment. Like a laser engraver, it
// first traces each outline at a steady feed rate (the vector pass), then
// sweeps back and forth down the canvas to fill in the art (the raster pass).

export const VECTOR_MS = 3000;
export const RASTER_MS = 1500;
const PASSES = 12;

export interface EtchFrame {
  /** Length of each outline traced so far. */
  traced: number[];
  /** The outline under the laser during the vector pass, otherwise -1. */
  active: number;
  /** How much of the raster pass is done, from 0 at the top to 1. */
  scan: number;
  done: boolean;
}

export const etchFrame = (
  lengths: readonly number[],
  elapsed: number,
): EtchFrame => {
  const scan = Math.min(Math.max((elapsed - VECTOR_MS) / RASTER_MS, 0), 1);
  const done = elapsed >= VECTOR_MS + RASTER_MS;
  if (elapsed >= VECTOR_MS) {
    return { traced: [...lengths], active: -1, scan, done };
  }
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = Math.max(elapsed / VECTOR_MS, 0) * total;
  let active = -1;
  const traced = lengths.map((length, i) => {
    const drawn = Math.min(Math.max(remaining, 0), length);
    if (active < 0 && drawn < length) active = i;
    remaining -= length;
    return drawn;
  });
  return { traced, active, scan, done };
};

/** Where the laser sits across the art during the raster pass, from 0 to 1. */
export const sweep = (scan: number, passes = PASSES) => {
  const pass = scan * passes;
  const across = pass - Math.floor(pass);
  return Math.floor(pass) % 2 === 0 ? across : 1 - across;
};
