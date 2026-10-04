import { useWindowActions, useWindowStateData } from "@tearleads/windowing";
import { useCallback } from "react";

import { MINI_APP_POSITIONS } from "./catalog";
import { MINI_APPS } from "./registry";
import type { MiniAppId } from "./types";

// Start maximized on touch and narrow screens to keep the content readable.
const prefersMaximized = () =>
  window.matchMedia("(pointer: coarse), (max-width: 700px)").matches;

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
      const { x, y } = MINI_APP_POSITIONS[appId];
      const id = create(title, x, y, component, { appId });
      if (prefersMaximized()) maximize(id);
    },
    [bringToFront, create, maximize, restore, windows],
  );
}
