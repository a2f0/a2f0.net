import { mountSkyline } from "@a2f0/skyline";
import { useOptionalTheme } from "@tearleads/windowing";
import { useEffect, useRef } from "react";

import { PAPER_INK, PAPER_INK_STRONG } from "../../components/themes";

// The viewer's assets, copied into public/ by the copy-skyline script.
const SKYLINE_ASSETS_URL = "/skyline/";

// In Paper, the control bar's text takes Paper's grey ink, and its pressed and
// hovered buttons Paper's emphasis, in place of the package's near-black. The
// selectors match the package's own light rules, which this sheet follows.
const LIGHT_CONTROLS = `
  .skyline-3d[data-theme="light"] .control-bar,
  .skyline-3d[data-theme="light"] .control-bar button,
  .skyline-3d[data-theme="light"] .time-controls :is(label, output) {
    color: ${PAPER_INK};
  }
  .skyline-3d[data-theme="light"] .control-bar button:is(:hover, [aria-pressed="true"]),
  .skyline-3d[data-theme="light"] .control-bar .menu-toggle:hover {
    color: ${PAPER_INK_STRONG};
  }
`;

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
  const colour = useOptionalTheme()?.activeTheme.scheme === "light";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const skyline = mountSkyline(host, {
      assetsUrl: SKYLINE_ASSETS_URL,
      controls: "open",
      colour,
      theme: colour ? "light" : "dark",
    });
    const root = skyline.element.shadowRoot;
    if (colour && root) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(LIGHT_CONTROLS);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    }
    return () => skyline.destroy();
  }, [colour]);

  return <div ref={hostRef} className="skyline-window" data-ct-app="skyline" />;
}
