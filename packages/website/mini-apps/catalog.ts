import { BuildingsIcon } from "@phosphor-icons/react/dist/csr/Buildings";
import { EqualizerIcon } from "@phosphor-icons/react/dist/csr/Equalizer";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { GlobeIcon } from "@phosphor-icons/react/dist/csr/Globe";
import { PlaylistIcon } from "@phosphor-icons/react/dist/csr/Playlist";
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
  "dnbm-player": "dnbm player",
};

export const MINI_APP_ICONS: Readonly<Record<MiniAppId, WindowingIcon>> = {
  resume: FileTextIcon,
  "ascii-art": GlobeIcon,
  skyline: BuildingsIcon,
  dnbm: EqualizerIcon,
  "dnbm-player": PlaylistIcon,
};

// Every window opens right of the desktop's column of app icons, which ends
// about 100px from the surface's left edge.
export const MINI_APP_WINDOWS: Readonly<
  Record<MiniAppId, MiniAppWindowOptions>
> = {
  resume: { x: 112, y: 32, fitToContent: true },
  "ascii-art": { x: 360, y: 140 },
  skyline: { x: 240, y: 48, relativeSize: { width: 0.75, height: 0.75 } },
  dnbm: { x: 120, y: 24, fitToContent: true },
  "dnbm-player": { x: 520, y: 72, fitToContent: true },
};

// Opened in this order on load, so the last one starts in front; the taskbar
// lists the apps in the same order. The resume starts in front of the artwork,
// player, and skyline. The dnbm sequencer opens first, behind them all: its
// fitted window is the largest.
export const MINI_APP_LAUNCH_ORDER = [
  "dnbm",
  "skyline",
  "dnbm-player",
  "ascii-art",
  "resume",
] as const satisfies ReadonlyArray<MiniAppId>;
