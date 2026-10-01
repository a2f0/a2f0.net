export const SVG_FONT_FAMILY = "Arimo";
export const SVG_FONT_STACK = "Arimo, Arial, sans-serif";
/** Where each app serves the font from its public directory. */
export const SVG_FONT_URL = "/fonts/Arimo.woff2";

export async function loadSvgFont(): Promise<boolean> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      document.fonts.load(`400 12pt ${SVG_FONT_FAMILY}`),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Font load timed out")),
          2000,
        );
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
