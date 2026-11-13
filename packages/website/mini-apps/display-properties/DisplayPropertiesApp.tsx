import {
  DisplayProperties,
  useTheme,
  useWallpaper,
  useWindowContentSize,
} from "@tearleads/windowing";
import { useEffect, useId } from "react";

import { useScreensaverPreference } from "../../components/screensaver/WebsiteScreensaverProvider";
import {
  DEFAULT_WEBSITE_THEME,
  THEME_STORAGE_KEY,
} from "../../components/themes";
import {
  DEFAULT_WEBSITE_WALLPAPER,
  WALLPAPER_STORAGE_KEY,
} from "../../components/wallpapers";
import type { MiniAppProps } from "../types";

// Gallery (396px), screensaver row and margin (65px), and reset row (42px),
// rounded up so the fitted content does not scroll.
const DISPLAY_PROPERTIES_SIZE = { width: 420, height: 504 };

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
 * Puts wallpaper, theme, and screensaver back to Honeycomb, Graphite, and
 * Lasers. A saved choice of a default is still a choice to forget.
 */
function ResetDefaultsButton() {
  const { setTheme } = useTheme();
  const { setWallpaper } = useWallpaper();
  const { resetChoice } = useScreensaverPreference();
  return (
    <div className="display-properties-actions">
      <button
        className="display-properties-reset"
        onClick={() => {
          setWallpaper(DEFAULT_WEBSITE_WALLPAPER);
          setTheme(DEFAULT_WEBSITE_THEME);
          resetChoice();
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
 * Shared wallpaper/theme settings plus the site's two screensaver choices.
 * Both desktop and taskbar Start Screensaver actions use this selection.
 */
export function DisplayPropertiesApp({ onLoad }: MiniAppProps) {
  useWindowContentSize(DISPLAY_PROPERTIES_SIZE);
  useEffect(() => onLoad(), [onLoad]);
  const { choice, setChoice } = useScreensaverPreference();
  const screensaverName = useId();
  return (
    <div className="display-properties-window" data-ct-app="display-properties">
      <DisplayProperties />
      <fieldset className="display-properties-screensaver">
        <legend>Screensaver</legend>
        {(["lasers", "galaxy"] as const).map((id) => (
          <label key={id}>
            <input
              type="radio"
              name={screensaverName}
              value={id}
              checked={choice === id}
              onChange={() => setChoice(id)}
            />
            {id === "lasers" ? "Lasers" : "Galaxy"}
          </label>
        ))}
      </fieldset>
      <ResetDefaultsButton />
    </div>
  );
}
