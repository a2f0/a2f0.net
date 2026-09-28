// How far along the etching is at a given moment. First a point laser
// traces each stroke at a steady feed rate (the vector pass), then a fat
// laser sweeps across each unit in turn, filling in its paint (the fill
// pass).

export const VECTOR_MS = 6000;
export const FILL_MS = 4000;

export interface EtchFrame {
  /** Length of each stroke traced so far. */
  traced: number[];
  /** The stroke under the laser during the vector pass, otherwise -1. */
  active: number;
  /** How much of each unit is filled, from 0 to 1. */
  filled: number[];
  /** The unit under the fat laser during the fill pass, otherwise -1. */
  filling: number;
  done: boolean;
}

/**
 * Shares progress through a pass among its items in turn: each gets its
 * whole amount before the next begins.
 */
export const share = (
  amounts: readonly number[],
  fraction: number,
): { done: number[]; active: number } => {
  if (fraction >= 1) return { done: [...amounts], active: -1 };
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  let remaining = Math.max(fraction, 0) * total;
  let active = -1;
  const done = amounts.map((amount, i) => {
    const part = Math.min(Math.max(remaining, 0), amount);
    if (active < 0 && part < amount) active = i;
    remaining -= amount;
    return part;
  });
  return { done, active };
};

/**
 * @param lengths The length of each stroke, in tracing order.
 * @param sweeps How far the fat laser sweeps across each unit, in order.
 */
export const etchFrame = (
  lengths: readonly number[],
  sweeps: readonly number[],
  elapsed: number,
): EtchFrame => {
  const vector = share(lengths, elapsed / VECTOR_MS);
  const fill = share(sweeps, (elapsed - VECTOR_MS) / FILL_MS);
  return {
    traced: vector.done,
    active: vector.active,
    filled: fill.done.map((part, i) => (sweeps[i] > 0 ? part / sweeps[i] : 1)),
    filling: elapsed < VECTOR_MS ? -1 : fill.active,
    done: elapsed >= VECTOR_MS + FILL_MS,
  };
};
