import { mountSkyline } from "@a2f0/skyline";
import { useEffect, useRef, useState } from "react";

import { useRaiseOnFrameFocus } from "../shared/useRaiseOnFrameFocus";

// The viewer's assets, copied into public/ by the copy-skyline script.
const SKYLINE_ASSETS_URL = "/skyline/";

/**
 * The 3D Chicago skyline from `@a2f0/skyline`. The package mounts its viewer
 * in an iframe, which keeps its styles and the desktop's apart, and hides the
 * viewer's own navigation, as the window already frames it. The scene's
 * control bar starts open, so its views and display toggles show at once.
 */
export function SkylineApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null);

  useRaiseOnFrameFocus(frame);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const skyline = mountSkyline(host, {
      assetsUrl: SKYLINE_ASSETS_URL,
      controls: "open",
    });
    setFrame(skyline.element);
    return () => {
      skyline.destroy();
      setFrame(null);
    };
  }, []);

  return <div ref={hostRef} className="skyline-window" />;
}
