import { useWindowActions, useWindowStateData } from "@tearleads/windowing";
import { useCallback, useEffect, useRef } from "react";

import { MINI_APP_LAUNCH_ORDER, MINI_APP_WINDOWS } from "./catalog";
import { MINI_APP_LAUNCHER } from "./registry";
import type { MiniAppId, MiniAppWindowOptions } from "./types";

// The surface the windows lay out in, which starts at the viewport's top-left
// corner and ends at the taskbar.
const surfaceSize = () => {
  const surface = document.querySelector(".desktop-surface");
  return surface
    ? { width: surface.clientWidth, height: surface.clientHeight }
    : { width: window.innerWidth, height: window.innerHeight };
};

/**
 * Where a window opens, and its size: a relative size resolves against the
 * surface as it is now, and the window moves to stay on the surface.
 */
function openingGeometry({ relativeSize, x, y }: MiniAppWindowOptions) {
  if (!relativeSize) return { size: undefined, x, y };
  const surface = surfaceSize();
  const size = {
    width: Math.round(surface.width * relativeSize.width),
    height: Math.round(surface.height * relativeSize.height),
  };
  return {
    size,
    x: Math.max(0, Math.min(x, surface.width - size.width)),
    y: Math.max(0, Math.min(y, surface.height - size.height)),
  };
}

/**
 * Opens a mini-app's window, or brings its open window back to the front:
 * each mini-app has at most one window.
 */
export function useOpenMiniApp() {
  const { windows } = useWindowStateData();
  const { bringToFront, create, restore } = useWindowActions();

  return useCallback(
    (appId: MiniAppId) => {
      const open = windows.find((entry) => entry.appId === appId);
      if (open) {
        restore(open.id);
        bringToFront(open.id);
        return;
      }
      const { createComponent, title } = MINI_APP_LAUNCHER.apps[appId];
      const options = MINI_APP_WINDOWS[appId];
      const { size, x, y } = openingGeometry(options);
      create(title, x, y, createComponent(), {
        appId,
        fitToContent: options.fitToContent,
        size,
      });
    },
    [bringToFront, create, restore, windows],
  );
}

/**
 * Opens every app's window once, in launch order, on load. Reopening after a
 * close is the start menu's job, so this runs once however often the taskbar
 * remounts, as when the visitor switches back from the routed shell.
 */
export function useOpenEveryMiniAppOnce() {
  const openMiniApp = useOpenMiniApp();
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    for (const appId of MINI_APP_LAUNCH_ORDER) openMiniApp(appId);
  });
}
