import {
  CHEVRON_WALLPAPER,
  HARLEQUIN_WALLPAPER,
  HONEYCOMB_WALLPAPER,
  PLAIN_WALLPAPER,
  type WallpaperDefinition,
} from "@tearleads/windowing";

export type WebsiteWallpaperId =
  | "bricks"
  | "honeycomb"
  | "harlequin"
  | "chevron"
  | "plain";

/**
 * Bricks laid in running bond, drawn as their mortar lines. The windowing
 * package paints a tile's shapes in the theme's wallpaper ink over its desk
 * color, so the lines' own color does not matter. Lines on the tile's edges
 * are drawn on both sides, since each neighboring tile clips half of them.
 */
const BRICKS_WALLPAPER: WallpaperDefinition<"bricks"> = {
  id: "bricks",
  label: "Bricks",
  tile: {
    height: 24,
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="24" viewBox="0 0 48 24">' +
      '<path d="M0 0H48M0 12H48M0 24H48M0 0V12M48 0V12M24 12V24" fill="none" stroke="#000" stroke-width="1.5"/>' +
      "</svg>",
    width: 48,
  },
};

/** The desktop's wallpapers, in the order Display Properties lists them. */
export const WEBSITE_WALLPAPERS: readonly WallpaperDefinition<WebsiteWallpaperId>[] =
  [
    BRICKS_WALLPAPER,
    HONEYCOMB_WALLPAPER,
    HARLEQUIN_WALLPAPER,
    CHEVRON_WALLPAPER,
    PLAIN_WALLPAPER,
  ];

/** The wallpaper until the visitor picks one. */
export const DEFAULT_WEBSITE_WALLPAPER: WebsiteWallpaperId = "bricks";

/** Where Display Properties keeps the visitor's choice. */
export const WALLPAPER_STORAGE_KEY = "website.wallpaper";
