import { useWindowViewMenuItem } from "@tearleads/windowing";

import { checked, EM_SPACE } from "../shared/menuLabels";
import type { SiteControl, SiteControlsState } from "./useSiteControls";

/** Mirrors the site's controls into the window's View menu. */
export function useAsciiArtMenus(
  state: SiteControlsState | null,
  press: (control: SiteControl) => void,
) {
  useWindowViewMenuItem(
    state && {
      id: "ascii-view",
      label: checked(state.ascii, "ASCII View"),
      priority: 30,
      onClick: () => press(".view-toggle"),
    },
  );
  useWindowViewMenuItem(
    state && {
      id: "play",
      label: `${EM_SPACE} ${state.play.label}`,
      priority: 20,
      onClick: () => press(".play-toggle"),
    },
  );
}
