import type { DnbmInstance } from "@a2f0/dnbm";
import { useOptionalTheme } from "@tearleads/windowing";
import { useEffect } from "react";

import { PAPER_INK } from "../../components/themes";

// Both dnbm apps define their palette below the shadow host. Override those
// tokens in the same root, including dialogs and the failure screen. Their
// canvas scopes read these tokens every frame, so audio and editing can keep
// running while the theme changes. Text takes Paper's charcoal ink, and its
// brighter text one step darker, as the desktop's emphasis does.
const LIGHT_PALETTE = `
  .frame, .dialog-layer, .failure {
    color-scheme: light;
    --bg: #f5f5f5;
    --panel: #fafafa;
    --raised: #e8e8e8;
    --hover: #dedede;
    --line: #dedede;
    --line-strong: #b6b6b6;
    --text: ${PAPER_INK};
    --muted: #5f5f5f;
    --faint: #6b6b6b;
    --bright: #262626;
    --cell: #eeeeee;
    --cell-alt: #f7f7f7;
    --cell-now: #d7d7d7;
    --ghost: #666666;
    --hit: #3e3e3e;
    --accent: #111111;
    --note: #d5d5d5;
    --hold: #e4e4e4;
    --scope-line: #444444;
    --scope-axis: #cccccc;
    --skin: #e6e6e6;
    --skin-light: #ffffff;
    --skin-dark: #b5b5b5;
    --display: #fcfcfc;
    --lit: #262626;
    --spectrum-bar: #555555;
    --spectrum-peak: #111111;
  }
`;

/** Recolors an existing sequencer/player without remounting or stopping it. */
export function useDnbmTheme(instance: DnbmInstance | null) {
  const light = useOptionalTheme()?.activeTheme.scheme === "light";
  useEffect(() => {
    const root = instance?.element.shadowRoot;
    if (!root || !light) return;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(LIGHT_PALETTE);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return () => {
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
        (current) => current !== sheet,
      );
    };
  }, [instance, light]);
}
