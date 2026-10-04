import type { ComponentType } from "react";

const MINI_APP_IDS = ["resume", "ascii-art"] as const;

export type MiniAppId = (typeof MINI_APP_IDS)[number];

// Window state stores an app id as an opaque string; narrow it back here.
export function isMiniAppId(value: string | undefined): value is MiniAppId {
  return MINI_APP_IDS.some((appId) => appId === value);
}

export interface MiniAppDefinition {
  component: ComponentType;
  title: string;
}

/** Where a mini-app's window first opens, in viewport pixels. */
export interface MiniAppWindowPosition {
  x: number;
  y: number;
}
