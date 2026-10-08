import type { ResumeColors } from "@a2f0/shared/resumeConfig";
import { useSyncExternalStore } from "react";

import { DARK } from "./useResumeMenus";

interface ResumeSettings {
  colors: ResumeColors;
  scale: number;
}

// The resume's theme and scale, kept for the page rather than the component,
// so they survive the app remounting when the visitor switches between the
// windowed desktop and the routed shell. A reload starts over.
let settings: ResumeSettings = { colors: DARK, scale: 1 };
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSettings() {
  return settings;
}

function update(next: Partial<ResumeSettings>) {
  settings = { ...settings, ...next };
  for (const listener of listeners) listener();
}

const setColors = (colors: ResumeColors) => update({ colors });
const setScale = (scale: number) => update({ scale });

/** The resume's theme and scale, with their setters. */
export function useResumeSettings() {
  const { colors, scale } = useSyncExternalStore(
    subscribe,
    getSettings,
    getSettings,
  );
  return { colors, scale, setColors, setScale };
}
