import { resumeConfiguration } from "@a2f0/shared/configuration";
import { renderSvgResume } from "@a2f0/shared/svgResume";
import {
  useOptionalTheme,
  useWindowBackground,
  useWindowContentSize,
} from "@tearleads/windowing";
import { type RefObject, useEffect, useRef, useState } from "react";

import type { MiniAppProps } from "../types";
import { useResumeSettings } from "./resumeSettings";
import { DARK, useResumeMenus } from "./useResumeMenus";
import { useResumeToolbar } from "./useResumeToolbar";

const { documentHeight, documentWidth, pixelsPerPoint } = resumeConfiguration;

// Graphite keeps the resume site's dark desk. Paper uses a pale surround,
// independent of a page-theme override selected from the resume's own menu.
const SURROUND = `color-mix(in srgb, ${DARK.foregroundColor} 10%, ${DARK.backgroundColor})`;

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
export function ResumeApp({ onLoad }: MiniAppProps) {
  const { colors, scale, setColors, setScale } = useResumeSettings();
  const light = useOptionalTheme()?.activeTheme.scheme === "light";
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyWidth = useBodyWidth(containerRef);
  const measured = bodyWidth !== null;
  const isMobile =
    measured && bodyWidth < (documentWidth / pixelsPerPoint) * scale;
  // The desktop page has a fixed size, so only the mobile column follows the
  // window's width.
  const layoutWidth = isMobile ? bodyWidth : 0;

  useResumeMenus(colors, setColors, scale, setScale);
  useResumeToolbar(colors, setColors);
  // Fit to Content sizes the window to the desktop page.
  useWindowContentSize({
    width: (documentWidth / pixelsPerPoint) * scale,
    height: (documentHeight / pixelsPerPoint) * scale,
  });

  useWindowBackground(light ? "#e7e7e7" : SURROUND);

  useEffect(() => {
    // Wait for the first measurement so the resume is laid out once.
    if (!measured) return;
    let cancelled = false;
    void renderSvgResume({ colors, scale, isMobile, width: layoutWidth }).then(
      (svg) => {
        if (cancelled) return;
        containerRef.current?.replaceChildren(svg);
        onLoad();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [measured, colors, scale, isMobile, layoutWidth, onLoad]);

  return <div ref={containerRef} className="resume-window" />;
}
