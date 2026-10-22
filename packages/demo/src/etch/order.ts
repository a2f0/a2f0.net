// Orders the etching so the lettering comes first: strokes and units lying
// mostly within the letters' silhouette, their faces and whole extrusion, go
// before the brushwork and ornaments around them.

import { isolate, LETTERS, luminance, viewBoxOf } from "../artwork";
import type { Point } from "./strokes";

// The silhouette is rasterized at half the artwork's size.
const SCALE = 0.5;

/** Tests whether a point, in the artwork's coordinates, is on the letters. */
export const letterSilhouette = async (
  svg: Document,
): Promise<(point: Point) => boolean> => {
  const [left, top, width, height] = viewBoxOf(svg)
    .split(/[\s,]+/)
    .map(Number);
  const columns = Math.round(width * SCALE);
  const rows = Math.round(height * SCALE);
  const mask = await luminance(isolate(svg, LETTERS), columns, rows);
  return ({ x, y }) => {
    const column = Math.floor(((x - left) / width) * columns);
    const row = Math.floor(((y - top) / height) * rows);
    return (
      column >= 0 &&
      row >= 0 &&
      column < columns &&
      row < rows &&
      mask[row * columns + column] > 0.5
    );
  };
};

/** Points spread along a shape's outline, in its layer's coordinates. */
export const outlinePoints = (
  layer: SVGSVGElement,
  shape: SVGGeometryElement,
  count: number,
): Point[] => {
  const toLayer = layer
    .getScreenCTM()
    ?.inverse()
    .multiply(shape.getScreenCTM() ?? new DOMMatrix());
  const length = shape.getTotalLength();
  return Array.from({ length: count }, (_, i) =>
    shape
      .getPointAtLength(((i + 0.5) / count) * length)
      .matrixTransform(toLayer),
  );
};

export const mostlyWithin = (
  points: readonly Point[],
  contains: (point: Point) => boolean,
) => points.filter(contains).length * 2 > points.length;

/** The letters first, then everything else, each keeping its order. */
export const lettersFirst = <T extends { letter: boolean }>(
  items: readonly T[],
): T[] => [
  ...items.filter(({ letter }) => letter),
  ...items.filter(({ letter }) => !letter),
];
