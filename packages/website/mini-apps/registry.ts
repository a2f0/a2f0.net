import type {
  LauncherDefinition,
  MiniAppDefinition,
} from "@tearleads/windowing";
import type { ComponentType } from "react";

import { AsciiArtApp } from "./ascii-art/AsciiArtApp";
import {
  MINI_APP_ICONS,
  MINI_APP_LAUNCH_ORDER,
  MINI_APP_TITLES,
} from "./catalog";
import { DnbmApp } from "./dnbm/DnbmApp";
import { DnbmPlayerApp } from "./dnbm-player/DnbmPlayerApp";
import { withMiniAppProps } from "./MiniAppContent";
import { ResumeApp } from "./resume/ResumeApp";
import { SkylineApp } from "./skyline/SkylineApp";
import type { MiniAppId, MiniAppProps } from "./types";

// The mini-app components. Importing this module loads every mini-app, so only
// the desktop that renders apps uses it; titles and launch order live in
// catalog.ts for chrome that only labels or lists them.
function miniApp(
  appId: MiniAppId,
  App: ComponentType<MiniAppProps>,
): MiniAppDefinition {
  const component = withMiniAppProps(App);
  return {
    createComponent: () => component,
    icon: MINI_APP_ICONS[appId],
    title: MINI_APP_TITLES[appId],
  };
}

/**
 * The windowing package's launcher definition of the desktop: every mini-app
 * with its title and icon, listed in launch order. The routed shell, on phones
 * and tablets, shows the artwork at the root route, as the desktop opens it in
 * front.
 */
export const MINI_APP_LAUNCHER: LauncherDefinition<MiniAppId> = {
  apps: {
    resume: miniApp("resume", ResumeApp),
    "ascii-art": miniApp("ascii-art", AsciiArtApp),
    skyline: miniApp("skyline", SkylineApp),
    dnbm: miniApp("dnbm", DnbmApp),
    "dnbm-player": miniApp("dnbm-player", DnbmPlayerApp),
  },
  homeAppId: "ascii-art",
  order: MINI_APP_LAUNCH_ORDER,
};
