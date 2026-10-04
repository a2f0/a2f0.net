import { mountSite } from "@a2f0/website/src/site";
import { useEffect, useRef, useState } from "react";

import { buildSite, loadSite } from "./site";
import { useAsciiArtMenus } from "./useAsciiArtMenus";
import { useAsciiArtToolbar } from "./useAsciiArtToolbar";
import { useSiteControls } from "./useSiteControls";

/**
 * The a2f0.net artwork and terminal window, with the site's controls in the
 * window's toolbar and View menu.
 */
export function AsciiArtApp() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const { press, state } = useSiteControls(root);

  useAsciiArtToolbar(state, press);
  useAsciiArtMenus(state, press);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const loaded = loadSite();
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.adoptedStyleSheets = [loaded.sheet];
    const container = buildSite(loaded);
    shadow.replaceChildren(container);
    const unmount = mountSite(container);
    setRoot(shadow);
    return () => {
      unmount();
      shadow.replaceChildren();
      setRoot(null);
    };
  }, []);

  return <div ref={hostRef} className="ascii-art-window" />;
}
