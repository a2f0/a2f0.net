import type { DnbmSequencerCommand, DnbmSequencerState } from "@a2f0/dnbm";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpRight";
import { ExportIcon } from "@phosphor-icons/react/dist/csr/Export";
import { FilePlusIcon } from "@phosphor-icons/react/dist/csr/FilePlus";
import { FloppyDiskIcon } from "@phosphor-icons/react/dist/csr/FloppyDisk";
import { FloppyDiskBackIcon } from "@phosphor-icons/react/dist/csr/FloppyDiskBack";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { StopIcon } from "@phosphor-icons/react/dist/csr/Stop";
import {
  useRoutedLayoutActive,
  useWindowTitleBarAction,
} from "@tearleads/windowing";
import { type ReactNode, useMemo } from "react";

type Run = (command: DnbmSequencerCommand) => void;

// Stable icon elements, so an unchanged action matches its registration
// across renders (the window compares the fields with Object.is).
const PLAY_ICON = <PlayIcon aria-hidden size={18} weight="fill" />;
const STOP_ICON = <StopIcon aria-hidden size={18} weight="fill" />;
const UNDO_ICON = <ArrowUUpLeftIcon aria-hidden size={18} />;
const REDO_ICON = <ArrowUUpRightIcon aria-hidden size={18} />;
const NEW_ICON = <FilePlusIcon aria-hidden size={18} />;
const OPEN_ICON = <FolderOpenIcon aria-hidden size={18} />;
const SAVE_ICON = <FloppyDiskIcon aria-hidden size={18} />;
const SAVE_AS_ICON = <FloppyDiskBackIcon aria-hidden size={18} />;
const EXPORT_ICON = <ExportIcon aria-hidden size={18} />;

// A file command in the routed shell's toolbar, which has no menu bar to hold
// the File menu; the desktop window keeps them in that menu alone. The toolbar
// calls `onClick` inside the press, as the menu does, so the file pickers keep
// its activation.
function useRoutedFileAction(
  state: DnbmSequencerState | null,
  run: Run,
  command: DnbmSequencerCommand,
  icon: ReactNode,
  label: string,
  priority: number,
) {
  const routed = useRoutedLayoutActive();
  const disabled = !state?.available[command];
  useWindowTitleBarAction(
    useMemo(
      () =>
        routed
          ? {
              disabled,
              icon,
              id: command,
              label,
              onClick: () => run(command),
              priority,
            }
          : null,
      [command, disabled, icon, label, priority, routed, run],
    ),
  );
}

/**
 * The sequencer's transport and history in the window's toolbar: play or
 * stop, then undo and redo, each disabled while the sequencer can't take it.
 * In the routed shell the File menu's commands come first. The window lays the
 * actions out from the highest priority.
 */
export function useDnbmToolbar(state: DnbmSequencerState | null, run: Run) {
  const playing = state?.playing ?? false;
  const available = state?.available;

  useRoutedFileAction(state, run, "new", NEW_ICON, "New", 80);
  useRoutedFileAction(state, run, "open", OPEN_ICON, "Open…", 70);
  useRoutedFileAction(state, run, "save", SAVE_ICON, "Save", 60);
  useRoutedFileAction(state, run, "saveAs", SAVE_AS_ICON, "Save As…", 50);
  useRoutedFileAction(state, run, "export", EXPORT_ICON, "Export WAV…", 40);

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
