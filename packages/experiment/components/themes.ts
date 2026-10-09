import type { ThemeDefinition } from "@tearleads/windowing";

export type ExperimentThemeId = "graphite" | "paper" | "skyline";

/**
 * The desktop's themes, in the order the taskbar's switch cycles them. Each is
 * a block of the windowing package's design tokens in styles/themes.css:
 * Graphite in its base `:root`, the others under `:root[data-theme]`.
 */
export const EXPERIMENT_THEMES: readonly ThemeDefinition<ExperimentThemeId>[] =
  [
    { id: "graphite", label: "Graphite", scheme: "dark" },
    { id: "paper", label: "Paper", scheme: "light" },
    { id: "skyline", label: "Skyline", scheme: "dark" },
  ];

/** The theme until the visitor picks one, whatever the OS prefers. */
export const DEFAULT_EXPERIMENT_THEME: ExperimentThemeId = "graphite";

/** Where the switch keeps the visitor's choice. */
export const THEME_STORAGE_KEY = "experiment.theme";
