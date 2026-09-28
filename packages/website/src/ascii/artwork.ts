// Loads a2f0.svg and rasterizes it as luminance, whole and with the letter
// faces and their extrusion isolated, so each layer can be shaded on its own.

import {
  FACES,
  fetchArtwork,
  isolate,
  LETTERS,
  luminance,
  viewBoxOf,
} from "../artwork";
import { type Glyphs, glyphShapes } from "./glyphs";

export interface Artwork {
  svg: Document;
  /** Height of the artwork over its width. */
  aspect: number;
  glyphs: Glyphs;
}

/** Luminance of each pixel, from 0 for black to 1 for white. */
export interface Layers {
  art: Float32Array;
  faces: Float32Array;
  letters: Float32Array;
}

export const loadArtwork = async (fontFamily: string): Promise<Artwork> => {
  const svg = await fetchArtwork();
  const [, , width, height] = viewBoxOf(svg)
    .split(/[\s,]+/)
    .map(Number);
  return { svg, aspect: height / width, glyphs: glyphShapes(fontFamily) };
};

export const rasterize = async (
  { svg }: Artwork,
  width: number,
  height: number,
): Promise<Layers> => {
  const [art, faces, letters] = await Promise.all([
    luminance(svg.cloneNode(true) as Document, width, height),
    luminance(isolate(svg, FACES), width, height),
    luminance(isolate(svg, LETTERS), width, height),
  ]);
  return { art, faces, letters };
};
