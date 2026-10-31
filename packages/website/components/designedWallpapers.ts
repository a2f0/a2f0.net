import type { WallpaperDefinition } from "@tearleads/windowing";

const svg = (width: number, height: number, artwork: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${artwork}</svg>`;

// A composed 4×4 Truchet repeat, rather than one endlessly repeated ring.
// Every arc meets its neighbor at the midpoint, perpendicular to the edge.
// The fine contour follows the ribbon's center so either turn joins cleanly.
const fluxTurns = [
  [0, 0, 1, 0],
  [1, 0, 1, 1],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
];
const fluxCurves = [
  "M0 32A32 32 0 0 0 32 0M32 64A32 32 0 0 1 64 32",
  "M32 0A32 32 0 0 0 64 32M0 32A32 32 0 0 1 32 64",
];
const fluxRibbons = fluxTurns
  .flatMap((row, y) =>
    row.map((turn, x) => {
      const curve = fluxCurves[turn];
      return (
        `<g transform="translate(${x * 64} ${y * 64})">` +
        `<path d="${curve}" stroke-width="18" stroke-opacity=".72"/>` +
        `<path d="${curve}" stroke-width="1.25"/>` +
        "</g>"
      );
    }),
  )
  .join("");

// Folded, unequal panels in a staggered chevron mosaic. Neighboring rows
// reverse the relief; the short facets break up the long diagonal planes.
// Rows above and columns beside the viewBox supply the clipped edge pieces.
const fold =
  '<path d="M0 0L60 35V87L0 52Z" fill-opacity=".36"/>' +
  '<path d="M60 35L120 69V121L60 87Z" fill-opacity=".72"/>' +
  '<path d="M120 69L240 0L180 87L120 121Z" fill-opacity=".27"/>' +
  '<path d="M240 0V52L180 87Z" fill-opacity=".5"/>' +
  '<path d="M0 1L120 70L240 1M120 70V120" fill="none" stroke="#000" stroke-width="1" stroke-opacity=".75"/>';
const foldedMosaic = [-208, 0, 208]
  .flatMap((y) =>
    [-240, 0, 240].map(
      (x) =>
        `<g transform="translate(${x} ${y})">${fold}</g>` +
        `<g transform="translate(${x + 120} ${y + 104}) scale(-1 1)">${fold}</g>`,
    ),
  )
  .join("");

/** Host-owned art; the shared package only renders these alpha-mask tiles. */
export const DESIGNED_WEBSITE_WALLPAPERS = [
  {
    id: "flux",
    label: "Flux",
    base: "color-mix(in srgb, var(--color-light) 94%, #184767)",
    ink: "color-mix(in srgb, var(--color-light) 45%, #269fc4)",
    tile: {
      width: 256,
      height: 256,
      svg: svg(
        256,
        256,
        `<g fill="none" stroke="#000" opacity=".62">${fluxRibbons}</g>`,
      ),
    },
  },
  {
    id: "aperture",
    label: "Aperture",
    base: "color-mix(in srgb, var(--color-light) 96%, #59448a)",
    ink: "color-mix(in srgb, var(--color-light) 55%, #6452be)",
    tile: {
      width: 240,
      height: 240,
      svg: svg(
        240,
        240,
        '<g fill="#000" opacity=".62">' +
          '<path d="M32 104a48 48 0 1 1 96 0v48H96v-48a16 16 0 1 0-32 0v48H32Z" fill-opacity=".7"/>' +
          '<path d="M48 152v-48a32 32 0 1 1 64 0v48" fill="none" stroke="#000" stroke-width="1.25"/>' +
          '<circle cx="178" cy="66" r="22" fill-opacity=".45"/>' +
          '<path d="M204 180a38 38 0 1 1-76 0 38 38 0 1 1 76 0ZM178 172a20 20 0 1 0-40 0 20 20 0 1 0 40 0Z" fill-rule="evenodd" fill-opacity=".85"/>' +
          "</g>",
      ),
    },
  },
  {
    id: "isochrome",
    label: "Isochrome",
    base: "color-mix(in srgb, var(--color-light) 95%, #80614d)",
    ink: "color-mix(in srgb, var(--color-light) 60%, #b7784c)",
    tile: {
      width: 240,
      height: 208,
      // Cut through the faces, not along a contrasting fold crease, so the
      // tile boundary itself has no artificial vertical edge.
      svg: svg(
        240,
        208,
        `<g opacity=".68" transform="translate(30 0)">${foldedMosaic}</g>`,
      ),
    },
  },
] as const satisfies readonly WallpaperDefinition[];
