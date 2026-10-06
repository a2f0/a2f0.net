import type { ComponentType } from "react";

const MINI_APP_IDS = ["resume", "ascii-art", "skyline", "dnbm"] as const;

export type MiniAppId = (typeof MINI_APP_IDS)[number];

// Window state stores an app id as an opaque string; narrow it back here.
export function isMiniAppId(value: string | undefined): value is MiniAppId {
  return MINI_APP_IDS.some((appId) => appId === value);
}

/** The props the framework renders every mini-app with. */
export interface MiniAppProps {
  /**
   * Call once the app's content has loaded. A window that opens fitted (see
   * `MiniAppWindowOptions`) fits its content then; later calls do nothing.
   */
  onLoad: () => void;
}

export interface MiniAppDefinition {
  component: ComponentType;
  title: string;
}

/** How a mini-app's window first opens. */
export interface MiniAppWindowOptions {
  /** Where the window opens, in viewport pixels. */
  x: number;
  y: number;
  /**
   * The window's size when it opens, as fractions of the desktop surface's
   * width and height (0.75 for three quarters). The window then moves left
   * and up as far as it must to stay on the surface. Without it, the window
   * takes the stylesheet's default size.
   */
  relativeSize?: { width: number; height: number };
  /**
   * Fit the window to its content once the app calls `onLoad`, as View > Fit
   * to Content would. The app reports its size with `useWindowContentSize`.
   */
  fitToContent?: boolean;
}
