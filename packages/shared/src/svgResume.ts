import { resumeConfiguration } from "./configuration";
import { resume } from "./resume";
import { type ResumeColors, toResumeConfig } from "./resumeConfig";
import SvgResumeFactory from "./svgResumeFactory";
import { loadSvgFont, SVG_FONT_STACK } from "./svgFont";

const { pixelsPerPoint, units, documentWidth, documentHeight } =
  resumeConfiguration;

export interface SvgResumeOptions {
  colors: ResumeColors;
  scale: number;
  /** Lays the resume out as one column sized to `width`. */
  isMobile: boolean;
  /** The pixel width the mobile layout fills. */
  width: number;
}

/** The known color themes, which the build can pre-render. */
export function isKnownTheme({
  foregroundColor,
  backgroundColor,
  highlightColor,
}: ResumeColors): boolean {
  const {
    darkForegroundColor,
    darkBackgroundColor,
    darkHighlightColor,
    lightForegroundColor,
    lightBackgroundColor,
    lightHighlightColor,
  } = resumeConfiguration;
  return (
    (foregroundColor === darkForegroundColor &&
      backgroundColor === darkBackgroundColor &&
      highlightColor === darkHighlightColor) ||
    (foregroundColor === lightForegroundColor &&
      backgroundColor === lightBackgroundColor &&
      highlightColor === lightHighlightColor)
  );
}

/**
 * Builds the resume SVG element once the bundled font has loaded (or timed
 * out), sized for the desktop page or for a mobile column.
 */
export async function renderSvgResume({
  colors,
  scale,
  isMobile,
  width,
}: SvgResumeOptions): Promise<SVGElement> {
  const fontFamily = (await loadSvgFont())
    ? SVG_FONT_STACK
    : resumeConfiguration.fontFamily;

  // On mobile the document is laid out at the viewport width divided by the
  // zoom scale, then stretched back to the viewport, so text renders at the
  // same visual size as on desktop.
  const mobileViewBoxWidth = width / scale;
  const mobileDocumentWidthPt = mobileViewBoxWidth * pixelsPerPoint;

  const resumeFactory = new SvgResumeFactory(
    toResumeConfig(colors),
    resume,
    isMobile,
    mobileDocumentWidthPt,
    false,
    fontFamily,
  );
  const svgResume = resumeFactory.getResume();
  svgResume.setAttribute("class", "svg");

  if (isMobile) {
    const viewBoxHeight =
      resumeFactory.getContentHeight() / pixelsPerPoint + 20;
    svgResume.setAttribute("width", `${width}px`);
    svgResume.setAttribute("height", `${viewBoxHeight * scale}px`);
    svgResume.setAttribute(
      "viewBox",
      `0 0 ${mobileViewBoxWidth} ${viewBoxHeight}`,
    );
    // Never exceed the layout viewport: an SVG wider than the viewport
    // would expand it, which in turn keeps isMobile detection stuck at the
    // wider size. Scaling down instead lets the layout self-correct.
    svgResume.style.maxWidth = "100%";
    svgResume.style.height = "auto";
  } else {
    svgResume.setAttribute("width", documentWidth * scale + units);
    svgResume.setAttribute("height", documentHeight * scale + units);
    svgResume.setAttribute(
      "viewBox",
      `0 0 ${documentWidth / pixelsPerPoint} ${documentHeight / pixelsPerPoint}`,
    );
    svgResume.setAttribute("preserveAspectRatio", "none");
  }

  return svgResume;
}
