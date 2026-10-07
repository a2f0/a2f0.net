import { mountDnbm } from "@a2f0/dnbm";
import { useWindowContentSize } from "@tearleads/windowing";
import { useEffect, useRef } from "react";

import type { MiniAppProps } from "../types";

// The sequencer's assets, copied into public/ by the copy-dnbm script.
const DNBM_ASSETS_URL = "/dnbm/";

// The size the sequencer's desktop layout is drawn for: the window opens fitted
// to it, within the desktop, and a smaller window scrolls.
const DNBM_SIZE = { width: 1200, height: 800 };

/**
 * The dnbm drum and bass sequencer from `@a2f0/dnbm`. The package renders the
 * app in this page, inside a shadow root that keeps its styles and the
 * desktop's apart, and hides its wordmark, as the window already names it.
 * Presses inside it reach the window, which comes to the front as for any of
 * its content. Audio starts on the first press inside the app.
 */
export function DnbmApp({ onLoad }: MiniAppProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useWindowContentSize(DNBM_SIZE);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const dnbm = mountDnbm(host, { assetsUrl: DNBM_ASSETS_URL });
    // The window fits to the sequencer once it shows, or once it says why it
    // couldn't start. An instance destroyed by then, as React Strict Mode's
    // first mount is, leaves the window to the one that replaced it.
    let mounted = true;
    const loaded = () => {
      if (mounted) onLoad();
    };
    dnbm.ready.then(loaded, loaded);
    return () => {
      mounted = false;
      dnbm.destroy();
    };
  }, [onLoad]);

  return <div ref={hostRef} className="dnbm-window" />;
}
