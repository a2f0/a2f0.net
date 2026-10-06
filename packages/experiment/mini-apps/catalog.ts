import type { MiniAppId, MiniAppWindowOptions } from "./types";

// Presentation metadata for every mini-app: titles, launch order, and how
// each window first opens. It imports no mini-app implementation, so code that
// only labels apps (such as the error boundary) does not load them.
// registry.ts pairs these titles with the components.

export const MINI_APP_TITLES: Readonly<Record<MiniAppId, string>> = {
  resume: "Resume",
  "ascii-art": "a2f0.net",
  skyline: "Skyline",
};

export const MINI_APP_WINDOWS: Readonly<
  Record<MiniAppId, MiniAppWindowOptions>
> = {
  resume: { x: 48, y: 32, fitToContent: true },
  "ascii-art": { x: 360, y: 140 },
  skyline: { x: 480, y: 60 },
};

// Opened in this order on load, so the last one starts in front; the taskbar
// lists the apps in the same order. The skyline opens behind the artwork,
// which keeps the front window it had before the skyline joined.
export const MINI_APP_LAUNCH_ORDER = [
  "resume",
  "skyline",
  "ascii-art",
] as const satisfies ReadonlyArray<MiniAppId>;
