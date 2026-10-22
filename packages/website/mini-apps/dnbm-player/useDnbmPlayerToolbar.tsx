import type { DnbmPlayerCommand, DnbmPlayerState } from "@a2f0/dnbm";
import { PauseIcon } from "@phosphor-icons/react/dist/csr/Pause";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { RepeatIcon } from "@phosphor-icons/react/dist/csr/Repeat";
import { ShuffleIcon } from "@phosphor-icons/react/dist/csr/Shuffle";
import { SkipBackIcon } from "@phosphor-icons/react/dist/csr/SkipBack";
import { SkipForwardIcon } from "@phosphor-icons/react/dist/csr/SkipForward";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import {
  useRoutedLayoutActive,
  useWindowTitleBarAction,
} from "@tearleads/windowing";
import { useMemo } from "react";

type Run = (command: DnbmPlayerCommand) => void;

// Stable icon elements, so an unchanged action matches its registration
// across renders (the window compares the fields with Object.is).
const PREVIOUS_ICON = <SkipBackIcon aria-hidden size={18} weight="fill" />;
const PLAY_ICON = <PlayIcon aria-hidden size={18} weight="fill" />;
const PAUSE_ICON = <PauseIcon aria-hidden size={18} weight="fill" />;
const NEXT_ICON = <SkipForwardIcon aria-hidden size={18} weight="fill" />;
const STOP_ICON = <StopIcon aria-hidden size={18} weight="fill" />;
const SHUFFLE_ICON = <ShuffleIcon aria-hidden size={18} />;
const REPEAT_ICON = <RepeatIcon aria-hidden size={18} />;

/**
 * The player's controls in the window's toolbar, in the player's order: the
 * previous song, play or pause, the next song, then shuffle and repeat, shown
 * pressed while on. Each is disabled while the player can't take it. The
 * routed shell, which has no menu bar for the View menu's Stop, shows Stop
 * after play. The window lays the actions out from the highest priority.
 */
export function useDnbmPlayerToolbar(state: DnbmPlayerState | null, run: Run) {
  const available = state?.available;
  const playing = state?.playing ?? false;
  const shuffle = state?.shuffle ?? false;
  const repeat = state?.repeat ?? false;
  const routed = useRoutedLayoutActive();

  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.previous,
        icon: PREVIOUS_ICON,
        id: "previous",
        label: "Previous",
        onClick: () => run("previous"),
        priority: 50,
      }),
      [available, run],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.togglePlay,
        icon: playing ? PAUSE_ICON : PLAY_ICON,
        id: "play",
        label: playing ? "Pause" : "Play",
        onClick: () => run("togglePlay"),
        priority: 40,
      }),
      [available, playing, run],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () =>
        routed
          ? {
              disabled: !available?.stop,
              icon: STOP_ICON,
              id: "stop",
              label: "Stop",
              onClick: () => run("stop"),
              priority: 35,
            }
          : null,
      [available, routed, run],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.next,
        icon: NEXT_ICON,
        id: "next",
        label: "Next",
        onClick: () => run("next"),
        priority: 30,
      }),
      [available, run],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.toggleShuffle,
        icon: SHUFFLE_ICON,
        id: "shuffle",
        label: "Shuffle",
        onClick: () => run("toggleShuffle"),
        pressed: shuffle,
        priority: 20,
      }),
      [available, run, shuffle],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.toggleRepeat,
        icon: REPEAT_ICON,
        id: "repeat",
        label: "Repeat",
        onClick: () => run("toggleRepeat"),
        pressed: repeat,
        priority: 10,
      }),
      [available, repeat, run],
    ),
  );
}
