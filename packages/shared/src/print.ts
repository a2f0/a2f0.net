import type { jsPDF } from "jspdf";

import { resumeConfiguration } from "./configuration";
import PdfResumeFactory from "./pdfResumeFactory";
import { resume } from "./resume";
import { toResumeConfig } from "./resumeConfig";
import { RESUME_NAME } from "./resumeName";

const { lightForegroundColor, lightBackgroundColor, lightHighlightColor } =
  resumeConfiguration;

const PRINT_FRAME_ID = "resumePrintFrame";

/** The resume PDF in the light theme, so it prints on white paper. */
export function createPrintPdf(): jsPDF {
  const pdf = new PdfResumeFactory(
    toResumeConfig({
      foregroundColor: lightForegroundColor,
      backgroundColor: lightBackgroundColor,
      highlightColor: lightHighlightColor,
    }),
    resume,
  ).getResume();
  // Print dialogs name the job, and a saved copy, after the title.
  pdf.setDocumentProperties({ title: `${RESUME_NAME} – Resume` });
  return pdf;
}

/**
 * Opens the print dialog for the resume PDF in the light theme, whichever
 * theme the page shows. The PDF loads into an unseen frame, which prints it.
 */
export function printResume(): void {
  // The dialog can outlast print(), so each frame stays until the next print
  // replaces it.
  const previous = document.getElementById(PRINT_FRAME_ID);
  if (previous instanceof HTMLIFrameElement) {
    URL.revokeObjectURL(previous.src);
    previous.remove();
  }

  const frame = document.createElement("iframe");
  frame.id = PRINT_FRAME_ID;
  frame.title = `${RESUME_NAME}'s resume for printing`;
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  // Firefox prints a PDF frame only while the frame renders, so it is made
  // transparent rather than hidden.
  frame.style.cssText =
    "position: fixed; left: 0; top: 0; width: 1px; height: 100px; border: 0; opacity: 0; pointer-events: none;";
  frame.addEventListener("load", () => frame.contentWindow?.print(), {
    once: true,
  });
  frame.src = URL.createObjectURL(createPrintPdf().output("blob"));
  document.body.append(frame);
}
