// Rebuilds the artwork as a layer of strokes for the laser to trace: every
// stroked shape in painting order, keeping the transforms and clips that
// place it.

import { importArtwork } from "./layer";

const SVG_NS = "http://www.w3.org/2000/svg";
export const GEOMETRY = "path, line, polyline, polygon, rect, circle, ellipse";
const NUMBER = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
// Attributes of a <use> that place its copy rather than style it.
const PLACEMENT = new Set(["href", "x", "y", "width", "height", "transform"]);

export interface Point {
  x: number;
  y: number;
}

/**
 * Keeps the two ends of each run of three or more matching siblings. A
 * stack of offset copies builds the extrusion, and its middle copies hide
 * behind their neighbours.
 */
export const runEnds = (keys: readonly (string | null)[]): boolean[] =>
  keys.map((key, i) => {
    if (key === null || keys[i - 1] !== key || keys[i + 1] !== key) {
      return true;
    }
    let start = i;
    while (keys[start - 1] === key) start--;
    let end = i;
    while (keys[end + 1] === key) end++;
    return end - start < 2;
  });

/**
 * Splits path data into subpaths that each start with an absolute move, so
 * each can be traced on its own: Chrome restarts a dash pattern at every
 * subpath. `endOf` gives the current point after some of the data, which a
 * relative move is measured from.
 */
export const subpaths = (
  d: string,
  endOf: (prefix: string) => Point,
): string[] => {
  const parts = d
    .split(/(?=[Mm])/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.map((part, i) => {
    if (i === 0 || part[0] === "M") return part;
    const [, args = "", rest = ""] = /^m([^A-Za-z]*)(.*)$/s.exec(part) ?? [];
    const [dx = 0, dy = 0, ...lines] = (args.match(NUMBER) ?? []).map(Number);
    const start = endOf(parts.slice(0, i).join(" "));
    // Further pairs after a relative move are relative line segments.
    return [
      `M${start.x + dx} ${start.y + dy}`,
      lines.length > 0 ? `l${lines.join(" ")}` : "",
      rest.trim(),
    ]
      .filter(Boolean)
      .join(" ");
  });
};

// Replaces each <use> outside <defs> with a group holding a copy of what it
// references, so every stroke is a real shape the laser can follow.
const expandUses = (layer: SVGSVGElement) => {
  for (;;) {
    const use = [...layer.querySelectorAll("use")].find(
      (candidate) => !candidate.closest("defs"),
    );
    if (!use) return;
    const id = (use.getAttribute("href") ?? "").replace(/^#/, "");
    const target = id ? layer.querySelector(`#${CSS.escape(id)}`) : null;
    const group = document.createElementNS(SVG_NS, "g");
    for (const { name, value } of use.attributes) {
      if (!PLACEMENT.has(name)) group.setAttribute(name, value);
    }
    const [x, y] = ["x", "y"].map((axis) => use.getAttribute(axis) ?? "0");
    const transform = [
      use.getAttribute("transform"),
      x !== "0" || y !== "0" ? `translate(${x} ${y})` : null,
    ]
      .filter(Boolean)
      .join(" ");
    if (transform) group.setAttribute("transform", transform);
    group.dataset.copy = `#${id}`;
    if (target) {
      const copy = target.cloneNode(true) as Element;
      for (const element of [copy, ...copy.querySelectorAll("[id]")]) {
        element.removeAttribute("id");
      }
      group.append(copy);
    }
    use.replaceWith(group);
  }
};

const dropHiddenCopies = (layer: SVGSVGElement) => {
  for (const parent of [layer, ...layer.querySelectorAll("g")]) {
    const children = [...parent.children];
    const keys = children.map((child) => {
      const copy = child instanceof SVGElement ? child.dataset.copy : undefined;
      const transform = child.getAttribute("transform") ?? "";
      return copy && /^(translate\([^)]*\))?$/.test(transform.trim())
        ? copy
        : null;
    });
    runEnds(keys).forEach((keep, i) => {
      if (!keep) children[i].remove();
    });
  }
};

/** A detached copy of the artwork's strokes, ready to be placed. */
export const strokeLayer = (svg: Document): SVGSVGElement => {
  const layer = importArtwork(svg, "etch-lines-");
  expandUses(layer);
  dropHiddenCopies(layer);
  return layer;
};

/**
 * The strokes to trace, in painting order, once the layer is in the page
 * where styles resolve. Shapes without a stroke are removed.
 */
export const traceable = (layer: SVGSVGElement): SVGGeometryElement[] => {
  const probe = document.createElementNS(SVG_NS, "path");
  layer.append(probe);
  const endOf = (prefix: string): Point => {
    probe.setAttribute("d", prefix);
    return probe.getPointAtLength(probe.getTotalLength());
  };
  for (const path of [...layer.querySelectorAll("path")]) {
    if (path === probe || path.closest("defs")) continue;
    const parts = subpaths(path.getAttribute("d") ?? "", endOf);
    if (parts.length < 2) continue;
    path.replaceWith(
      ...parts.map((d) => {
        const part = path.cloneNode() as SVGPathElement;
        part.setAttribute("d", d);
        return part;
      }),
    );
  }
  probe.remove();

  const strokes: SVGGeometryElement[] = [];
  for (const shape of layer.querySelectorAll<SVGGeometryElement>(GEOMETRY)) {
    if (shape.closest("defs")) continue;
    const { stroke, strokeWidth } = window.getComputedStyle(shape);
    if (stroke === "none" || Number.parseFloat(strokeWidth) === 0) {
      shape.remove();
    } else {
      strokes.push(shape);
    }
  }
  return strokes;
};
