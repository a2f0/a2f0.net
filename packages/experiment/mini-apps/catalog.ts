import { BuildingsIcon } from "@phosphor-icons/react/dist/csr/Buildings";
import { EqualizerIcon } from "@phosphor-icons/react/dist/csr/Equalizer";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { GlobeIcon } from "@phosphor-icons/react/dist/csr/Globe";
import type { WindowingIcon } from "@tearleads/windowing";

import type { MiniAppId, MiniAppWindowOptions } from "./types";

// Presentation metadata for every mini-app: titles, icons, launch order, and
// how each window first opens. It imports no mini-app implementation, so code
// that only labels apps (such as the error boundary) does not load them.
// registry.ts pairs these titles with the components.

export const MINI_APP_TITLES: Readonly<Record<MiniAppId, string>> = {
  resume: "Resume",
  "ascii-art": "a2f0.net",
  skyline: "Skyline",
  dnbm: "dnbm",
};

export const MINI_APP_ICONS: Readonly<Record<MiniAppId, WindowingIcon>> = {
  resume: FileTextIcon,
  "ascii-art": GlobeIcon,
  skyline: BuildingsIcon,
  dnbm: EqualizerIcon,
};

export const MINI_APP_WINDOWS: Readonly<
  Record<MiniAppId, MiniAppWindowOptions>
> = {
  resume: { x: 48, y: 32, fitToContent: true },
  "ascii-art": { x: 360, y: 140 },
  skyline: { x: 240, y: 48, relativeSize: { width: 0.75, height: 0.75 } },
  dnbm: { x: 120, y: 24, fitToContent: true },
};

// Opened in this order on load, so the last one starts in front; the taskbar
// lists the apps in the same order. The skyline opens behind the artwork,
// which keeps the front window it had before the skyline joined. The dnbm
// sequencer opens first, behind them all: its fitted window is the largest.
export const MINI_APP_LAUNCH_ORDER = [
  "dnbm",
  "resume",
  "skyline",
  "ascii-art",
] as const satisfies ReadonlyArray<MiniAppId>;
