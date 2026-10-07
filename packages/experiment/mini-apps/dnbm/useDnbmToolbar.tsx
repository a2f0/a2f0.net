import type { DnbmSequencerCommand, DnbmSequencerState } from "@a2f0/dnbm";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpRight";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import { useWindowTitleBarAction } from "@tearleads/windowing";
import { useMemo } from "react";

type Run = (command: DnbmSequencerCommand) => void;

// Stable icon elements, so an unchanged action matches its registration
// across renders (the window compares the fields with Object.is).
const PLAY_ICON = <PlayIcon aria-hidden size={18} weight="fill" />;
const STOP_ICON = <StopIcon aria-hidden size={18} weight="fill" />;
const UNDO_ICON = <ArrowUUpLeftIcon aria-hidden size={18} />;
const REDO_ICON = <ArrowUUpRightIcon aria-hidden size={18} />;

/**
 * The sequencer's transport and history in the window's toolbar: play or
 * stop, then undo and redo, each disabled while the sequencer can't take it.
 * The window lays the actions out from the highest priority.
 */
export function useDnbmToolbar(state: DnbmSequencerState | null, run: Run) {
  const playing = state?.playing ?? false;
  const available = state?.available;

  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.togglePlay,
        icon: playing ? STOP_ICON : PLAY_ICON,
        id: "play",
        label: playing ? "Stop" : "Play",
        onClick: () => run("togglePlay"),
        priority: 30,
      }),
      [available, playing, run],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.undo,
        icon: UNDO_ICON,
        id: "undo",
        label: "Undo",
        onClick: () => run("undo"),
        priority: 20,
      }),
      [available, run],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () => ({
        disabled: !available?.redo,
        icon: REDO_ICON,
        id: "redo",
        label: "Redo",
        onClick: () => run("redo"),
        priority: 10,
      }),
      [available, run],
    ),
  );
}
