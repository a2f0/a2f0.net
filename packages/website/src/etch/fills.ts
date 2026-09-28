// Builds the layer the fat laser fills: the artwork with its real paint,
// each unit wrapped in a group clipped to the part swept so far.

import { importArtwork } from "./layer";

const SVG_NS = "http://www.w3.org/2000/svg";
// Room for the widest stroke beyond a unit's geometry.
const PAD = 12;

export interface FillUnit {
  unit: number;
  group: SVGGElement;
  /** The clip rectangle, which grows down the unit as it fills. */
  reveal: SVGRectElement;
  /** The unit's padded bounds in the group's own coordinates. */
  box: DOMRect;
}

export const fillLayer = (svg: Document): SVGSVGElement => {
  const layer = importArtwork(svg, "etch-fill-");
  let defs = layer.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    layer.prepend(defs);
  }
  const groups = new Map<string, SVGGElement>();
  for (const element of [...layer.querySelectorAll("[data-unit]")]) {
    const unit = element.getAttribute("data-unit") ?? "";
    let group = groups.get(unit);
    if (!group) {
      const clip = document.createElementNS(SVG_NS, "clipPath");
      clip.id = `etch-reveal-${unit}`;
      clip.append(document.createElementNS(SVG_NS, "rect"));
      defs.append(clip);
      group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("clip-path", `url(#${clip.id})`);
      group.dataset.fill = unit;
      element.before(group);
      groups.set(unit, group);
    }
    group.append(element);
  }
  return layer;
};

/** The units to fill, in painting order, once the layer is in the page. */
export const fillUnits = (layer: SVGSVGElement): FillUnit[] =>
  [...layer.querySelectorAll<SVGGElement>("g[data-fill]")].map((group) => {
    const unit = group.dataset.fill ?? "";
    const reveal = layer.querySelector<SVGRectElement>(
      `#etch-reveal-${unit} rect`,
    );
    if (!reveal) throw new Error(`Unit ${unit} has no reveal`);
    const { x, y, width, height } = group.getBBox();
    const box = new DOMRect(
      x - PAD,
      y - PAD,
      width + PAD * 2,
      height + PAD * 2,
    );
    reveal.setAttribute("x", `${box.x}`);
    reveal.setAttribute("y", `${box.y}`);
    reveal.setAttribute("width", `${box.width}`);
    reveal.setAttribute("height", "0");
    return { unit: Number(unit), group, reveal, box };
  });
