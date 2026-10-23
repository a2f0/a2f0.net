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

/** Where the switch keeps the visitor's choice. */
export const THEME_STORAGE_KEY = "drive.theme";
