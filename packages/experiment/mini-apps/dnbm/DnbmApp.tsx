import { mountDnbm } from "@a2f0/dnbm";
import { useWindowContentSize } from "@tearleads/windowing";
import { useEffect, useRef, useState } from "react";

import { useRaiseOnFrameFocus } from "../shared/useRaiseOnFrameFocus";
import type { MiniAppProps } from "../types";

// The sequencer's assets, copied into public/ by the copy-dnbm script.
const DNBM_ASSETS_URL = "/dnbm/";

// The size the sequencer's desktop layout is drawn for: the window opens fitted
// to it, within the desktop, and a smaller window scrolls.
const DNBM_SIZE = { width: 1200, height: 800 };

/**
 * The dnbm drum and bass sequencer from `@a2f0/dnbm`. The package mounts the
 * app in an iframe, which keeps its styles and audio engine apart from the
 * desktop's, and hides its wordmark, as the window already names it. Audio
 * starts on the first press inside the frame.
 */
export function DnbmApp({ onLoad }: MiniAppProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);

  useWindowContentSize(DNBM_SIZE);
  useRaiseOnFrameFocus(frame);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const dnbm = mountDnbm(host, { assetsUrl: DNBM_ASSETS_URL });
    // The window fits to the sequencer once its page has loaded.
    dnbm.element.addEventListener("load", onLoad, { once: true });
    setFrame(dnbm.element);
    return () => {
      dnbm.destroy();
      setFrame(null);
    };
  }, [onLoad]);

  return <div ref={hostRef} className="dnbm-window" />;
}
