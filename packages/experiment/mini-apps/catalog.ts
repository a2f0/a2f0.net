import type { MiniAppId, MiniAppWindowPosition } from "./types";

// Presentation metadata for every mini-app: titles, launch order, and where
// each window first opens. It imports no mini-app implementation, so code that
// only labels apps (such as the error boundary) does not load them.
// registry.ts pairs these titles with the components.

export const MINI_APP_TITLES: Readonly<Record<MiniAppId, string>> = {
  resume: "Resume",
  "ascii-art": "a2f0.net",
};

export const MINI_APP_POSITIONS: Readonly<
  Record<MiniAppId, MiniAppWindowPosition>
> = {
  resume: { x: 48, y: 32 },
  "ascii-art": { x: 360, y: 140 },
};

// Opened in this order on load, so the last one starts in front; the taskbar
// lists the apps in the same order.
export const MINI_APP_LAUNCH_ORDER = [
  "resume",
  "ascii-art",
] as const satisfies ReadonlyArray<MiniAppId>;
