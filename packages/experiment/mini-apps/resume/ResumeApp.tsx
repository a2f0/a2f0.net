import { resumeConfiguration } from "@a2f0/shared/configuration";
import type { ResumeColors } from "@a2f0/shared/resumeConfig";
import { renderSvgResume } from "@a2f0/shared/svgResume";
import { type RefObject, useEffect, useRef, useState } from "react";

import { DARK, isDarkTheme, useResumeMenus } from "./useResumeMenus";

const { documentWidth, pixelsPerPoint } = resumeConfiguration;

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
export function ResumeApp() {
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

  // The window chrome follows the resume theme.
  useEffect(() => {
    document.documentElement.dataset.theme = isDarkTheme(colors)
      ? "dark"
      : "light";
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
