import { DisplayProperties, useWindowContentSize } from "@tearleads/windowing";
import { useEffect } from "react";

import type { MiniAppProps } from "../types";

// Room for the wallpaper previews in rows of three, and the theme choices.
const DISPLAY_PROPERTIES_SIZE = { width: 420, height: 330 };

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
