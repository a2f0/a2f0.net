import type {
  LauncherDefinition,
  MiniAppDefinition,
  RoutedLayoutTier,
} from "@tearleads/windowing";
import type { ComponentType } from "react";

import { AsciiArtApp } from "./ascii-art/AsciiArtApp";
import {
  MINI_APP_ICON_LABELS,
  MINI_APP_ICONS,
  MINI_APP_ORDER,
  MINI_APP_TITLES,
} from "./catalog";
import { DisplayPropertiesApp } from "./display-properties/DisplayPropertiesApp";
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
    iconLabel: MINI_APP_ICON_LABELS[appId],
    title: MINI_APP_TITLES[appId],
  };
}

/**
 * The windowing package's launcher definition of the desktop: every mini-app
 * with its title, icon label, and icon, listed in menu order. The windowed
 * desktop opens the skyline and then the resume on load, so the resume starts
 * in front. The routed shell shows the artwork at the root route on a phone.
 */
const MINI_APP_LAUNCHER: LauncherDefinition<MiniAppId> = {
  apps: {
    resume: miniApp("resume", ResumeApp),
    "ascii-art": miniApp("ascii-art", AsciiArtApp),
    skyline: miniApp("skyline", SkylineApp),
    dnbm: miniApp("dnbm", DnbmApp),
    "dnbm-player": miniApp("dnbm-player", DnbmPlayerApp),
    "display-properties": miniApp("display-properties", DisplayPropertiesApp),
  },
  defaultWindowAppIds: ["skyline", "resume"],
  homeAppId: "ascii-art",
  order: MINI_APP_ORDER,
};

/**
 * The launcher definition for each routed shell tier. They differ only in the
 * app at the root route: the resume on a tablet, and the artwork on a phone.
 */
export const MINI_APP_LAUNCHERS: Readonly<
  Record<RoutedLayoutTier, LauncherDefinition<MiniAppId>>
> = {
  mobile: MINI_APP_LAUNCHER,
  tablet: { ...MINI_APP_LAUNCHER, homeAppId: "resume" },
};
