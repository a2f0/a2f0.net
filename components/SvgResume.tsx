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
  const [width] = useState(documentWidth);
  const [height] = useState(documentHeight);
  const [isMobile, setIsMobile] = useState(false);

  const ORIGINAL_VIEWBOX_WIDTH = documentWidth / pixelsPerPoint;
  const ORIGINAL_VIEWBOX_HEIGHT = documentHeight / pixelsPerPoint;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const mobileDocumentWidthPt = isMobile ? window.innerWidth * pixelsPerPoint : 0;
    const resumeFactory = new SvgResumeFactory(config, resume, isMobile, mobileDocumentWidthPt);
    const svgResume = resumeFactory.getResume();
    svgResume.setAttribute("class", "svg");

    if (isMobile) {
      const viewBoxWidth = window.innerWidth;
      const viewBoxHeight = resumeFactory.getContentHeight() / pixelsPerPoint + 20;
      svgResume.setAttribute("width", viewBoxWidth + "px");
      svgResume.setAttribute("height", viewBoxHeight + "px");
      svgResume.setAttribute(
        "viewBox",
        `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
      );
    } else {
      svgResume.setAttribute("width", width * scale + units);
      svgResume.setAttribute("height", height * scale + units);
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
