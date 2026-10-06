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
   * Fit the window to its content once the app calls `onLoad`, as View > Fit
   * to Content would. The app reports its size with `useWindowContentSize`.
   */
  fitToContent?: boolean;
}
