import { resumeConfiguration } from "@a2f0/shared/configuration";
import { isKnownTheme, renderSvgResume } from "@a2f0/shared/svgResume";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { mobileMediaQuery, mobileQuery } from "../lib/breakpoints";
import { useAppSelector } from "../lib/hooks";
import {
  selectBackgroundColor,
  selectForegroundColor,
  selectHighlightColor,
  selectScale,
} from "../lib/resumeConfigSlice";

interface ISvgContainerProps {
  $scale: number;
}

const SvgContainer = styled.div<ISvgContainerProps>`
  .desktop-svg {
    width: var(--desktop-width);
    height: var(--desktop-height);
    max-width: 100%;
  }

  ${(props) => mobileMediaQuery(props.$scale)} {
    .desktop-svg {
      display: none;
    }
  }

  .hoverable:hover {
    fill: #909090;
  }
`;

const { units, documentWidth, documentHeight } = resumeConfiguration;

interface SvgResumeProps {
  desktopSvg: string | null;
}

interface Viewport {
  width: number;
  isMobile: boolean;
}

export default function SvgResume({ desktopSvg }: SvgResumeProps) {
  const foregroundColor = useAppSelector(selectForegroundColor);
  const backgroundColor = useAppSelector(selectBackgroundColor);
  const highlightColor = useAppSelector(selectHighlightColor);
  const scale = useAppSelector(selectScale);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const usePreRenderedDesktop =
    desktopSvg !== null &&
    isKnownTheme({ foregroundColor, backgroundColor, highlightColor }) &&
    (viewport === null || !viewport.isMobile);

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
      const width = document.documentElement.clientWidth;
      // The breakpoint moves with the scale, which reruns this effect.
      const isMobile = window.matchMedia(mobileQuery(scale)).matches;
      // Resize events often repeat the same size (mobile browsers fire them
      // as their toolbars move); keep the current state so the SVG is not
      // rebuilt for nothing.
      setViewport((current) =>
        current?.width === width && current.isMobile === isMobile
          ? current
          : { width, isMobile },
      );
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    // A scrollbar appearing or disappearing changes the page's width without
    // a resize event, which would leave the SVG sized for the old width.
    const observer = new ResizeObserver(handleResize);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    };
  }, [scale]);

  useEffect(() => {
    if (viewport === null || usePreRenderedDesktop) {
      // Wait for the first client-side measurement so the initial render is
      // already laid out for the actual viewport.
      return;
    }
    // Switching to the pre-rendered SVG remounts the container before this
    // effect is cleaned up, so a render finishing in between must not reach
    // the new container.
    const container = containerRef.current;
    let cancelled = false;
    const renderSvg = async () => {
      const svgResume = await renderSvgResume({
        colors: { foregroundColor, backgroundColor, highlightColor },
        scale,
        isMobile: viewport.isMobile,
        width: viewport.width,
      });
      if (cancelled) return;
      container?.replaceChildren(svgResume);
    };
    void renderSvg();
    return () => {
      cancelled = true;
    };
  }, [
    viewport,
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
      $scale={scale}
      style={positionSvg}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: The SVG is generated from checked-in resume data during the build.
      dangerouslySetInnerHTML={
        usePreRenderedDesktop && desktopSvg ? { __html: desktopSvg } : undefined
      }
    />
  );
}
