import {
  type DnbmPlayerCommand,
  type DnbmPlayerInstance,
  mountDnbmPlayer,
} from "@a2f0/dnbm";
import { useWindowContentSize } from "@tearleads/windowing";
import { useCallback, useEffect, useRef, useState } from "react";

import { MINI_APP_TITLES } from "../catalog";
import { useDnbmState } from "../shared/useDnbmState";
import { useWindowTitle } from "../shared/useWindowTitle";
import type { MiniAppProps } from "../types";
import { useDnbmPlayerMenus } from "./useDnbmPlayerMenus";
import { useDnbmPlayerToolbar } from "./useDnbmPlayerToolbar";

// The same assets as the sequencer, copied into public/ by the copy-dnbm
// script: the player's code is in player/ inside them.
const DNBM_ASSETS_URL = "/dnbm/";

// A size that shows the player's display, controls, and the whole playlist of
// example songs: the window opens fitted to it, within the desktop.
const DNBM_PLAYER_SIZE = { width: 440, height: 410 };

/**
 * The dnbm player from `@a2f0/dnbm`: the example drum and bass songs as a
 * playlist, played by the same synthesizer as the sequencer. The package
 * renders it in this page inside a shadow root, like the sequencer, and hides
 * its wordmark, as the window already names it. Its own transport buttons
 * give way to the window's toolbar and View menu, and the window's title names
 * the current song. Audio starts on the first press inside the player, or on
 * Play.
 */
export function DnbmPlayerApp({ onLoad }: MiniAppProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<DnbmPlayerInstance | null>(null);
  const state = useDnbmState(player);
  const run = useCallback(
    (command: DnbmPlayerCommand) => {
      player?.run(command);
    },
    [player],
  );

  useWindowContentSize(DNBM_PLAYER_SIZE);
  useDnbmPlayerMenus(state, run);
  useDnbmPlayerToolbar(state, run);
  useWindowTitle(MINI_APP_TITLES["dnbm-player"], state?.title || null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const instance = mountDnbmPlayer(host, {
      assetsUrl: DNBM_ASSETS_URL,
      actions: false,
    });
    setPlayer(instance);
    // The window fits to the player once it shows with its songs, or once it
    // says why it couldn't start. An instance destroyed by then, as React
    // Strict Mode's first mount is, leaves the window to its replacement.
    let mounted = true;
    const loaded = () => {
      if (mounted) onLoad();
    };
    instance.ready.then(loaded, loaded);
    return () => {
      mounted = false;
      instance.destroy();
      setPlayer(null);
    };
  }, [onLoad]);

  return <div ref={hostRef} className="dnbm-player-window" />;
}
