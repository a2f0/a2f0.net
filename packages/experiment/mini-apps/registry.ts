import { AsciiArtApp } from "./ascii-art/AsciiArtApp";
import { MINI_APP_TITLES } from "./catalog";
import { ResumeApp } from "./resume/ResumeApp";
import type { MiniAppDefinition, MiniAppId } from "./types";

// The mini-app components. Importing this module loads every mini-app, so only
// the desktop that renders apps uses it; titles and launch order live in
// catalog.ts for chrome that only labels or lists them.
export const MINI_APPS: Readonly<Record<MiniAppId, MiniAppDefinition>> = {
  resume: { component: ResumeApp, title: MINI_APP_TITLES.resume },
  "ascii-art": { component: AsciiArtApp, title: MINI_APP_TITLES["ascii-art"] },
};
