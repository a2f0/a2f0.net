import { type CSSProperties, useEffect, useState } from "react";
import styled from "styled-components";

import { resumeConfiguration } from "../configuration";
import { MOBILE_BREAKPOINT } from "../lib/breakpoints";
import { useAppSelector } from "../lib/hooks";
import { resume } from "../lib/resume";
import { selectScale } from "../lib/resumeConfigSlice";
import SvgResumeFactory from "../lib/svgResumeFactory";
import { useResume } from "../lib/useResume";

const SvgContainer = styled.div`
  .hoverable:hover {
    fill: #909090;
  }
`;

const { pixelsPerPoint, units, documentWidth, documentHeight } =
  resumeConfiguration;

export default function SvgResume() {
  const config = useResume();
  const positionSvg: CSSProperties = {
    textAlign: "center",
    marginTop: "25px",
  };

  const scale = useAppSelector(selectScale);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  const ORIGINAL_VIEWBOX_WIDTH = documentWidth / pixelsPerPoint;
  const ORIGINAL_VIEWBOX_HEIGHT = documentHeight / pixelsPerPoint;

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (viewportWidth === null) {
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
      config,
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

    const svgContainer = document.getElementById("svgContainer");
    if (svgContainer) {
      svgContainer.innerHTML = "";
      svgContainer.appendChild(svgResume);
    }
  });

  return <SvgContainer className="svg" id="svgContainer" style={positionSvg} />;
}
