// Splits the artwork into units, the pieces the fat laser fills one at a
// time: each top-level element, and each element of the lettering group,
// with a run of offset copies (the extrusion) counted as one unit.

import { FACES } from "../artwork";

/** The shape a run of offset copies repeats, or null for other elements. */
export const copyOf = (element: Element): string | null => {
  const transform = (element.getAttribute("transform") ?? "").trim();
  return element.localName === "use" &&
    /^(translate\([^)]*\))?$/.test(transform)
    ? element.getAttribute("href")
    : null;
};

/** Numbers each unit, marking its elements with data-unit. */
export const markUnits = (root: Element): number => {
  const lettering = root.querySelector(FACES)?.parentElement ?? null;
  let count = 0;
  let previous: string | null = null;
  const mark = (element: Element, copy: string | null) => {
    if (copy === null || copy !== previous) count++;
    element.setAttribute("data-unit", String(count - 1));
    previous = copy;
  };
  for (const child of [...root.children]) {
    if (["defs", "title", "desc"].includes(child.localName)) continue;
    previous = null;
    if (child === lettering) {
      for (const part of [...child.children]) mark(part, copyOf(part));
    } else {
      mark(child, null);
    }
  }
  return count;
};

/** The unit an element of a marked layer belongs to. */
export const unitOf = (element: Element): number =>
  Number(element.closest("[data-unit]")?.getAttribute("data-unit") ?? -1);
