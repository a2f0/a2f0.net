import type Color from 'color';
import {jsPDF, type jsPDFOptions, type TextOptionsLight} from 'jspdf';

import {resumeConfiguration} from '../configuration';
import type {Resume} from './resume';
import type {ResumeConfig} from './resumeConfig';
import ResumeFactory from './resumeFactory';

const {units} = resumeConfiguration;

export default class PdfResumeFactory extends ResumeFactory {
  encodedResume: jsPDF;

  constructor(config: ResumeConfig, resume: Resume) {
    super(config, resume);
    const options: jsPDFOptions = {
      orientation: 'portrait',
      unit: units,
      format: 'letter',
    };
    this.encodedResume = new jsPDF(options);
    this.populateResume();
  }

  protected addRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: ReturnType<typeof Color>
  ) {
    this.encodedResume.setFillColor(color.hex());
    this.encodedResume.setDrawColor(color.hex());
    this.encodedResume.rect(x, y, width, height, 'FD');
  }

  protected addText(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string
  ) {
    this.encodedResume.setFont(fontFamily);
    this.encodedResume.setFontSize(fontSize);
    this.encodedResume.setTextColor(color.hex());
    const options: TextOptionsLight = {baseline: 'middle'};
    this.encodedResume.text(text, x, y, options);
  }

  protected addTextWithLink(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string,
    url: string
  ) {
    this.encodedResume.setFont(fontFamily);
    this.encodedResume.setFontSize(fontSize);
    this.encodedResume.setTextColor(color.hex());
    const options: TextOptionsLight = {baseline: 'middle'};
    this.encodedResume.text(text, x, y, options);
    const dimensions = this.encodedResume.getTextDimensions(text);
    const halfFontHeight = fontSize / 2;
    this.encodedResume.link(x, y - halfFontHeight, dimensions.w, dimensions.h, {
      url: url,
    });
  }

  protected addLine(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    color: ReturnType<typeof Color>
  ) {
    this.encodedResume.setLineWidth(0.75);
    this.encodedResume.setDrawColor(color.hex());
    this.encodedResume.line(x1, y1, x2, y2);
  }

  protected addCircle(
    x: number,
    y: number,
    radius: number,
    color: ReturnType<typeof Color>
  ) {
    this.encodedResume.setFillColor(color.hex());
    this.encodedResume.circle(x, y, radius, 'F');
  }

  public getResume(): jsPDF {
    return this.encodedResume;
  }
}
