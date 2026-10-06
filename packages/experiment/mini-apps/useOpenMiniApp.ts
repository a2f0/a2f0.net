import { useWindowActions, useWindowStateData } from "@tearleads/windowing";
import { useCallback } from "react";

import { MINI_APP_WINDOWS } from "./catalog";
import { MINI_APPS } from "./registry";
import type { MiniAppId, MiniAppWindowOptions } from "./types";

// Start maximized on touch and narrow screens to keep the content readable.
const prefersMaximized = () =>
  window.matchMedia("(pointer: coarse), (max-width: 700px)").matches;

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
  const { bringToFront, create, maximize, restore } = useWindowActions();

  return useCallback(
    (appId: MiniAppId) => {
      const open = windows.find((entry) => entry.appId === appId);
      if (open) {
        restore(open.id);
        bringToFront(open.id);
        return;
      }
      const { component, title } = MINI_APPS[appId];
      const options = MINI_APP_WINDOWS[appId];
      const { size, x, y } = openingGeometry(options);
      const id = create(title, x, y, component, {
        appId,
        fitToContent: options.fitToContent,
        size,
      });
      if (prefersMaximized()) maximize(id);
    },
    [bringToFront, create, maximize, restore, windows],
  );
}
