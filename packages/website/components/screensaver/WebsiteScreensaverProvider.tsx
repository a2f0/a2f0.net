import { LaserScreensaver, ScreensaverProvider } from "@tearleads/windowing";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { GalaxyScreensaver } from "./GalaxyScreensaver";

export const SCREENSAVER_STORAGE_KEY = "website.screensaver";
type ScreensaverChoice = "lasers" | "galaxy";

export interface ScreensaverPreference {
  choice: ScreensaverChoice;
  setChoice: (choice: ScreensaverChoice) => void;
  resetChoice: () => void;
}

const PreferenceContext = createContext<ScreensaverPreference | null>(null);

function loadChoice(): ScreensaverChoice {
  try {
    return localStorage.getItem(SCREENSAVER_STORAGE_KEY) === "galaxy"
      ? "galaxy"
      : "lasers";
  } catch {
    return "lasers";
  }
}

/** Only an explicit choice persists, just like the site's theme and wallpaper. */
export function WebsiteScreensaverProvider({ children }: PropsWithChildren) {
  const [choice, setState] = useState(loadChoice);
  const setChoice = useCallback((next: ScreensaverChoice) => {
    setState(next);
    try {
      localStorage.setItem(SCREENSAVER_STORAGE_KEY, next);
    } catch {
      // The choice still works for this visit when storage is unavailable.
    }
  }, []);
  const resetChoice = useCallback(() => {
    setState("lasers");
    try {
      localStorage.removeItem(SCREENSAVER_STORAGE_KEY);
    } catch {
      // There is no saved preference to forget.
    }
  }, []);
  const value = useMemo(
    () => ({ choice, setChoice, resetChoice }),
    [choice, setChoice, resetChoice],
  );
  return (
    <PreferenceContext.Provider value={value}>
      <ScreensaverProvider
        screensaver={choice === "galaxy" ? GalaxyScreensaver : LaserScreensaver}
      >
        {children}
      </ScreensaverProvider>
    </PreferenceContext.Provider>
  );
}

export function useScreensaverPreference() {
  const value = useContext(PreferenceContext);
  if (!value) {
    throw new Error("Screensaver preferences need WebsiteScreensaverProvider");
  }
  return value;
}
