import Color from "color";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { resumeConfiguration } from "../configuration";
import { MOBILE_BREAKPOINT } from "../lib/breakpoints";
import { useAppSelector } from "../lib/hooks";
import { resume } from "../lib/resume";
import {
  selectBackgroundColor,
  selectForegroundColor,
  selectHighlightColor,
  selectScale,
} from "../lib/resumeConfigSlice";
import SvgResumeFactory from "../lib/svgResumeFactory";

const SvgContainer = styled.div`
  .desktop-svg {
    width: var(--desktop-width);
    height: var(--desktop-height);
    max-width: 100%;
  }

  @media (max-width: ${MOBILE_BREAKPOINT - 1}px) {
    .desktop-svg {
      display: none;
    }
  }

  .hoverable:hover {
    fill: #909090;
  }
`;

const { pixelsPerPoint, units, documentWidth, documentHeight } =
  resumeConfiguration;
const ORIGINAL_VIEWBOX_WIDTH = documentWidth / pixelsPerPoint;
const ORIGINAL_VIEWBOX_HEIGHT = documentHeight / pixelsPerPoint;

interface SvgResumeProps {
  desktopSvg: string | null;
}

export default function SvgResume({ desktopSvg }: SvgResumeProps) {
  const foregroundColor = useAppSelector(selectForegroundColor);
  const backgroundColor = useAppSelector(selectBackgroundColor);
  const highlightColor = useAppSelector(selectHighlightColor);
  const scale = useAppSelector(selectScale);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    darkForegroundColor,
    darkBackgroundColor,
    darkHighlightColor,
    lightForegroundColor,
    lightBackgroundColor,
    lightHighlightColor,
  } = resumeConfiguration;
  const isKnownTheme =
    (foregroundColor === darkForegroundColor &&
      backgroundColor === darkBackgroundColor &&
      highlightColor === darkHighlightColor) ||
    (foregroundColor === lightForegroundColor &&
      backgroundColor === lightBackgroundColor &&
      highlightColor === lightHighlightColor);
  const usePreRenderedDesktop =
    desktopSvg !== null &&
    isKnownTheme &&
    (viewportWidth === null || viewportWidth >= MOBILE_BREAKPOINT);

  const positionSvg: CSSProperties = {
    textAlign: "center",
    marginTop: "25px",
    "--desktop-width": `${documentWidth * scale}${units}`,
    "--desktop-height": `${documentHeight * scale}${units}`,
    "--resume-foreground": foregroundColor,
    "--resume-background": backgroundColor,
    "--resume-highlight": highlightColor,
  } as CSSProperties;

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (viewportWidth === null || usePreRenderedDesktop) {
      // Wait for the first client-side measurement so the initial render is
      // already laid out for the actual viewport.
      return;
    }
    const isMobile = viewportWidth < MOBILE_BREAKPOINT;

    // On mobile the document is laid out at the viewport width divided by the
    // zoom scale, then stretched back to the viewport, so text renders at the
    // same visual size as on desktop.
    const mobileViewBoxWidth = viewportWidth / scale;
    const mobileDocumentWidthPt = mobileViewBoxWidth * pixelsPerPoint;

    const resumeFactory = new SvgResumeFactory(
      {
        foregroundColor: Color(foregroundColor),
        backgroundColor: Color(backgroundColor),
        highlightColor: Color(highlightColor),
      },
      resume,
      isMobile,
      mobileDocumentWidthPt,
    );
    const svgResume = resumeFactory.getResume();
    svgResume.setAttribute("class", "svg");

    if (isMobile) {
      const viewBoxHeight =
        resumeFactory.getContentHeight() / pixelsPerPoint + 20;
      svgResume.setAttribute("width", `${viewportWidth}px`);
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
        `0 0 ${ORIGINAL_VIEWBOX_WIDTH} ${ORIGINAL_VIEWBOX_HEIGHT}`,
      );
      svgResume.setAttribute("preserveAspectRatio", "none");
    }

    containerRef.current?.replaceChildren(svgResume);
  }, [
    viewportWidth,
    scale,
    foregroundColor,
    backgroundColor,
    highlightColor,
    usePreRenderedDesktop,
  ]);

  return (
    <SvgContainer
      key={usePreRenderedDesktop ? "preRendered" : "dynamic"}
      ref={containerRef}
      className="svg"
      id="svgContainer"
      style={positionSvg}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: The SVG is generated from checked-in resume data during the build.
      dangerouslySetInnerHTML={
        usePreRenderedDesktop && desktopSvg ? { __html: desktopSvg } : undefined
      }
    />
  );
}
