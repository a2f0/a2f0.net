import PDFObject from "pdfobject";
import { useEffect } from "react";
import styled from "styled-components";

import { useAppSelector } from "../lib/hooks";
import PdfResumeFactory from "@a2f0/shared/pdfResumeFactory";
import { resume } from "@a2f0/shared/resume";
import { RESUME_NAME } from "@a2f0/shared/resumeName";
import { selectScale } from "../lib/resumeConfigSlice";
import { useResume } from "../lib/useResume";

const PdfObjectContainer = styled.div`
  height: calc(
    100vh - var(--header-height) - var(--header-bottom-border) - var(
        --footer-height
      )
  );
  width: 100%;
`;

export default function PdfResume() {
  const scale = useAppSelector(selectScale);
  const config = useResume();

  useEffect(() => {
    const resumeFactory = new PdfResumeFactory(config, resume);
    const pdfResume = resumeFactory.getResume();
    const frame = PDFObject.embed(
      pdfResume.output("datauristring"),
      "#pdfObjectContainer",
      {
        id: "pdfObject",
        pdfOpenParams: {
          scrollbars: "0",
          toolbar: "0",
          statusbar: "0",
          navpanes: "0",
          zoom: `${scale * 100}`,
          pagemode: "none",
        },
      },
    );
    // PDFObject titles its frame "Embedded PDF" unless told otherwise.
    if (frame) frame.title = `${RESUME_NAME}'s resume`;
  });

  return <PdfObjectContainer id="pdfObjectContainer" />;
}
