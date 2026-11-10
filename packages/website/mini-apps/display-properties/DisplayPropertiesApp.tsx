import {
  DisplayProperties,
  useTheme,
  useWallpaper,
  useWindowContentSize,
} from "@tearleads/windowing";
import { useEffect } from "react";

import {
  DEFAULT_WEBSITE_THEME,
  THEME_STORAGE_KEY,
} from "../../components/themes";
import {
  DEFAULT_WEBSITE_WALLPAPER,
  WALLPAPER_STORAGE_KEY,
} from "../../components/wallpapers";
import type { MiniAppProps } from "../types";

// Eight previews occupy three rows at 420px wide. The gallery and theme
// choices measure 396px tall, and the Reset Defaults row below them 42px; the
// window adds its own padding and chrome.
const DISPLAY_PROPERTIES_SIZE = { width: 420, height: 440 };

// Forgets the visitor's choices, so a later change to the defaults reaches
// them as it does a new visitor. Storage that is unavailable or throws holds
// no choice to forget.
function forgetDisplayChoices() {
  try {
    localStorage.removeItem(WALLPAPER_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Nothing was stored.
  }
}

/**
 * Puts the wallpaper and the theme back to the desktop's defaults, Flux and
 * Graphite. It stays enabled while the defaults show, since a saved choice of
 * a default is still a choice to forget.
 */
function ResetDefaultsButton() {
  const { setTheme } = useTheme();
  const { setWallpaper } = useWallpaper();
  return (
    <div className="display-properties-actions">
      <button
        className="display-properties-reset"
        onClick={() => {
          setWallpaper(DEFAULT_WEBSITE_WALLPAPER);
          setTheme(DEFAULT_WEBSITE_THEME);
          forgetDisplayChoices();
        }}
        type="button"
      >
        Reset Defaults
      </button>
    </div>
  );
}

/**
 * The windowing package's display settings: the desktop's wallpaper and the
 * theme, from the providers in components/Desktop.tsx, with a button that
 * resets both. The desktop's context menu opens it.
 */
export function DisplayPropertiesApp({ onLoad }: MiniAppProps) {
  useWindowContentSize(DISPLAY_PROPERTIES_SIZE);
  useEffect(() => onLoad(), [onLoad]);
  return (
    <div className="display-properties-window" data-ct-app="display-properties">
      <DisplayProperties />
      <ResetDefaultsButton />
    </div>
  );
}
