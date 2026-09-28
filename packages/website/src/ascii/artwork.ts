// Loads a2f0.svg and rasterizes it as luminance, whole and with the letter
// faces and their extrusion isolated, so each layer can be shaded on its own.

import { type Glyphs, glyphShapes } from "./glyphs";

const SVG_URL = "/a2f0.svg";
const FACES = 'use[href="#word"]:not([transform])';
const LETTERS = 'use[href="#word"]';

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

// Copies the artwork, keeping only the matching elements painted solid white.
const isolate = (svg: Document, selector: string): Document => {
  const copy = svg.cloneNode(true) as Document;
  const root = copy.documentElement;
  const keep = new Set<Element>();
  for (const node of root.querySelectorAll(selector)) {
    node.setAttribute("fill", "#fff");
    node.setAttribute("stroke", "none");
    for (let n: Element | null = node; n && n !== root; n = n.parentElement) {
      keep.add(n);
    }
  }
  const prune = (parent: Element) => {
    for (const child of [...parent.children]) {
      if (child.localName === "defs") continue;
      if (!keep.has(child)) child.remove();
      else if (!child.matches(selector)) prune(child);
    }
  };
  prune(root);
  return copy;
};

const luminance = async (
  svg: Document,
  width: number,
  height: number,
): Promise<Float32Array> => {
  // Firefox only rasterizes SVG images that declare an intrinsic size.
  svg.documentElement.setAttribute("width", String(width));
  svg.documentElement.setAttribute("height", String(height));
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml",
  });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const values = new Float32Array(width * height);
    for (let i = 0; i < values.length; i++) {
      values[i] =
        (0.2126 * data[i * 4] +
          0.7152 * data[i * 4 + 1] +
          0.0722 * data[i * 4 + 2]) /
        255;
    }
    return values;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const loadArtwork = async (fontFamily: string): Promise<Artwork> => {
  const response = await fetch(SVG_URL);
  if (!response.ok) throw new Error(`Failed to load ${SVG_URL}`);
  const svg = new DOMParser().parseFromString(
    await response.text(),
    "image/svg+xml",
  );
  const viewBox = svg.documentElement.getAttribute("viewBox");
  if (!viewBox) throw new Error(`${SVG_URL} has no viewBox`);
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
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
