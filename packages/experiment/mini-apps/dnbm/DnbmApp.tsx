import {
  type DnbmSequencerCommand,
  type DnbmSequencerInstance,
  type DnbmSequencerState,
  mountDnbm,
} from "@a2f0/dnbm";
import { useWindowContentSize } from "@tearleads/windowing";
import { useCallback, useEffect, useRef, useState } from "react";

import { MINI_APP_TITLES } from "../catalog";
import { useDnbmState } from "../shared/useDnbmState";
import { useWindowTitle } from "../shared/useWindowTitle";
import type { MiniAppProps } from "../types";
import { useDnbmMenus } from "./useDnbmMenus";
import { useDnbmToolbar } from "./useDnbmToolbar";

// The sequencer's assets, copied into public/ by the copy-dnbm script.
const DNBM_ASSETS_URL = "/dnbm/";

// The size the sequencer's desktop layout is drawn for: the window opens fitted
// to it, within the desktop, and a smaller window scrolls.
const DNBM_SIZE = { width: 1200, height: 800 };

// The song in the window's title, marked while it has unsaved changes.
const songTitle = (state: DnbmSequencerState | null) =>
  state?.title ? `${state.dirty ? "● " : ""}${state.title}` : null;

/**
 * The dnbm drum and bass sequencer from `@a2f0/dnbm`. The package renders the
 * app in this page, inside a shadow root that keeps its styles and the
 * desktop's apart, and hides its wordmark, as the window already names it.
 * Its own buttons for playing, files, and history give way to the window's
 * File and View menus and toolbar, and the window's title names the song.
 * Presses inside it reach the window, which comes to the front as for any of
 * its content. Audio starts on the first press inside the app, or on Play.
 */
export function DnbmApp({ onLoad }: MiniAppProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [dnbm, setDnbm] = useState<DnbmSequencerInstance | null>(null);
  const state = useDnbmState(dnbm);
  const run = useCallback(
    (command: DnbmSequencerCommand) => {
      dnbm?.run(command);
    },
    [dnbm],
  );

  useWindowContentSize(DNBM_SIZE);
  useDnbmMenus(state, run);
  useDnbmToolbar(state, run);
  useWindowTitle(MINI_APP_TITLES.dnbm, songTitle(state));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const instance = mountDnbm(host, {
      assetsUrl: DNBM_ASSETS_URL,
      actions: false,
    });
    setDnbm(instance);
    // The window fits to the sequencer once it shows, or once it says why it
    // couldn't start. An instance destroyed by then, as React Strict Mode's
    // first mount is, leaves the window to the one that replaced it.
    let mounted = true;
    const loaded = () => {
      if (mounted) onLoad();
    };
    instance.ready.then(loaded, loaded);
    return () => {
      mounted = false;
      instance.destroy();
      setDnbm(null);
    };
  }, [onLoad]);

  return <div ref={hostRef} className="dnbm-window" />;
}
