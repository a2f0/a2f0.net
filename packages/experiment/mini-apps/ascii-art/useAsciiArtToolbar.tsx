import { HashIcon } from "@phosphor-icons/react/dist/csr/Hash";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import { useWindowTitleBarAction } from "@tearleads/windowing";
import { useMemo } from "react";

import type { SiteControl, SiteControlsState } from "./useSiteControls";

// Stable icon elements, so an unchanged action matches its registration
// across renders (the window compares the fields with Object.is). Play and
// stop are filled, as on the site.
const PLAY_ICON = <PlayIcon aria-hidden size={18} weight="fill" />;
const STOP_ICON = <StopIcon aria-hidden size={18} weight="fill" />;
const ASCII_ICON = <HashIcon aria-hidden size={18} />;

/**
 * The animation and ASCII view, in the site's order. The unavailable music
 * player is omitted, as is the terminal control because the artwork already
 * sits in a window. The window lays the actions out from the highest priority.
 */
export function useAsciiArtToolbar(
  state: SiteControlsState | null,
  press: (control: SiteControl) => void,
) {
  useWindowTitleBarAction(
    useMemo(
      () =>
        state && {
          icon: state.play.playing ? STOP_ICON : PLAY_ICON,
          id: "play",
          label: state.play.label,
          onClick: () => press(".play-toggle"),
          priority: 40,
        },
      [press, state],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () =>
        state && {
          icon: ASCII_ICON,
          id: "ascii-view",
          label: "ASCII view",
          onClick: () => press(".view-toggle"),
          pressed: state.ascii,
          priority: 20,
        },
      [press, state],
    ),
  );
}
