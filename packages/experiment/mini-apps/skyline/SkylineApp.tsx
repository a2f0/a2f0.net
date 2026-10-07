import { mountSkyline } from "@a2f0/skyline";
import { useEffect, useRef } from "react";

import type { MiniAppProps } from "../types";

// The viewer's assets, copied into public/ by the copy-skyline script.
const SKYLINE_ASSETS_URL = "/skyline/";

/**
 * The 3D Chicago skyline from `@a2f0/skyline`. The package mounts its viewer
 * in an open shadow root, keeping its styles and the desktop's apart. Presses
 * reach the window directly and keys stay scoped to the viewer. The scene's
 * control bar starts open, so its views and display toggles show at once.
 */
export function SkylineApp({ onLoad }: MiniAppProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const skyline = mountSkyline(host, {
      assetsUrl: SKYLINE_ASSETS_URL,
      controls: "open",
    });
    let mounted = true;
    const loaded = () => {
      if (mounted) onLoad();
    };
    // Ready means the first scene frame, or the viewer's visible error. A
    // disposed Strict Mode instance cannot settle its replacement's window.
    skyline.ready.then(loaded, loaded);
    return () => {
      mounted = false;
      skyline.destroy();
    };
  }, [onLoad]);

  return <div ref={hostRef} className="skyline-window" />;
}
