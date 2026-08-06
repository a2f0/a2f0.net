import Color from "color";
import invariant from "invariant";

import { resumeConfiguration as config } from "../configuration";
import type { Resume } from "./resume";
import type { ResumeConfig } from "./resumeConfig";
import {
  breakLinesIntoChunks,
  type ChunkedLine,
  extractLinks,
} from "./textUtils";
import { getFontString, getTextWidthInPoints, wrapLabel } from "./textUtils";

// Mobile layout x positions (in points).
const MOBILE_LEFT_MARGIN = 5;
const MOBILE_BULLET_X = 10;
const MOBILE_TEXT_X = 17;

export default abstract class ResumeFactory {
  foregroundColor: ReturnType<typeof Color>;
  backgroundColor: ReturnType<typeof Color>;
  highlightColor: ReturnType<typeof Color>;
  resume: Resume;
  isMobile: boolean;
  mobileDocumentWidthPt: number;
  contentBottomY: number = 0;

  constructor(config: ResumeConfig, resume: Resume, isMobile: boolean = false, mobileDocumentWidthPt: number = 0) {
    this.foregroundColor = new Color(config.foregroundColor);
    this.backgroundColor = new Color(config.backgroundColor);
    this.highlightColor = new Color(config.highlightColor);
    this.resume = resume;
    this.isMobile = isMobile;
    this.mobileDocumentWidthPt = mobileDocumentWidthPt;
  }
  protected abstract addCircle(
    x: number,
    y: number,
    radius: number,
    color: ReturnType<typeof Color>,
    id: string,
  ): void;
  protected abstract addRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: ReturnType<typeof Color>,
    id: string,
  ): void;
  protected abstract addText(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string,
    id: string,
  ): void;
  protected abstract addTextWithLink(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string,
    url: string,
    id: string,
  ): void;
  protected abstract addLine(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    color: ReturnType<typeof Color>,
    id: string,
  ): void;

  // Usable text width on mobile for a block starting at xPos.
  protected mobileContentWidth(xPos: number): number {
    return this.mobileDocumentWidthPt - xPos - config.rightPanelMargin;
  }

  // Renders wrapped lines, flowing each chunk after the previous one so lines
  // containing links keep their text and link segments in sequence. Returns
  // the y position following the last line.
  protected renderChunkedLines(
    lines: ChunkedLine[],
    xPos: number,
    yPos: number,
    fontSize: number,
    fontWeight: number,
    lineSpacing: number,
    idPrefix: string,
  ): number {
    const font = getFontString(
      fontWeight,
      fontSize,
      config.units,
      config.fontFamily,
    );
    let currentYPos = yPos;
    for (let k = 0; k < lines.length; k++) {
      let currentXPos = xPos;
      for (const chunk of lines[k].chunks) {
        if (chunk.isMatch) {
          invariant(chunk.url, "Expected a url for a match");
          this.addTextWithLink(
            currentXPos,
            currentYPos,
            fontSize,
            config.fontFamily,
            this.foregroundColor,
            chunk.text,
            chunk.url,
            `${idPrefix}-${k}`,
          );
        } else {
          this.addText(
            currentXPos,
            currentYPos,
            fontSize,
            config.fontFamily,
            this.foregroundColor,
            chunk.text,
            `${idPrefix}-${k}`,
          );
        }
        currentXPos += getTextWidthInPoints(chunk.text, font);
      }
      currentYPos += fontSize;
      if (k < lines.length - 1) {
        currentYPos += lineSpacing;
      }
    }
    return currentYPos;
  }

  protected populateResume() {
    // Left panel - hide on mobile
    if (!this.isMobile) {
      this.addRect(
        config.leftPanelPos.x,
        config.leftPanelPos.y,
        config.leftPanelWidth,
        config.documentHeight,
        this.backgroundColor,
        "leftPartition",
      );
    }

    // Right panel - full width on mobile
    const rightPanelX = this.isMobile ? 0 : config.rightPanelPos.x;
    const rightPanelWidth = this.isMobile ? this.mobileDocumentWidthPt : config.rightPanelWidth;

    this.addRect(
      rightPanelX,
      config.rightPanelPos.y,
      rightPanelWidth,
      this.isMobile ? config.documentHeight * 3 : config.documentHeight,
      this.backgroundColor,
      "rightPartition",
    );

    // Name - position changes on mobile (above Experience on mobile)
    const nameXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.namePos.x;
    const nameYPos = this.isMobile
      ? 13  // 5px top clearance + half of 15pt font size
      : config.nameYPosMiddle;

    this.addText(
      nameXPos,
      nameYPos,
      config.nameSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.firstName,
      "firstName",
    );

    const firstNameWidthInPoints = getTextWidthInPoints(
      this.resume.firstName,
      getFontString(
        config.nameWeight,
        config.nameSize,
        config.units,
        config.fontFamily,
      ),
    );
    this.addText(
      nameXPos + firstNameWidthInPoints,
      nameYPos,
      config.nameSize,
      config.fontFamily,
      this.highlightColor,
      this.resume.lastName,
      "lastName",
    );

    // Address - position changes on mobile (above Experience, below Name on mobile)
    const addressXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.addressPos.x;
    const addressYPos = this.isMobile
      ? nameYPos + config.nameSize / 2 + config.addressSize / 2
      : config.addressYPosMiddle;

    this.addText(
      addressXPos,
      addressYPos,
      config.addressSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.cityState,
      "addressLine",
    );

    // Vertical divider - hide on mobile
    if (!this.isMobile) {
      this.addLine(
        config.verticalDividerPos.x,
        config.verticalDividerPos.x,
        config.verticalDividerPos.y,
        config.verticalDividerPos.y + config.verticalDividerHeight,
        this.highlightColor,
        "verticalDivider",
      );
    }

    // Horizontal line - position under address on mobile
    const lineYPos = this.isMobile
      ? addressYPos + config.addressSize / 2 + config.addressLineSpacing
      : config.addressLineYPos;
    // On mobile, extend line from left edge
    const lineX1 = this.isMobile ? MOBILE_LEFT_MARGIN : config.addressLineX1;
    const lineX2 = this.isMobile
      ? MOBILE_LEFT_MARGIN + config.addressLineWidth
      : config.addressLineX1 + config.addressLineWidth;

    this.addLine(
      lineX1,
      lineX2,
      lineYPos,
      lineYPos,
      this.highlightColor,
      "addressSeparator",
    );

    // Phone number - position on right panel on mobile (with extra spacing after line)
    const phoneXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.phoneNumberPos.x;
    const phoneYPos = this.isMobile
      ? lineYPos + config.addressLineSpacing * 2
      : config.phoneNumberPos.y;

    this.addTextWithLink(
      phoneXPos,
      phoneYPos,
      config.phoneNumberSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.phoneNumber.number,
      this.resume.phoneNumber.uri,
      "phoneNumber",
    );

    // Email - position on right panel on mobile
    const emailXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.emailPos.x;
    const emailYPos = this.isMobile
      ? phoneYPos + config.phoneNumberSize / 2 + config.emailSize / 2
      : config.emailPos.y;

    this.addTextWithLink(
      emailXPos,
      emailYPos,
      config.emailSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.email.email,
      this.resume.email.uri,
      "emailAddress",
    );

    // Experience header - adjust Y position on mobile to make room for contact info above
    const experienceHeaderYPos = this.isMobile
      ? emailYPos + config.emailSize + config.headerSpacing * 2
      : config.experienceHeaderYPos;

    const experienceHeaderXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.experienceHeaderXPos;
    this.addText(
      experienceHeaderXPos,
      experienceHeaderYPos,
      config.experienceHeaderSize,
      config.fontFamily,
      this.highlightColor,
      config.experienceHeader,
      "experienceHeader",
    );

    // Experience
    let currentPositionYPos = this.isMobile
      ? experienceHeaderYPos + config.positionTitleSize + config.headerSpacing
      : config.positionTitleYPosStart;
    const hyphenWidth = getTextWidthInPoints(
      "-",
      getFontString(
        config.positionTitleWeight,
        config.positionTitleSize,
        config.units,
        config.fontFamily,
      ),
    );

    // Individual Positions
    for (let i = 0; i < this.resume.experience.length; i++) {
      const position = this.resume.experience[i];

      let accomplishmentYPos: number;
      if (this.isMobile) {
        // On mobile, title, company and location flow as one wrapped
        // paragraph, with the date range on its own line below.
        const positionHeaderFont = getFontString(
          config.positionTitleWeight,
          config.positionTitleSize,
          config.units,
          config.fontFamily,
        );
        const positionHeaderLines = wrapLabel(
          `${position.title} - ${position.company} - ${position.location}`,
          this.mobileContentWidth(MOBILE_LEFT_MARGIN),
          positionHeaderFont,
        );
        const positionDateRangeYPos = this.renderChunkedLines(
          positionHeaderLines,
          MOBILE_LEFT_MARGIN,
          currentPositionYPos,
          config.positionTitleSize,
          config.positionTitleWeight,
          0,
          `positionHeader-${i}`,
        );
        this.addText(
          MOBILE_LEFT_MARGIN,
          positionDateRangeYPos,
          config.positionTitleSize,
          config.fontFamily,
          this.foregroundColor,
          position.date_range,
          `positionDateRange-${i}`,
        );
        accomplishmentYPos =
          positionDateRangeYPos +
          config.positionTitleSize +
          config.positionAccomplishmentHeaderSpacing;
      } else {
        this.addCircle(
          config.verticalDividerPos.x,
          currentPositionYPos,
          config.positionBulletRadius,
          this.highlightColor,
          `positionBulletPoint-${i}`,
        );

        this.addText(
          config.positionTitleXPos,
          currentPositionYPos,
          config.positionTitleSize,
          config.fontFamily,
          this.foregroundColor,
          position.title,
          `positionTitle-${i}`,
        );
        const titleWidth = getTextWidthInPoints(
          position.title,
          getFontString(
            config.positionTitleWeight,
            config.positionTitleSize,
            config.units,
            config.fontFamily,
          ),
        );

        // Position Date Range, on the left side at the same Y as the title
        const positionDateRangeWidth = getTextWidthInPoints(
          position.date_range,
          getFontString(
            config.positionDateRangeWeight,
            config.positionDateRangeSize,
            config.units,
            config.fontFamily,
          ),
        );
        this.addText(
          config.verticalDividerPos.x -
            config.centerBulletMargin -
            positionDateRangeWidth,
          currentPositionYPos,
          config.positionTitleSize,
          config.fontFamily,
          this.foregroundColor,
          position.date_range,
          `positionDateRange-${i}`,
        );

        // Hyphen After Title
        const hyphen1XPos =
          config.positionTitleXPos + titleWidth + config.hyphenSpacing;
        this.addText(
          hyphen1XPos,
          currentPositionYPos,
          config.positionTitleSize,
          config.fontFamily,
          this.foregroundColor,
          "-",
          `hyphenAfterTitle-${i}`,
        );
        const companyNameXPos = hyphen1XPos + hyphenWidth + config.hyphenSpacing;
        const { matches, plainString } = extractLinks(position.company);
        const lineChunks = breakLinesIntoChunks([plainString], matches);
        invariant(lineChunks.length === 1, "Expected 1 line chunk");
        const chunkedLine = lineChunks[0];
        let currentXPos = companyNameXPos;
        for (const chunk of chunkedLine.chunks) {
          if (chunk.isMatch) {
            invariant(chunk.url, "Expected a url for a match");
            this.addTextWithLink(
              currentXPos,
              currentPositionYPos,
              config.positionTitleSize,
              config.fontFamily,
              this.foregroundColor,
              chunk.text,
              chunk.url,
              `positionCompanyName-${i}`,
            );
          } else {
            this.addText(
              currentXPos,
              currentPositionYPos,
              config.positionTitleSize,
              config.fontFamily,
              this.foregroundColor,
              chunk.text,
              `positionCompanyName-${i}`,
            );
          }
          currentXPos += getTextWidthInPoints(
            chunk.text,
            getFontString(
              config.positionTitleWeight,
              config.positionTitleSize,
              config.units,
              config.fontFamily,
            ),
          );
        }

        // Hyphen After Company Name
        const hyphen2XPos = currentXPos + config.hyphenSpacing;
        this.addText(
          hyphen2XPos,
          currentPositionYPos,
          config.positionTitleSize,
          config.fontFamily,
          this.foregroundColor,
          "-",
          `hyphenAfterCompanyName-${i}`,
        );
        const companyLocationXPos =
          hyphen2XPos + hyphenWidth + config.hyphenSpacing;

        // Company Location
        this.addText(
          companyLocationXPos,
          currentPositionYPos,
          config.positionTitleSize,
          config.fontFamily,
          this.foregroundColor,
          position.location,
          `positionCompanyLocation-${i}`,
        );

        accomplishmentYPos =
          currentPositionYPos +
          config.positionTitleSize +
          config.positionAccomplishmentHeaderSpacing;
      }

      // Accomplishments
      const accomplishmentFont = getFontString(
        config.positionAccomplishmentWeight,
        config.positionAccomplishmentSize,
        config.units,
        config.fontFamily,
      );

      for (let j = 0; j < position.accomplishments.length; j++) {
        const accomplishment = position.accomplishments[j];

        const accomplishmentBulletXPos = this.isMobile
          ? MOBILE_BULLET_X
          : config.positionAccomplishmentBulletXPos;

        this.addCircle(
          accomplishmentBulletXPos,
          accomplishmentYPos,
          config.positionAccomplishmentBulletRadius,
          this.foregroundColor,
          `accomplishmentBullet-${i}-${j}`,
        );

        const accomplishmentXPos = this.isMobile
          ? MOBILE_TEXT_X
          : config.positionAccomplishmentXPos;

        const accomplishmentMaxWidth = this.isMobile
          ? this.mobileContentWidth(MOBILE_TEXT_X)
          : config.positionAccomplishmentMaxWidth;
        const accomplishmentLines: ChunkedLine[] = wrapLabel(
          accomplishment,
          accomplishmentMaxWidth,
          accomplishmentFont,
        );
        accomplishmentYPos = this.renderChunkedLines(
          accomplishmentLines,
          accomplishmentXPos,
          accomplishmentYPos,
          config.positionAccomplishmentSize,
          config.positionAccomplishmentWeight,
          config.positionAccomplishmentLineSpacing,
          `positionAccomplishmentLine-${i}-${j}`,
        );
        if (j < position.accomplishments.length - 1) {
          // Then there is another accomplishment
          accomplishmentYPos += config.positionAccomplishmentSpacing;
        }
      }
      currentPositionYPos = accomplishmentYPos + config.positionVerticalSpacing;
    }

    // Education Header
    const educationHeaderYPos = currentPositionYPos + config.positionTitleSize;
    const educationHeaderXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.educationHeaderXPos;
    this.addText(
      educationHeaderXPos,
      educationHeaderYPos,
      config.educationHeaderSize,
      config.fontFamily,
      this.highlightColor,
      config.educationHeader,
      "educationHeader",
    );

    let educationYPos =
      educationHeaderYPos + config.headerSpacing + config.educationSize;
    for (let m = 0; m < this.resume.education.length; m++) {
      const education = this.resume.education[m];

      // Education bullet points - hide on mobile
      if (!this.isMobile) {
        this.addCircle(
          config.verticalDividerPos.x,
          educationYPos,
          config.positionBulletRadius,
          this.highlightColor,
          `educationBullet-${m}`,
        );
      }

      // Education Institution
      const educationXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.educationXPos;
      this.addTextWithLink(
        educationXPos,
        educationYPos,
        config.educationSize,
        config.fontFamily,
        this.foregroundColor,
        education.institution,
        education.url,
        `educationInstitution-${m}`,
      );

      // Education Degree
      educationYPos += config.educationSize;
      if (this.isMobile) {
        // Long credentials wrap on mobile
        const educationFont = getFontString(
          config.educationWeight,
          config.educationSize,
          config.units,
          config.fontFamily,
        );
        const credentialLines = wrapLabel(
          education.credential,
          this.mobileContentWidth(MOBILE_LEFT_MARGIN),
          educationFont,
        );
        educationYPos = this.renderChunkedLines(
          credentialLines,
          educationXPos,
          educationYPos,
          config.educationSize,
          config.educationWeight,
          0,
          `educationDegree-${m}`,
        );
        educationYPos += config.educationVerticalSpacing;
      } else {
        this.addText(
          educationXPos,
          educationYPos,
          config.educationSize,
          config.fontFamily,
          this.foregroundColor,
          education.credential,
          `educationDegree-${m}`,
        );
        educationYPos += config.educationVerticalSpacing + config.addressSize;
      }
    }

    // Internet Presences - on mobile, position below Education dynamically
    const internetPresencesXPos = this.isMobile ? MOBILE_LEFT_MARGIN : config.namePos.x;
    const internetPresencesHeaderYPos = this.isMobile
      ? educationYPos + config.positionVerticalSpacing
      : config.internetPresencesHeaderYPos;

    // Internet
    this.addText(
      internetPresencesXPos,
      internetPresencesHeaderYPos,
      config.internetPresencesHeaderSize,
      config.fontFamily,
      this.highlightColor,
      "WEB",
      "WebLabel",
    );

    // Presences
    const interenetWidthInPoints = getTextWidthInPoints(
      "WEB",
      getFontString(
        config.nameWeight,
        config.internetPresencesHeaderSize,
        config.units,
        config.fontFamily,
      ),
    );
    this.addText(
      internetPresencesXPos + interenetWidthInPoints,
      internetPresencesHeaderYPos,
      config.internetPresencesHeaderSize,
      config.fontFamily,
      this.foregroundColor,
      "PRESENCES",
      "PresencesLabel",
    );

    // Internet Presences Separator - hide on mobile
    if (!this.isMobile) {
      this.addLine(
        config.verticalDividerPos.x,
        config.verticalDividerPos.x - config.internetPresencesLineWidth,
        config.internetPresencesLineYPos,
        config.internetPresencesLineYPos,
        this.highlightColor,
        "internetPresencesSeparator",
      );
    }

    const internetPresencesLineYPos = this.isMobile
      ? internetPresencesHeaderYPos +
        config.internetPresencesHeaderSize / 2 +
        config.internetPresencesLineSpacing
      : config.internetPresencesLineYPos;
    let internetPresenceYPos = this.isMobile
      ? internetPresencesLineYPos + config.internetPresencesLineSpacing
      : config.internetPresencesYPos;
    for (let n = 0; n < this.resume.internetPresences.length; n++) {
      const internetPresence = this.resume.internetPresences[n];
      const wihoutUrlPrefix = internetPresence.split("//")[1];
      // URL
      this.addTextWithLink(
        internetPresencesXPos,
        internetPresenceYPos,
        config.internetPresencesSize,
        config.fontFamily,
        this.foregroundColor,
        wihoutUrlPrefix,
        internetPresence,
        `internetPresences-${n}`,
      );
      internetPresenceYPos += config.internetPresencesSize;
    }

    this.contentBottomY = internetPresenceYPos;
  }
}
