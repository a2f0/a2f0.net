import { resumeConfiguration } from "@a2f0/shared/configuration";
import { downloadPdf, downloadSvg } from "@a2f0/shared/downloads";
import resume from "@a2f0/shared/resume.json";
import type { ResumeColors } from "@a2f0/shared/resumeConfig";
import { renderSvgResume } from "@a2f0/shared/svgResume";
import {
  useCurrentWindow,
  useSuppressWindowToolbar,
  useWindowFileMenuItem,
  useWindowViewMenuItem,
} from "@tearleads/windowing";
import { type RefObject, useEffect, useRef, useState } from "react";

const {
  documentWidth,
  pixelsPerPoint,
  darkForegroundColor,
  darkBackgroundColor,
  darkHighlightColor,
  lightForegroundColor,
  lightBackgroundColor,
  lightHighlightColor,
} = resumeConfiguration;

const DARK: ResumeColors = {
  foregroundColor: darkForegroundColor,
  backgroundColor: darkBackgroundColor,
  highlightColor: darkHighlightColor,
};

const LIGHT: ResumeColors = {
  foregroundColor: lightForegroundColor,
  backgroundColor: lightBackgroundColor,
  highlightColor: lightHighlightColor,
};

// The window menus have no checked state, so the active choice is marked in
// its label and the others are indented to match.
const EM_SPACE = "\u2003";
const checked = (active: boolean, label: string) =>
  `${active ? "✓" : EM_SPACE} ${label}`;

function useResumeMenus(
  colors: ResumeColors,
  setColors: (colors: ResumeColors) => void,
  scale: number,
  setScale: (scale: number) => void,
) {
  const showStatusMessage = useCurrentWindow()?.showStatusMessage;
  const isDark = colors.foregroundColor === darkForegroundColor;

  useWindowFileMenuItem({
    id: "download-pdf",
    label: "Download PDF",
    priority: 20,
    onClick: () => {
      downloadPdf(colors);
      showStatusMessage?.("Downloaded PDF");
    },
  });
  useWindowFileMenuItem({
    id: "download-svg",
    label: "Download SVG",
    priority: 10,
    onClick: async () => {
      await downloadSvg(colors);
      showStatusMessage?.("Downloaded SVG");
    },
  });

  useWindowViewMenuItem({
    id: "theme-dark",
    label: checked(isDark, "Dark Theme"),
    priority: 60,
    onClick: () => setColors(DARK),
  });
  useWindowViewMenuItem({
    id: "theme-light",
    label: checked(!isDark, "Light Theme"),
    priority: 50,
    onClick: () => setColors(LIGHT),
  });
  useWindowViewMenuItem({
    id: "scale-150",
    label: checked(scale === 1.5, "150%"),
    priority: 40,
    onClick: () => setScale(1.5),
  });
  useWindowViewMenuItem({
    id: "scale-125",
    label: checked(scale === 1.25, "125%"),
    priority: 30,
    onClick: () => setScale(1.25),
  });
  useWindowViewMenuItem({
    id: "scale-100",
    label: checked(scale === 1, "Real Size"),
    priority: 20,
    onClick: () => setScale(1),
  });
  useWindowViewMenuItem({
    id: "source-code",
    label: `${EM_SPACE} Source Code`,
    priority: 10,
    onClick: () => window.open(resume.url, "_blank", "noopener,noreferrer"),
  });
}

/** The width of the window's scrolling body, inside its padding. */
function useBodyWidth(containerRef: RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const body = containerRef.current?.parentElement;
    if (!body) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(body);
    return () => observer.disconnect();
  }, [containerRef]);

  return width;
}

/**
 * The resume, laid out as the desktop page when the window is wide enough for
 * it and as the single mobile column otherwise.
 */
export default function ResumeWindow() {
  const [colors, setColors] = useState<ResumeColors>(DARK);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyWidth = useBodyWidth(containerRef);
  const measured = bodyWidth !== null;
  const isMobile =
    measured && bodyWidth < (documentWidth / pixelsPerPoint) * scale;
  // The desktop page has a fixed size, so only the mobile column follows the
  // window's width.
  const layoutWidth = isMobile ? bodyWidth : 0;

  useResumeMenus(colors, setColors, scale, setScale);
  // Windows with an appId get a toolbar row for the routed Back button; the
  // resume has no routes, so the row would stay empty.
  useSuppressWindowToolbar(true);

  // The window chrome follows the resume theme.
  useEffect(() => {
    document.documentElement.dataset.theme =
      colors.foregroundColor === darkForegroundColor ? "dark" : "light";
  }, [colors]);

  useEffect(() => {
    // Wait for the first measurement so the resume is laid out once.
    if (!measured) return;
    let cancelled = false;
    void renderSvgResume({ colors, scale, isMobile, width: layoutWidth }).then(
      (svg) => {
        if (!cancelled) containerRef.current?.replaceChildren(svg);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [measured, colors, scale, isMobile, layoutWidth]);

  return (
    <div
      ref={containerRef}
      className="resume-window"
      style={{ background: colors.backgroundColor }}
    />
  );
}
