import { DisplayProperties, useWindowContentSize } from "@tearleads/windowing";
import { useEffect } from "react";

import type { MiniAppProps } from "../types";

// Eight previews occupy three rows at 420px wide. The gallery and theme
// choices measure 396px tall; the window adds its own padding and chrome.
const DISPLAY_PROPERTIES_SIZE = { width: 420, height: 400 };

/**
 * The windowing package's display settings: the desktop's wallpaper and the
 * theme, from the providers in components/Desktop.tsx. The desktop's context
 * menu opens it.
 */
export function DisplayPropertiesApp({ onLoad }: MiniAppProps) {
  useWindowContentSize(DISPLAY_PROPERTIES_SIZE);
  useEffect(() => onLoad(), [onLoad]);
  return (
    <div className="display-properties-window" data-ct-app="display-properties">
      <DisplayProperties />
    </div>
  );
}
