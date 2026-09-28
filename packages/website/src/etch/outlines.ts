// The outlines the laser traces: the glyphs of the lettering's faces, placed
// as the artwork places them.

import { FACES, viewBoxOf } from "../artwork";

export interface Outline {
  d: string;
  transform: string;
}

export interface Outlines {
  viewBox: string;
  outlines: Outline[];
}

/**
 * Splits path data into its subpaths, so each can be traced on its own:
 * browsers disagree on whether a dash pattern restarts at each one. Data
 * with relative moves stays whole, since a relative move depends on the
 * subpath before it.
 */
export const subpaths = (d: string): string[] =>
  /m/.test(d)
    ? [d]
    : d
        .split(/(?=M)/)
        .map((part) => part.trim())
        .filter(Boolean);

export const outlinesOf = (svg: Document): Outlines => {
  const root = svg.documentElement;
  const referenced = (use: Element) => {
    const id = use.getAttribute("href")?.replace(/^#/, "");
    const target = id ? svg.getElementById(id) : null;
    if (!target) throw new Error(`The artwork has no #${id}`);
    return target;
  };
  const face = root.querySelector(FACES);
  if (!face) throw new Error("The artwork has no lettering");

  // The transforms that place the faces, outermost first.
  const placement: string[] = [];
  for (let n: Element | null = face; n && n !== root; n = n.parentElement) {
    const transform = n.getAttribute("transform");
    if (transform) placement.unshift(transform);
  }

  const outlines = [...referenced(face).children].flatMap((glyph) => {
    const shape = glyph.localName === "use" ? referenced(glyph) : glyph;
    const d = shape.getAttribute("d");
    if (!d) return [];
    const transform = [...placement, glyph.getAttribute("transform") ?? ""]
      .join(" ")
      .trim();
    return subpaths(d).map((part) => ({ d: part, transform }));
  });
  return { viewBox: viewBoxOf(svg), outlines };
};
