// Shades the rasterized artwork and matches every character cell against
// the glyph shapes, producing lines of text grouped into runs by layer.

import { type Artwork, rasterize } from "./artwork";
import {
  CIRCLES,
  circleOffsets,
  EXTERNAL,
  nearest,
  type Point,
} from "./glyphs";

const SIDE_CHAR = "\\";
const CELL_WIDTH = 12;
const INK = 0.1;
const FLOOR = 0.05;
const CONTRAST = 1.6;

/** Which part of the lettering a cell belongs to; empty for the backdrop. */
export type Layer = "face" | "side" | "";

export interface Run {
  layer: Layer;
  text: string;
}

export interface AsciiArt {
  /** Advance width of a glyph cell over its height. */
  ratio: number;
  lines: Run[][];
}

const mix = (from: number, to: number, amount: number) =>
  from + (to - from) * amount;

/** Deepens a value relative to a peak, so faint ink falls away first. */
export const sharpen = (value: number, peak: number) =>
  peak > 0 ? (value / peak) ** CONTRAST * peak : 0;

// Faces read as bright chrome, the extrusion as dim metal, and the
// surrounding brushwork as a faint backdrop; true ink stays black.
export const tone = (art: number, face: number, letter: number) => {
  const side = Math.max(letter - face, 0);
  const lit = art < INK ? 0 : 1;
  return (
    face * lit * mix(0.5, 1, art) +
    side * lit * mix(0.04, 0.4, art) +
    (1 - face - side) * 0.4 * art
  );
};

/** Classifies a cell by how much of it the faces and extrusion cover. */
export const layerOf = (face: number, side: number): Layer =>
  face >= side && face > 0.25 ? "face" : side > 0.25 ? "side" : "";

/** Adds a character, extending the last run when it shares the layer. */
export const append = (runs: Run[], layer: Layer, char: string) => {
  const last = runs.at(-1);
  if (last?.layer === layer) last.text += char;
  else runs.push({ layer, text: char });
};

export const renderAscii = async (
  artwork: Artwork,
  columns: number,
): Promise<AsciiArt> => {
  const { aspect, glyphs } = artwork;
  const cellHeight = Math.round(CELL_WIDTH / glyphs.ratio);
  const rows = Math.round(columns * aspect * glyphs.ratio);
  const width = columns * CELL_WIDTH;
  const height = rows * cellHeight;
  const { art, faces, letters } = await rasterize(artwork, width, height);

  const tones = new Float32Array(width * height);
  for (let i = 0; i < tones.length; i++) {
    tones[i] = tone(art[i], faces[i], letters[i]);
  }

  const coverage = (mask: Float32Array, left: number, top: number) => {
    let sum = 0;
    for (let y = top; y < top + cellHeight; y++) {
      for (let x = left; x < left + CELL_WIDTH; x++) sum += mask[y * width + x];
    }
    return sum / (CELL_WIDTH * cellHeight);
  };
  const sample = (circles: Point[][], left: number, top: number) =>
    circles.map((circle) => {
      let sum = 0;
      for (const [dx, dy] of circle) {
        const x = Math.min(Math.max(left + dx, 0), width - 1);
        const y = Math.min(Math.max(top + dy, 0), height - 1);
        sum += tones[y * width + x];
      }
      return sum / circle.length;
    });

  const internal = circleOffsets(CIRCLES, CELL_WIDTH, cellHeight);
  const external = circleOffsets(EXTERNAL, CELL_WIDTH, cellHeight);
  const lines: Run[][] = [];
  for (let row = 0; row < rows; row++) {
    const runs: Run[] = [];
    for (let column = 0; column < columns; column++) {
      const left = column * CELL_WIDTH;
      const top = row * cellHeight;
      const face = coverage(faces, left, top);
      const side = Math.max(coverage(letters, left, top) - face, 0);
      const layer = layerOf(face, side);
      const vector = sample(internal, left, top);
      let char: string;
      if (Math.max(...vector) < FLOOR) {
        char = " ";
      } else if (side > 0.9 && face < 0.02) {
        char = SIDE_CHAR;
      } else if (layer) {
        // Letter edges get crisper glyphs; the backdrop keeps soft shading.
        const outside = sample(external, left, top);
        const edged = vector.map((value, i) =>
          sharpen(value, Math.max(value, outside[i])),
        );
        const peak = Math.max(...edged);
        char = nearest(
          edged.map((value) => sharpen(value, peak)),
          glyphs.vectors,
        );
      } else {
        char = nearest(vector, glyphs.vectors);
      }
      append(runs, layer, char);
    }
    lines.push(runs);
  }
  return { ratio: glyphs.ratio, lines };
};
