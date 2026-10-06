import { resumeConfiguration } from "@a2f0/shared/configuration";
import Color from "color";
import { describe, expect, it } from "vitest";
import { selectionColors } from "../../lib/selection";

const {
  darkBackgroundColor,
  darkForegroundColor,
  lightBackgroundColor,
  lightForegroundColor,
} = resumeConfiguration;

// The color the translucent selection paints over the page background.
const composite = (overlay: string, background: string) => {
  const top = Color(overlay);
  const alpha = top.alpha();
  const bottom = Color(background);
  return Color.rgb(
    top.red() * alpha + bottom.red() * (1 - alpha),
    top.green() * alpha + bottom.green() * (1 - alpha),
    top.blue() * alpha + bottom.blue() * (1 - alpha),
  );
};

describe.each([
  ["dark", darkBackgroundColor, darkForegroundColor, "#6F6F6F"],
  ["light", lightBackgroundColor, lightForegroundColor, "#8C8C8C"],
])("selectionColors on the %s theme", (_, background, foreground, painted) => {
  const selection = selectionColors(background);
  const highlight = composite(selection.background, background);

  it("paints a gray highlight", () => {
    expect(highlight.hex()).toBe(painted);
  });

  it("stands out from the page", () => {
    expect(highlight.contrast(Color(background))).toBeGreaterThanOrEqual(3);
  });

  it("keeps selected text readable", () => {
    const text = Color(selection.text);
    expect(text.red()).toBe(text.green());
    expect(text.green()).toBe(text.blue());
    expect(text.contrast(highlight)).toBeGreaterThanOrEqual(4.5);
    expect(text.contrast(highlight)).toBeGreaterThanOrEqual(
      Color(foreground).contrast(highlight),
    );
  });
});
