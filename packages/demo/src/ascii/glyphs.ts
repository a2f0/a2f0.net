// Describes each monospace glyph by where its ink sits, so a character cell
// of the artwork can be matched to the glyph with the most similar shape.

export const CHARSET = " .,:;'`\"^_-~=+*<>/\\|()[]{}!?1ilIjtfrLJ7Y0O8#%&$@";

const GLYPH_SIZE = 48;
const CIRCLE_RADIUS = 0.24;

export type Point = readonly [x: number, y: number];

// Six staggered sampling circles, in cell-relative coordinates, describe
// where a cell's ink sits.
export const CIRCLES: readonly Point[] = [
  [0.3, 0.2],
  [0.7, 0.16],
  [0.28, 0.5],
  [0.72, 0.46],
  [0.3, 0.82],
  [0.7, 0.78],
];

// Matching circles just outside the cell sharpen edges against neighbours.
export const EXTERNAL: readonly Point[] = [
  [0.1, -0.15],
  [0.9, -0.2],
  [-0.2, 0.5],
  [1.2, 0.46],
  [0.1, 1.15],
  [0.9, 1.1],
];

export interface Glyphs {
  /** Advance width of a glyph cell over its height. */
  ratio: number;
  /** Ink in each sampling circle, one vector per character in CHARSET. */
  vectors: number[][];
}

/** Pixel offsets covered by each circle within a cell of the given size. */
export const circleOffsets = (
  centers: readonly Point[],
  width: number,
  height: number,
): Point[][] =>
  centers.map(([cx, cy]) => {
    const offsets: Point[] = [];
    const radius = CIRCLE_RADIUS * width;
    for (let y = Math.floor(-height / 2); y < height * 1.5; y++) {
      for (let x = Math.floor(-width / 2); x < width * 1.5; x++) {
        const dx = x + 0.5 - cx * width;
        const dy = y + 0.5 - cy * height;
        if (dx * dx + dy * dy <= radius * radius) offsets.push([x, y]);
      }
    }
    return offsets;
  });

export const glyphShapes = (fontFamily: string): Glyphs => {
  const font = `${GLYPH_SIZE}px ${fontFamily}`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is unavailable");
  ctx.font = font;
  const metrics = ctx.measureText("M");
  const ratio = metrics.width / GLYPH_SIZE;
  const width = Math.round(GLYPH_SIZE * ratio);
  const height = GLYPH_SIZE;
  const baseline =
    (height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) /
      2 +
    metrics.fontBoundingBoxAscent;
  canvas.width = width;
  canvas.height = height;
  const offsets = circleOffsets(CIRCLES, width, height);

  const vectors = [...CHARSET].map((char) => {
    ctx.clearRect(0, 0, width, height);
    ctx.font = font;
    ctx.fillStyle = "#fff";
    ctx.fillText(char, 0, baseline);
    const { data } = ctx.getImageData(0, 0, width, height);
    return offsets.map((circle) => {
      let sum = 0;
      for (const [x, y] of circle) {
        if (x >= 0 && y >= 0 && x < width && y < height) {
          sum += data[(y * width + x) * 4 + 3];
        }
      }
      return sum / (circle.length * 255);
    });
  });

  const peak = Math.max(...vectors.flat());
  return {
    ratio,
    vectors: vectors.map((vector) => vector.map((value) => value / peak)),
  };
};

/** The character whose shape is closest to the sampled vector. */
export const nearest = (
  vector: readonly number[],
  glyphs: readonly (readonly number[])[],
): string => {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let g = 0; g < glyphs.length; g++) {
    let distance = 0;
    for (let i = 0; i < vector.length; i++) {
      const delta = vector[i] - glyphs[g][i];
      distance += delta * delta;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      best = g;
    }
  }
  return CHARSET[best];
};
