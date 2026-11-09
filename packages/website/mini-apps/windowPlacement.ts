import type {
  MiniAppWindowPlacement,
  PlaceMiniAppWindow,
} from "@tearleads/windowing";

import { MINI_APP_WINDOWS } from "./catalog";
import { isMiniAppId } from "./types";

// The surface the windows lay out in, which starts at the viewport's top-left
// corner and ends at the taskbar.
const surfaceSize = () => {
  const surface = document.querySelector(".desktop-surface");
  return surface
    ? { width: surface.clientWidth, height: surface.clientHeight }
    : { width: window.innerWidth, height: window.innerHeight };
};

/**
 * Where each mini-app's new window opens, and how (see `MINI_APP_WINDOWS`): a
 * relative size resolves against the surface as it is now, and the window
 * moves to stay on the surface. The launcher opens every window through it,
 * from the desktop's icons, its menus, and its default windows.
 */
export const placeMiniAppWindow: PlaceMiniAppWindow = ({
  appId,
}): MiniAppWindowPlacement => {
  if (!isMiniAppId(appId)) return {};
  const { fitToContent, relativeSize, x, y } = MINI_APP_WINDOWS[appId];
  if (!relativeSize) return { fitToContent, position: { x, y } };
  const surface = surfaceSize();
  const size = {
    width: Math.round(surface.width * relativeSize.width),
    height: Math.round(surface.height * relativeSize.height),
  };
  return {
    fitToContent,
    position: {
      x: Math.max(0, Math.min(x, surface.width - size.width)),
      y: Math.max(0, Math.min(y, surface.height - size.height)),
    },
    size,
  };
};
