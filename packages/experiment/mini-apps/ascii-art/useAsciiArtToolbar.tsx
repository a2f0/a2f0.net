import { HashIcon } from "@phosphor-icons/react/dist/csr/Hash";
import { MusicNotesIcon } from "@phosphor-icons/react/dist/csr/MusicNotes";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { SquareIcon } from "@phosphor-icons/react/dist/csr/Square";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import { useWindowTitleBarAction } from "@tearleads/windowing";
import { useMemo } from "react";

import type { SiteControl, SiteControlsState } from "./useSiteControls";

// Stable icon elements, so an unchanged action matches its registration
// across renders (the window compares the fields with Object.is). Play and
// stop are filled, as on the site, so stop never reads as the terminal's
// outlined square.
const PLAY_ICON = <PlayIcon aria-hidden size={18} weight="fill" />;
const STOP_ICON = <StopIcon aria-hidden size={18} weight="fill" />;
const MUSIC_ICON = <MusicNotesIcon aria-hidden size={18} />;
const ASCII_ICON = <HashIcon aria-hidden size={18} />;
const TERMINAL_ICON = <SquareIcon aria-hidden size={18} />;

/**
 * The site's toolbar, in the window's toolbar row and in the site's order:
 * the animation, the music player, then the two toggles. The window lays the
 * actions out from the highest priority.
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
          disabled: state.music.disabled,
          icon: MUSIC_ICON,
          id: "music",
          label: state.music.label,
          onClick: () => press(".music-toggle"),
          priority: 30,
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
  useWindowTitleBarAction(
    useMemo(
      () =>
        state && {
          icon: TERMINAL_ICON,
          id: "terminal-window",
          label: "Terminal window",
          onClick: () => press(".window-toggle"),
          pressed: state.terminal,
          priority: 10,
        },
      [press, state],
    ),
  );
}
