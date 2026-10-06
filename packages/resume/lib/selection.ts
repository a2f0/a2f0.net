import Color from "color";

export interface SelectionColors {
  background: string;
  text: string;
}

/**
 * Grayscale colors for selected resume text. The background is translucent
 * because WebKit blends an opaque selection color with white, which hides it
 * on the dark theme. Over the theme backgrounds it shows as #6F6F6F on dark
 * and #8C8C8C on light.
 */
export const selectionColors = (backgroundColor: string): SelectionColors =>
  Color(backgroundColor).isDark()
    ? { background: "rgba(255, 255, 255, 0.4)", text: "#FFFFFF" }
    : { background: "rgba(0, 0, 0, 0.45)", text: "#000000" };
