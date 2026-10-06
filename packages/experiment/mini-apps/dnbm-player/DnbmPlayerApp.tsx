import { mountDnbmPlayer } from "@a2f0/dnbm";
import { useWindowContentSize } from "@tearleads/windowing";
import { useEffect, useRef, useState } from "react";

import { useRaiseOnFrameFocus } from "../shared/useRaiseOnFrameFocus";
import type { MiniAppProps } from "../types";

// The same assets as the sequencer, copied into public/ by the copy-dnbm
// script: the player is served from player/ inside them.
const DNBM_ASSETS_URL = "/dnbm/";

// A size that shows the player's display, controls, and the whole playlist of
// example songs: the window opens fitted to it, within the desktop.
const DNBM_PLAYER_SIZE = { width: 440, height: 410 };

/**
 * The dnbm player from `@a2f0/dnbm`: the example drum and bass songs as a
 * playlist, played by the same synthesizer as the sequencer. The package mounts
 * it in an iframe, like the sequencer, and hides its wordmark, as the window
 * already names it. Audio starts on the first press inside the frame.
 */
export function DnbmPlayerApp({ onLoad }: MiniAppProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);

  useWindowContentSize(DNBM_PLAYER_SIZE);
  useRaiseOnFrameFocus(frame);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const player = mountDnbmPlayer(host, { assetsUrl: DNBM_ASSETS_URL });
    // The window fits to the player once its page has loaded.
    player.element.addEventListener("load", onLoad, { once: true });
    setFrame(player.element);
    return () => {
      player.destroy();
      setFrame(null);
    };
  }, [onLoad]);

  return <div ref={hostRef} className="dnbm-player-window" />;
}
