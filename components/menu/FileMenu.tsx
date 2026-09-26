import Color from "color";

import { resumeConfiguration } from "../../configuration";
import { useAppSelector } from "../../lib/hooks";
import PdfResumeFactory from "../../lib/pdfResumeFactory";
import { resume } from "../../lib/resume";
import type { ResumeConfig } from "../../lib/resumeConfig";
import {
  selectBackgroundColor,
  selectForegroundColor,
  selectHighlightColor,
} from "../../lib/resumeConfigSlice";
import { selectScale } from "../../lib/resumeConfigSlice";
import SvgResumeFactory from "../../lib/svgResumeFactory";
import { SVG_FONT_FAMILY } from "../../lib/svgFont";
import CheckMark from "./CheckMark";
import { useDropdownMenu } from "./DropdownMenuContext";
import MenuLink from "./MenuLink";
import MenuListItem from "./MenuListItem";
import { useMenuParent } from "./MenuParentContext";

const FileMenu = () => {
  const context = useDropdownMenu();
  const parentContext = useMenuParent();
  const foregroundColor = useAppSelector(selectForegroundColor);
  const backgroundColor = useAppSelector(selectBackgroundColor);
  const highlightColor = useAppSelector(selectHighlightColor);
  const scale = useAppSelector(selectScale);

  const downloadPDF = () => {
    const config: ResumeConfig = {
      foregroundColor: new Color(foregroundColor),
      backgroundColor: new Color(backgroundColor),
      highlightColor: new Color(highlightColor),
    };
    const resumeFactory = new PdfResumeFactory(config, resume);
    const pdfResume = resumeFactory.getResume();
    pdfResume.save("dan.sullivan.resume.pdf");
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
  };

  const downloadSVG = async () => {
    let fontDataUrl: string | null = null;
    try {
      await document.fonts.load(`400 12pt ${SVG_FONT_FAMILY}`);
      const fontResponse = await fetch("/fonts/Arimo.woff2");
      if (!fontResponse.ok) throw new Error("Could not load SVG font");
      const fontBlob = await fontResponse.blob();
      fontDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(fontBlob);
      });
    } catch {
      // The download still works offline using the original system font.
    }
    const config: ResumeConfig = {
      foregroundColor: Color(foregroundColor),
      backgroundColor: Color(backgroundColor),
      highlightColor: Color(highlightColor),
    };
    const resumeFactory = new SvgResumeFactory(
      config,
      resume,
      false,
      0,
      false,
      fontDataUrl ? SVG_FONT_FAMILY : resumeConfiguration.fontFamily,
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
    context.setIsActive(false);
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
  };

  return (
    <ul>
      <MenuListItem
        id="downloadPdfMenuOption"
        onClick={downloadPDF}
        scale={scale}
      >
        <CheckMark $isActive={false} />
        <MenuLink>Download PDF</MenuLink>
      </MenuListItem>
      <MenuListItem
        id="downloadSvgMenuOption"
        onClick={downloadSVG}
        scale={scale}
      >
        <CheckMark $isActive={false} />
        <MenuLink>Download SVG</MenuLink>
      </MenuListItem>
    </ul>
  );
};
export default FileMenu;
