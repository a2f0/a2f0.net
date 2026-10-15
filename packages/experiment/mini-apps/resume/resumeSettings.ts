import type { ResumeColors } from "@a2f0/shared/resumeConfig";
import { useOptionalTheme } from "@tearleads/windowing";
import { useCallback, useSyncExternalStore } from "react";

import { DARK, LIGHT } from "./useResumeMenus";

interface ResumeSettings {
  colorChoice: { scheme: "dark" | "light"; colors: ResumeColors } | null;
  scale: number;
}

// The resume's theme and scale, kept for the page rather than the component,
// so they survive the app remounting when the visitor switches between the
// windowed desktop and the routed shell. A reload starts over.
let settings: ResumeSettings = { colorChoice: null, scale: 1 };
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

const setScale = (scale: number) => update({ scale });

/** The resume's theme and scale, with their setters. */
export function useResumeSettings() {
  const scheme = useOptionalTheme()?.activeTheme.scheme ?? "dark";
  const { colorChoice, scale } = useSyncExternalStore(
    subscribe,
    getSettings,
    getSettings,
  );
  // Follow the desktop until the visitor picks a page theme. That choice is
  // scoped to the desktop scheme, so a Graphite preview never overrides Paper.
  const colors =
    colorChoice?.scheme === scheme
      ? colorChoice.colors
      : scheme === "light"
        ? LIGHT
        : DARK;
  const setColors = useCallback(
    (colors: ResumeColors) => update({ colorChoice: { scheme, colors } }),
    [scheme],
  );
  return { colors, scale, setColors, setScale };
}
