import { resumeConfiguration } from "./configuration";
import PdfResumeFactory from "./pdfResumeFactory";
import { resume } from "./resume";
import { type ResumeColors, toResumeConfig } from "./resumeConfig";
import SvgResumeFactory from "./svgResumeFactory";
import {
  loadSvgFont,
  SVG_FONT_FAMILY,
  SVG_FONT_STACK,
  SVG_FONT_URL,
} from "./svgFont";

export function downloadPdf(colors: ResumeColors): void {
  const resumeFactory = new PdfResumeFactory(toResumeConfig(colors), resume);
  resumeFactory.getResume().save("dan.sullivan.resume.pdf");
}

async function loadFontDataUrl(): Promise<string | null> {
  try {
    if (!(await loadSvgFont())) throw new Error("Could not load SVG font");
    const fontResponse = await fetch(SVG_FONT_URL, {
      signal: AbortSignal.timeout(2000),
    });
    if (!fontResponse.ok) throw new Error("Could not load SVG font");
    const fontBlob = await fontResponse.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(fontBlob);
    });
  } catch {
    // The download still works offline using the original system font.
    return null;
  }
}

export async function downloadSvg(colors: ResumeColors): Promise<void> {
  const fontDataUrl = await loadFontDataUrl();
  const resumeFactory = new SvgResumeFactory(
    toResumeConfig(colors),
    resume,
    false,
    0,
    false,
    fontDataUrl ? SVG_FONT_STACK : resumeConfiguration.fontFamily,
  );
  const svg = resumeFactory.getResume();
  if (fontDataUrl) {
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.textContent = `@font-face { font-family: ${SVG_FONT_FAMILY}; src: url("${fontDataUrl}") format("woff2"); }`;
    svg.prepend(style);
  }
  const blob = new Blob([svg.outerHTML], {
    type: "image/svg+xml",
  });
  const element = document.createElement("a");
  element.download = "dan.sullivan.resume.svg";
  element.href = window.URL.createObjectURL(blob);
  element.click();
  element.remove();
}
