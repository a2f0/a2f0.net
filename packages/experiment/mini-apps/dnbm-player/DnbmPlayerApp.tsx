import { mountDnbmPlayer } from "@a2f0/dnbm";
import { useWindowContentSize } from "@tearleads/windowing";
import { useEffect, useRef } from "react";

import type { MiniAppProps } from "../types";

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
 * its wordmark, as the window already names it. Audio starts on the first
 * press inside the player.
 */
export function DnbmPlayerApp({ onLoad }: MiniAppProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useWindowContentSize(DNBM_PLAYER_SIZE);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const player = mountDnbmPlayer(host, { assetsUrl: DNBM_ASSETS_URL });
    // The window fits to the player once it shows with its songs, or once it
    // says why it couldn't start. An instance destroyed by then, as React
    // Strict Mode's first mount is, leaves the window to its replacement.
    let mounted = true;
    const loaded = () => {
      if (mounted) onLoad();
    };
    player.ready.then(loaded, loaded);
    return () => {
      mounted = false;
      player.destroy();
    };
  }, [onLoad]);

  return <div ref={hostRef} className="dnbm-player-window" />;
}
