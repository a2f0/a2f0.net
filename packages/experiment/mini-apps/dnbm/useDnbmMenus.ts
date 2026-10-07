import type { DnbmSequencerCommand, DnbmSequencerState } from "@a2f0/dnbm";
import {
  useWindowFileMenuItem,
  useWindowViewMenuItem,
} from "@tearleads/windowing";

type Run = (command: DnbmSequencerCommand) => void;

// A menu item for one of the sequencer's commands, enabled while the
// sequencer takes it. The window calls `onClick` inside the press, so the
// file pickers that open, save as, and a first save open keep its activation.
const commandItem = (
  state: DnbmSequencerState | null,
  run: Run,
  command: DnbmSequencerCommand,
  label: string,
  priority: number,
) => ({
  disabled: !state?.available[command],
  id: command,
  label,
  onClick: () => run(command),
  priority,
});

/**
 * The sequencer's file commands in the window's File menu, and play or stop
 * in its View menu. Each is disabled while the sequencer can't take it: until
 * it is ready, and while it asks something in a dialog.
 */
export function useDnbmMenus(state: DnbmSequencerState | null, run: Run) {
  useWindowFileMenuItem(commandItem(state, run, "new", "New", 50));
  useWindowFileMenuItem(commandItem(state, run, "open", "Open…", 40));
  useWindowFileMenuItem(commandItem(state, run, "save", "Save", 30));
  useWindowFileMenuItem(commandItem(state, run, "saveAs", "Save As…", 20));
  useWindowFileMenuItem(commandItem(state, run, "export", "Export WAV…", 10));

  useWindowViewMenuItem(
    commandItem(state, run, "togglePlay", state?.playing ? "Stop" : "Play", 10),
  );
}
