// The glyphs the rain is written in, as in the film's digital rain: half-width
// katakana, digits, and a few symbols. Each cell of the art shows its own
// glyph and changes it at its own pace, so the code churns as it falls.

export const CODE = [
  ..."ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ",
  ..."012345789",
  ...'Z:."=*+-<>¦|',
];

// How long a cell holds a glyph before changing it, in ms.
const HOLD_MIN = 150;
const HOLD_MAX = 900;

/** Mixes three integers into an unsigned 32-bit hash. */
const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a, 0x27d4eb2d) ^ Math.imul(b, 0x165667b1) ^ c;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};

/** The glyph a cell shows at a moment, in ms. */
export const codeAt = (column: number, row: number, time: number) => {
  const hold = HOLD_MIN + (hash(column, row, 0) % (HOLD_MAX - HOLD_MIN));
  return CODE[hash(column, row, Math.floor(time / hold) + 1) % CODE.length];
};
