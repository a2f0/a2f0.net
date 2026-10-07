import type { DnbmPlayerCommand, DnbmPlayerState } from "@a2f0/dnbm";
import { useWindowViewMenuItem } from "@tearleads/windowing";

import { checked, EM_SPACE } from "../shared/menuLabels";

type Run = (command: DnbmPlayerCommand) => void;

/**
 * The player's View menu: stop, which the toolbar leaves out, and shuffle and
 * repeat, checked while on. Each is disabled while the player can't take it:
 * until it is ready with its songs.
 */
export function useDnbmPlayerMenus(state: DnbmPlayerState | null, run: Run) {
  useWindowViewMenuItem({
    disabled: !state?.available.stop,
    id: "stop",
    label: `${EM_SPACE} Stop`,
    onClick: () => run("stop"),
    priority: 30,
  });
  useWindowViewMenuItem({
    disabled: !state?.available.toggleShuffle,
    id: "shuffle",
    label: checked(state?.shuffle ?? false, "Shuffle"),
    onClick: () => run("toggleShuffle"),
    priority: 20,
  });
  useWindowViewMenuItem({
    disabled: !state?.available.toggleRepeat,
    id: "repeat",
    label: checked(state?.repeat ?? false, "Repeat"),
    onClick: () => run("toggleRepeat"),
    priority: 10,
  });
}
