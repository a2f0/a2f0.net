// Works out where a unit actually has paint, row by row, so the fat laser
// burns only across the shape under it instead of the unit's whole bounds.

import { coverage } from "../artwork";
import type { FillUnit } from "./fills";

const SVG_NS = "http://www.w3.org/2000/svg";
// Presentation attributes a unit's ancestors pass down to its shapes. Their
// transforms stay behind: the profile is drawn in the unit's coordinates.
const PAINT = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "opacity",
];
// Silhouettes are rasterized at half the artwork's size.
const SCALE = 0.5;
// Paint covering less of a pixel than this does not count.
const THRESHOLD = 0.05;
// Rows borrow spans from this many neighbours each side, and spans closer
// than this many pixels join, so sparse shapes do not blink the laser.
const REACH = 6;
const GAP = 10;

/** A painted run along a row, from its start to its end. */
export type Span = readonly [start: number, end: number];

/** The runs of each row of a mask that pass the threshold, in pixels. */
export const spansOf = (
  mask: ArrayLike<number>,
  width: number,
  height: number,
  threshold = THRESHOLD,
): Span[][] =>
  Array.from({ length: height }, (_, row) => {
    const spans: Span[] = [];
    let start = -1;
    for (let x = 0; x <= width; x++) {
      const painted = x < width && mask[row * width + x] > threshold;
      if (painted && start < 0) start = x;
      if (!painted && start >= 0) {
        spans.push([start, x]);
        start = -1;
      }
    }
    return spans;
  });

/** Sorts spans and joins those that overlap or sit within a gap. */
export const mergeSpans = (spans: readonly Span[], gap = 0): Span[] => {
  const merged: [number, number][] = [];
  for (const [start, end] of [...spans].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start - last[1] <= gap) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
};

/** Gives each row the spans of its neighbours within reach. */
export const widenRows = (
  rows: readonly (readonly Span[])[],
  reach: number,
  gap = 0,
): Span[][] =>
  rows.map((_, row) =>
    mergeSpans(
      rows.slice(Math.max(row - reach, 0), row + reach + 1).flat(),
      gap,
    ),
  );

/**
 * The painted spans of each row of a unit, in the unit's own coordinates,
 * with the rows spread evenly down its box.
 */
export const unitProfile = async (
  layer: SVGSVGElement,
  { group, box }: FillUnit,
): Promise<Span[][]> => {
  const width = Math.max(Math.ceil(box.width * SCALE), 1);
  const height = Math.max(Math.ceil(box.height * SCALE), 1);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  const defs = layer.querySelector("defs");
  if (defs) svg.append(defs.cloneNode(true));
  // The unit's own paint, so faint and fading paint counts for only as much
  // as it covers, inside groups that pass down what its ancestors set, such
  // as the artwork's fill="none" that keeps open curves unfilled.
  const ancestors: Element[] = [];
  for (
    let n: Element | null = group.parentElement;
    n && n !== layer;
    n = n.parentElement
  ) {
    ancestors.unshift(n);
  }
  let parent: Element = svg;
  for (const ancestor of [layer, ...ancestors]) {
    const inherited = document.createElementNS(SVG_NS, "g");
    for (const name of PAINT) {
      const value = ancestor.getAttribute(name);
      if (value !== null) inherited.setAttribute(name, value);
    }
    parent.append(inherited);
    parent = inherited;
  }
  parent.append(...[...group.children].map((child) => child.cloneNode(true)));
  const doc = new DOMParser().parseFromString(
    new XMLSerializer().serializeToString(svg),
    "image/svg+xml",
  );
  const mask = await coverage(doc, width, height);
  const toUnit = (x: number) => box.x + (x / width) * box.width;
  return widenRows(spansOf(mask, width, height), REACH, GAP).map((spans) =>
    spans.map(([start, end]) => [toUnit(start), toUnit(end)] as const),
  );
};
