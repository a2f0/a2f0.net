import { resumeConfiguration } from "@a2f0/shared/configuration";
import { downloadPdf, downloadSvg } from "@a2f0/shared/downloads";
import resume from "@a2f0/shared/resume.json";
import type { ResumeColors } from "@a2f0/shared/resumeConfig";
import {
  useCurrentWindow,
  useWindowFileMenuItem,
  useWindowViewMenuItem,
} from "@tearleads/windowing";

import { checked, EM_SPACE } from "../shared/menuLabels";

const {
  darkForegroundColor,
  darkBackgroundColor,
  darkHighlightColor,
  lightForegroundColor,
  lightBackgroundColor,
  lightHighlightColor,
} = resumeConfiguration;

export const DARK: ResumeColors = {
  foregroundColor: darkForegroundColor,
  backgroundColor: darkBackgroundColor,
  highlightColor: darkHighlightColor,
};

const LIGHT: ResumeColors = {
  foregroundColor: lightForegroundColor,
  backgroundColor: lightBackgroundColor,
  highlightColor: lightHighlightColor,
};

export const isDarkTheme = (colors: ResumeColors) =>
  colors.foregroundColor === darkForegroundColor;

/** The resume's File menu downloads and its View menu theme and scale. */
export function useResumeMenus(
  colors: ResumeColors,
  setColors: (colors: ResumeColors) => void,
  scale: number,
  setScale: (scale: number) => void,
) {
  const showStatusMessage = useCurrentWindow()?.showStatusMessage;
  const isDark = isDarkTheme(colors);

  useWindowFileMenuItem({
    id: "download-pdf",
    label: "Download PDF",
    priority: 20,
    onClick: () => {
      downloadPdf(colors);
      showStatusMessage?.("Downloaded PDF");
    },
  });
  useWindowFileMenuItem({
    id: "download-svg",
    label: "Download SVG",
    priority: 10,
    onClick: async () => {
      await downloadSvg(colors);
      showStatusMessage?.("Downloaded SVG");
    },
  });

  useWindowViewMenuItem({
    id: "theme-dark",
    label: checked(isDark, "Dark Theme"),
    priority: 60,
    onClick: () => setColors(DARK),
  });
  useWindowViewMenuItem({
    id: "theme-light",
    label: checked(!isDark, "Light Theme"),
    priority: 50,
    onClick: () => setColors(LIGHT),
  });
  useWindowViewMenuItem({
    id: "scale-150",
    label: checked(scale === 1.5, "150%"),
    priority: 40,
    onClick: () => setScale(1.5),
  });
  useWindowViewMenuItem({
    id: "scale-125",
    label: checked(scale === 1.25, "125%"),
    priority: 30,
    onClick: () => setScale(1.25),
  });
  useWindowViewMenuItem({
    id: "scale-100",
    label: checked(scale === 1, "Real Size"),
    priority: 20,
    onClick: () => setScale(1),
  });
  useWindowViewMenuItem({
    id: "source-code",
    label: `${EM_SPACE} Source Code`,
    priority: 10,
    onClick: () => window.open(resume.url, "_blank", "noopener,noreferrer"),
  });
}
