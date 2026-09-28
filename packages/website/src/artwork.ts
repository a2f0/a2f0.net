// Fetches a2f0.svg for the renderers that need its structure: the ASCII view
// and the etching animation.

const SVG_URL = "/a2f0.svg";

/** The letter faces: the one copy of the lettering drawn without an offset. */
export const FACES = 'use[href="#word"]:not([transform])';
/** Every copy of the lettering, the faces and each step of the extrusion. */
export const LETTERS = 'use[href="#word"]';

export const fetchArtwork = async (): Promise<Document> => {
  const response = await fetch(SVG_URL);
  if (!response.ok) throw new Error(`Failed to load ${SVG_URL}`);
  return new DOMParser().parseFromString(
    await response.text(),
    "image/svg+xml",
  );
};

export const viewBoxOf = (svg: Document): string => {
  const viewBox = svg.documentElement.getAttribute("viewBox");
  if (!viewBox) throw new Error(`${SVG_URL} has no viewBox`);
  return viewBox;
};
