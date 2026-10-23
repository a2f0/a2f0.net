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

/**
 * Paper's ink: a mid grey rather than black, since dark text on white reads
 * harsher than Graphite's light grey on black. It keeps about 7:1 on Paper's
 * sheets. styles/themes.css gives the desktop's chrome the same colors.
 */
export const PAPER_INK = "#555555";

/** Paper's emphasized text, one step darker than its ink. */
export const PAPER_INK_STRONG = "#444444";

/** The theme until the visitor picks one, whatever the OS prefers. */
export const DEFAULT_WEBSITE_THEME: WebsiteThemeId = "graphite";

/**
 * Each theme's desk (`--desktop-background` in styles/themes.css), for the
 * browser's own chrome: `<meta name="theme-color">` follows the theme showing.
 */
export const WEBSITE_THEME_COLORS: Readonly<Record<WebsiteThemeId, string>> = {
  graphite: "#000000",
  paper: "#c8c8c8",
};

/** Where the switch keeps the visitor's choice. */
export const THEME_STORAGE_KEY = "website.theme";
