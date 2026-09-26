import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Color from "color";
import { registerFont } from "canvas";
import { JSDOM } from "jsdom";

import { resumeConfiguration } from "../../configuration";
import { resume } from "../resume";
import { SVG_FONT_FAMILY } from "../svgFont";
import SvgResumeFactory from "../svgResumeFactory";

registerFont(resolve("lib/assets/Arimo.ttf"), { family: SVG_FONT_FAMILY });
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
globalThis.document = dom.window.document;

const {
  darkForegroundColor,
  darkBackgroundColor,
  darkHighlightColor,
  documentWidth,
  documentHeight,
  pixelsPerPoint,
  units,
} = resumeConfiguration;

const factory = new SvgResumeFactory(
  {
    foregroundColor: Color(darkForegroundColor),
    backgroundColor: Color(darkBackgroundColor),
    highlightColor: Color(darkHighlightColor),
  },
  resume,
  false,
  0,
  true,
);

const svg = factory.getResume();
const title = dom.window.document.createElementNS(
  "http://www.w3.org/2000/svg",
  "title",
);
title.textContent = "Dan Sullivan résumé";
svg.prepend(title);
svg.setAttribute("class", "svg desktop-svg");
svg.setAttribute("width", `${documentWidth * 1.5}${units}`);
svg.setAttribute("height", `${documentHeight * 1.5}${units}`);
svg.setAttribute(
  "viewBox",
  `0 0 ${documentWidth / pixelsPerPoint} ${documentHeight / pixelsPerPoint}`,
);
svg.setAttribute("preserveAspectRatio", "none");

const outputDirectory = resolve(".generated");
await mkdir(outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "desktop.svg"), svg.outerHTML);
dom.window.close();
