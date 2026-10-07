import { mountSkyline } from "@a2f0/skyline";
import { useEffect, useRef } from "react";

// The viewer's assets, copied into public/ by the copy-skyline script.
const SKYLINE_ASSETS_URL = "/skyline/";

/**
 * The 3D Chicago skyline from `@a2f0/skyline`. The package renders the viewer
 * in this page, inside a shadow root that keeps its styles and the desktop's
 * apart. Presses inside it reach the window, which comes to the front as for
 * any of its content, and its keys act only while focus is inside it. The
 * scene's control bar starts open, so its views and display toggles show at
 * once. The window opens at a size relative to the desktop, not fitted to the
 * viewer, so it doesn't wait for the viewer to be ready.
 */
export function SkylineApp() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const skyline = mountSkyline(host, {
      assetsUrl: SKYLINE_ASSETS_URL,
      controls: "open",
    });
    return () => skyline.destroy();
  }, []);

  return <div ref={hostRef} className="skyline-window" />;
}
