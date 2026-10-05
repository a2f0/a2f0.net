import { resumeConfiguration } from "@a2f0/shared/configuration";
import type { ResumeColors } from "@a2f0/shared/resumeConfig";
import { renderSvgResume } from "@a2f0/shared/svgResume";
import {
  useWindowBackground,
  useWindowContentSize,
} from "@tearleads/windowing";
import { type RefObject, useEffect, useRef, useState } from "react";

import type { MiniAppProps } from "../types";
import { DARK, isDarkTheme, useResumeMenus } from "./useResumeMenus";

const { documentHeight, documentWidth, pixelsPerPoint } = resumeConfiguration;

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
  // Fit to Content sizes the window to the desktop page.
  useWindowContentSize({
    width: (documentWidth / pixelsPerPoint) * scale,
    height: (documentHeight / pixelsPerPoint) * scale,
  });

  // The resume paints its own page, so around it the window shows an
  // off-color of the page's background and frames it as a sheet.
  useWindowBackground(
    `color-mix(in srgb, ${colors.foregroundColor} 10%, ${colors.backgroundColor})`,
  );

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
