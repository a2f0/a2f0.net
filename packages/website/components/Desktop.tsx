import {
  createOpfsDesktopStateStorage,
  DesktopIcons,
  DesktopWallpaper,
  isWindowedLayoutEligible,
  LauncherNavigationProvider,
  type NavigationMode,
  NavigationModeOverrideProvider,
  NavigationModeSwitch,
  RoutedPane,
  readNavigationEnvironment,
  resolveNavigationMode,
  ThemeProvider,
  ThemeSwitch,
  useNavigationModeDocumentAttribute,
  useNavigationModeOverride,
  useWindowStateData,
  WallpaperProvider,
  WindowStateProvider,
} from "@tearleads/windowing";
import { useRouter } from "next/router";
import { type PropsWithChildren, useEffect, useState } from "react";
import { MINI_APP_LAUNCH_ORDER } from "../mini-apps/catalog";
import { MiniAppBoundary } from "../mini-apps/MiniAppBoundary";
import { MiniAppWindow } from "../mini-apps/MiniAppWindow";
import { MINI_APP_LAUNCHER } from "../mini-apps/registry";
import { isMiniAppId } from "../mini-apps/types";
import {
  useOpenEveryMiniAppOnce,
  useOpenMiniApp,
} from "../mini-apps/useOpenMiniApp";
import { DesktopSurfaceWithMenu } from "./DesktopMenu";
import { trackInputModality } from "./inputModality";
import StartIcon from "./StartIcon";
import Taskbar from "./Taskbar";
import {
  DEFAULT_WEBSITE_THEME,
  THEME_STORAGE_KEY,
  WEBSITE_THEMES,
} from "./themes";
import {
  DEFAULT_WEBSITE_WALLPAPER,
  WALLPAPER_STORAGE_KEY,
  WEBSITE_WALLPAPERS,
} from "./wallpapers";

// Where the windowed/routed switch keeps the visitor's choice.
const NAVIGATION_MODE_STORAGE_KEY = "website.navigationMode";
const LAUNCHER_PLACEMENT_STORAGE_KEY = "website.launcherPlacement";

// Where the desktop keeps its icon layout: a file in this origin's private
// file system. Reads and writes only run in the browser, after mount.
const DESKTOP_STATE_STORAGE = createOpfsDesktopStateStorage({
  directory: ["website"],
  fileName: "desktop-state.json",
});

function DesktopSurface() {
  const { windows } = useWindowStateData();
  const openMiniApp = useOpenMiniApp();
  return (
    <DesktopSurfaceWithMenu>
      <DesktopWallpaper />
      <DesktopIcons
        appIds={MINI_APP_LAUNCH_ORDER}
        onOpen={openMiniApp}
        storage={DESKTOP_STATE_STORAGE}
      />
      {windows.map((entry) => (
        <MiniAppWindow key={entry.id} windowId={entry.id} />
      ))}
    </DesktopSurfaceWithMenu>
  );
}

// The routed shell names apps by their string ids; anything that is not one
// of these mini-apps renders bare.
function RoutedMiniAppBoundary({
  appId,
  children,
}: PropsWithChildren<{ appId: string }>) {
  if (!isMiniAppId(appId)) return children;
  return <MiniAppBoundary appId={appId}>{children}</MiniAppBoundary>;
}

// Opens the windows once on load, above both layouts, so switching back from
// the routed shell keeps the windows as the visitor left them.
function OpenEveryMiniAppOnce() {
  useOpenEveryMiniAppOnce();
  return null;
}

/**
 * The layout for the screen the page loaded on, or the visitor's choice where
 * windows suit that screen. Resizing does not change it, since a switch
 * remounts every app (stopping audio, for one); the switch does.
 */
function useLayout(): NavigationMode {
  const { override } = useNavigationModeOverride();
  const [environment] = useState(readNavigationEnvironment);
  const choice =
    override === "windowed" && !isWindowedLayoutEligible(environment)
      ? null
      : override;
  return resolveNavigationMode({
    environment,
    forcedMode: choice ?? undefined,
    preferredMode: "windowed",
  });
}

const ROUTED_MENU_ICON = <StartIcon className="desktop-start-icon" />;
// The taskbar's corner, as on the desktop: the layout switch, then the theme
// switch.
const ROUTED_TRAY = (
  <>
    <NavigationModeSwitch mode="routed" />
    <ThemeSwitch />
  </>
);

/**
 * Windows on a desktop wide enough for them, with a mouse: the windowing
 * package's routed shell, one app at a time, on phones, tablets, and narrow
 * windows. The visitor's choice from the switch in the taskbar's corner wins
 * wherever windows suit the screen.
 */
function DesktopLayout() {
  const mode = useLayout();
  useNavigationModeDocumentAttribute(mode);

  return (
    <WindowStateProvider>
      <LauncherNavigationProvider definition={MINI_APP_LAUNCHER} mode={mode}>
        <OpenEveryMiniAppOnce />
        <main className={`desktop desktop--${mode}`}>
          <h1 className="visually-hidden">a2f0</h1>
          {mode === "routed" ? (
            <RoutedPane
              AppBoundary={RoutedMiniAppBoundary}
              launcherPlacementStorageKey={LAUNCHER_PLACEMENT_STORAGE_KEY}
              menuIcon={ROUTED_MENU_ICON}
              taskbarTray={ROUTED_TRAY}
            />
          ) : (
            <>
              <DesktopSurface />
              <Taskbar />
            </>
          )}
        </main>
      </LauncherNavigationProvider>
    </WindowStateProvider>
  );
}

export default function Desktop() {
  useEffect(() => trackInputModality(document), []);

  // The routed shell keeps its own browser history. Next.js would otherwise
  // treat its entries as its own and route back to this page's URL.
  const router = useRouter();
  useEffect(() => router.beforePopState(() => false), [router]);

  return (
    <ThemeProvider
      defaultTheme={DEFAULT_WEBSITE_THEME}
      storageKey={THEME_STORAGE_KEY}
      themes={WEBSITE_THEMES}
    >
      <WallpaperProvider
        defaultWallpaper={DEFAULT_WEBSITE_WALLPAPER}
        storageKey={WALLPAPER_STORAGE_KEY}
        wallpapers={WEBSITE_WALLPAPERS}
      >
        <NavigationModeOverrideProvider
          storageKey={NAVIGATION_MODE_STORAGE_KEY}
        >
          <DesktopLayout />
        </NavigationModeOverrideProvider>
      </WallpaperProvider>
    </ThemeProvider>
  );
}
