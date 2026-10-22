// Imports a copy of the artwork into the page as an etching layer.

import { markUnits } from "./units";

const REFERENCE = /url\(#([^)]+)\)/g;

/**
 * Gives every id in the layer a prefix and updates what refers to it, so
 * two layers copied from one artwork can share the page.
 */
const prefixIds = (layer: Element, prefix: string) => {
  const ids = new Map<string, string>();
  for (const element of layer.querySelectorAll("[id]")) {
    ids.set(element.id, `${prefix}${element.id}`);
    element.id = `${prefix}${element.id}`;
  }
  for (const element of [layer, ...layer.querySelectorAll("*")]) {
    for (const { name, localName, value } of [...element.attributes]) {
      if (localName === "href" && value.startsWith("#")) {
        const target = ids.get(value.slice(1));
        if (target) element.setAttribute(name, `#${target}`);
      } else if (value.includes("url(#")) {
        element.setAttribute(
          name,
          value.replace(REFERENCE, (reference, id: string) =>
            ids.has(id) ? `url(#${ids.get(id)})` : reference,
          ),
        );
      }
    }
  }
};

/** A detached copy of the artwork, split into units and hidden from AT. */
export const importArtwork = (svg: Document, prefix: string): SVGSVGElement => {
  const layer = document.importNode(svg.documentElement, true) as Element;
  if (!(layer instanceof SVGSVGElement)) throw new Error("Not an SVG");
  for (const element of layer.querySelectorAll(
    ":scope > title, :scope > desc",
  )) {
    element.remove();
  }
  for (const name of ["role", "aria-labelledby", "width", "height"]) {
    layer.removeAttribute(name);
  }
  layer.setAttribute("aria-hidden", "true");
  markUnits(layer);
  prefixIds(layer, prefix);
  return layer;
};
