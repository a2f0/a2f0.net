import type Color from "color";

import { resumeConfiguration } from "../configuration";
import type { Resume } from "./resume";
import type { ResumeConfig } from "./resumeConfig";
import ResumeFactory from "./resumeFactory";
const { units } = resumeConfiguration;

export default class SvgResumeFactory extends ResumeFactory {
  encodedResume: SVGElement;

  constructor(
    config: ResumeConfig,
    resume: Resume,
    isMobile = false,
    mobileDocumentWidthPt = 0,
  ) {
    super(config, resume, isMobile, mobileDocumentWidthPt);
    this.encodedResume = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    this.encodedResume.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    this.encodedResume.setAttribute("id", "svgResume");
    this.populateResume();
  }

  protected addRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: ReturnType<typeof Color>,
    id: string,
  ) {
    const rectToAdd = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    );
    rectToAdd.style.fill = color.hex();
    rectToAdd.setAttribute("x", x + units);
    rectToAdd.setAttribute("y", y + units);
    rectToAdd.setAttribute("width", width + units);
    rectToAdd.setAttribute("height", height + units);
    rectToAdd.setAttribute("stroke", color.hex());
    rectToAdd.setAttribute("id", id);
    this.encodedResume.appendChild(rectToAdd);
  }

  protected addText(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string,
    id: string,
  ) {
    const textToAdd = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    textToAdd.setAttribute("x", x + units);
    textToAdd.setAttribute("y", y + units);
    textToAdd.setAttribute("font-size", fontSize + units);
    textToAdd.setAttribute("font-family", fontFamily);
    textToAdd.setAttribute("fill", color.hex());
    textToAdd.setAttribute("dominant-baseline", "middle");
    // Keep leading spaces in chunked line fragments from collapsing
    textToAdd.style.whiteSpace = "pre";
    textToAdd.setAttribute("id", id);
    textToAdd.innerHTML = text;
    this.encodedResume.appendChild(textToAdd);
  }

  protected addTextWithLink(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string,
    url: string,
    id: string,
  ) {
    const linkToAdd = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "a",
    );
    linkToAdd.setAttribute("href", url);

    const textToAdd = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    textToAdd.setAttribute("x", x + units);
    textToAdd.setAttribute("y", y + units);
    textToAdd.setAttribute("font-size", fontSize + units);
    textToAdd.setAttribute("font-family", fontFamily);
    textToAdd.setAttribute("fill", color.hex());
    textToAdd.setAttribute("dominant-baseline", "middle");
    textToAdd.style.whiteSpace = "pre";
    textToAdd.setAttribute("class", "hoverable");
    textToAdd.innerHTML = text;
    textToAdd.setAttribute("id", id);
    linkToAdd.appendChild(textToAdd);
    this.encodedResume.appendChild(linkToAdd);
  }

  protected addCircle(
    x: number,
    y: number,
    radius: number,
    color: ReturnType<typeof Color>,
    id: string,
  ) {
    const circleToAdd = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    circleToAdd.setAttribute("cx", x + units);
    circleToAdd.setAttribute("cy", y + units);
    circleToAdd.setAttribute("r", radius + units);
    circleToAdd.setAttribute("fill", color.hex());
    circleToAdd.setAttribute("id", id);
    this.encodedResume.appendChild(circleToAdd);
  }

  protected addLine(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    color: ReturnType<typeof Color>,
    id: string,
  ) {
    const lineToAdd = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line",
    );
    lineToAdd.setAttribute("x1", x1 + units);
    lineToAdd.setAttribute("x2", x2 + units);
    lineToAdd.setAttribute("y1", y1 + units);
    lineToAdd.setAttribute("y2", y2 + units);
    lineToAdd.setAttribute("stroke-width", `.75${units}`);
    lineToAdd.setAttribute("stroke", color.hex());
    lineToAdd.setAttribute("id", id);
    this.encodedResume.appendChild(lineToAdd);
  }

  public getResume(): SVGElement {
    return this.encodedResume;
  }

  public getContentHeight(): number {
    return this.contentBottomY;
  }
}
