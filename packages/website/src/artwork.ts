// Fetches a2f0.svg for the renderers that need its structure: the ASCII view
// and the etching animation.

/** Where the site serves a2f0.svg, the graffiti each view draws from. */
const ARTWORK_URL = "/a2f0.svg";

/** The letter faces: the one copy of the lettering drawn without an offset. */
export const FACES = 'use[href="#word"]:not([transform])';
/** Every copy of the lettering, the faces and each step of the extrusion. */
export const LETTERS = 'use[href="#word"]';

export const fetchArtwork = async (): Promise<Document> => {
  const response = await fetch(ARTWORK_URL);
  if (!response.ok) throw new Error(`Failed to load ${ARTWORK_URL}`);
  return new DOMParser().parseFromString(
    await response.text(),
    "image/svg+xml",
  );
};

export const viewBoxOf = (svg: Document): string => {
  const viewBox = svg.documentElement.getAttribute("viewBox");
  if (!viewBox) throw new Error(`${ARTWORK_URL} has no viewBox`);
  return viewBox;
};

/** Copies the artwork, keeping only the matching elements painted solid white. */
export const isolate = (svg: Document, selector: string): Document => {
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

// Draws the artwork into a canvas of the given size, over the background
// if there is one, and returns its pixels.
const pixels = async (
  svg: Document,
  width: number,
  height: number,
  background?: string,
): Promise<Uint8ClampedArray> => {
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
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Rasterizes the artwork, giving each pixel's luminance from 0 to 1. */
export const luminance = async (
  svg: Document,
  width: number,
  height: number,
): Promise<Float32Array> => {
  const data = await pixels(svg, width, height, "#000");
  const values = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) {
    values[i] =
      (0.2126 * data[i * 4] +
        0.7152 * data[i * 4 + 1] +
        0.0722 * data[i * 4 + 2]) /
      255;
  }
  return values;
};

/**
 * Rasterizes the artwork with its own paint, giving how much each pixel is
 * covered, from 0 to 1, whether the paint there is light or dark.
 */
export const coverage = async (
  svg: Document,
  width: number,
  height: number,
): Promise<Float32Array> => {
  const data = await pixels(svg, width, height);
  const values = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) values[i] = data[i * 4 + 3] / 255;
  return values;
};
