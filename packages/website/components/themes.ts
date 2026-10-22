import type { ThemeDefinition } from "@tearleads/windowing";

export type WebsiteThemeId = "graphite" | "paper";

/**
 * The desktop's themes, in the order the taskbar's switch cycles them. Each is
 * a block of the windowing package's design tokens in styles/themes.css:
 * Graphite in its base `:root`, Paper under `:root[data-theme]`.
 */
export const WEBSITE_THEMES: readonly ThemeDefinition<WebsiteThemeId>[] = [
  { id: "graphite", label: "Graphite", scheme: "dark" },
  { id: "paper", label: "Paper", scheme: "light" },
];

/** The theme until the visitor picks one, whatever the OS prefers. */
export const DEFAULT_WEBSITE_THEME: WebsiteThemeId = "graphite";

/** Where the switch keeps the visitor's choice. */
export const THEME_STORAGE_KEY = "website.theme";
