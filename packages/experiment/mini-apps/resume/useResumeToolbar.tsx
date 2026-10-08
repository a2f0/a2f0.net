import { downloadPdf, downloadSvg } from "@a2f0/shared/downloads";
import { printResume } from "@a2f0/shared/print";
import type { ResumeColors } from "@a2f0/shared/resumeConfig";
import { FilePdfIcon } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileSvgIcon } from "@phosphor-icons/react/dist/csr/FileSvg";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { PrinterIcon } from "@phosphor-icons/react/dist/csr/Printer";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import {
  useRoutedLayoutActive,
  useWindowTitleBarAction,
} from "@tearleads/windowing";
import { useMemo } from "react";

import { DARK, isDarkTheme, LIGHT } from "./useResumeMenus";

// Stable icon elements, so an unchanged action matches its registration
// across renders (the window compares the fields with Object.is).
const SUN_ICON = <SunIcon aria-hidden size={18} />;
const MOON_ICON = <MoonIcon aria-hidden size={18} />;
const PDF_ICON = <FilePdfIcon aria-hidden size={18} />;
const SVG_ICON = <FileSvgIcon aria-hidden size={18} />;
const PRINT_ICON = <PrinterIcon aria-hidden size={18} />;

/**
 * The resume's actions in the routed shell's toolbar, which has no menu bar:
 * the theme, then the downloads and printing from the File menu. The desktop
 * window keeps them in its menus alone.
 */
export function useResumeToolbar(
  colors: ResumeColors,
  setColors: (colors: ResumeColors) => void,
) {
  const routed = useRoutedLayoutActive();
  const isDark = isDarkTheme(colors);

  useWindowTitleBarAction(
    useMemo(
      () =>
        routed
          ? {
              icon: isDark ? SUN_ICON : MOON_ICON,
              id: "theme",
              label: isDark ? "Light Theme" : "Dark Theme",
              onClick: () => setColors(isDark ? LIGHT : DARK),
              priority: 40,
            }
          : null,
      [isDark, routed, setColors],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () =>
        routed
          ? {
              icon: PDF_ICON,
              id: "download-pdf",
              label: "Download PDF",
              onClick: () => downloadPdf(colors),
              priority: 30,
            }
          : null,
      [colors, routed],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () =>
        routed
          ? {
              icon: SVG_ICON,
              id: "download-svg",
              label: "Download SVG",
              onClick: () => downloadSvg(colors),
              priority: 20,
            }
          : null,
      [colors, routed],
    ),
  );
  useWindowTitleBarAction(
    useMemo(
      () =>
        routed
          ? {
              icon: PRINT_ICON,
              id: "print",
              label: "Print",
              onClick: printResume,
              priority: 10,
            }
          : null,
      [routed],
    ),
  );
}
