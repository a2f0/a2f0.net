import type { ThemeDefinition } from "@tearleads/windowing";

export type DriveThemeId = "graphite" | "paper";

/**
 * The website's themes (packages/website/components/themes.ts), in the order
 * the switch cycles them. drive.css styles Graphite by default and Paper under
 * `:root[data-theme-scheme="light"]`, which any host's theme provider stamps,
 * so Drive follows the website's switch as well as its own.
 */
export const DRIVE_THEMES: readonly ThemeDefinition<DriveThemeId>[] = [
  { id: "graphite", label: "Graphite", scheme: "dark" },
  { id: "paper", label: "Paper", scheme: "light" },
];

/** The theme until the visitor picks one, whatever the OS prefers. */
export const DEFAULT_DRIVE_THEME: DriveThemeId = "graphite";

/**
 * Each theme's page (`--drive-paper` in drive.css), for the browser's own
 * chrome: `<meta name="theme-color">` follows the theme showing.
 */
export const DRIVE_THEME_COLORS: Readonly<Record<DriveThemeId, string>> = {
  graphite: "#161616",
  paper: "#fafafa",
};

/** The browser chrome's color for a theme, or the default theme's. */
export const driveThemeColor = (id: string) =>
  Object.hasOwn(DRIVE_THEME_COLORS, id)
    ? DRIVE_THEME_COLORS[id as DriveThemeId]
    : DRIVE_THEME_COLORS[DEFAULT_DRIVE_THEME];

/** Where the switch keeps the visitor's choice. */
export const THEME_STORAGE_KEY = "drive.theme";
