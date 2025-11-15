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

export default abstract class ResumeFactory {
  foregroundColor: ReturnType<typeof Color>;
  backgroundColor: ReturnType<typeof Color>;
  highlightColor: ReturnType<typeof Color>;
  resume: Resume;
  isMobile: boolean;

  constructor(config: ResumeConfig, resume: Resume, isMobile: boolean = false) {
    this.foregroundColor = new Color(config.foregroundColor);
    this.backgroundColor = new Color(config.backgroundColor);
    this.highlightColor = new Color(config.highlightColor);
    this.resume = resume;
    this.isMobile = isMobile;
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
    const rightPanelWidth = this.isMobile ? config.documentWidth : config.rightPanelWidth;

    this.addRect(
      rightPanelX,
      config.rightPanelPos.y,
      rightPanelWidth,
      config.documentHeight,
      this.backgroundColor,
      "rightPartition",
    );

    // Name - position changes on mobile (above Experience on mobile)
    const nameXPos = this.isMobile ? config.startX : config.namePos.x;
    const nameYPos = this.isMobile
      ? config.experienceHeaderYPos - config.nameSize - config.headerSpacing - config.addressSize - 4
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
    const addressXPos = this.isMobile ? config.startX : config.addressPos.x;
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
    const lineX1 = this.isMobile ? config.startX : config.addressLineX1;
    const lineX2 = this.isMobile
      ? config.startX + config.addressLineWidth
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
    const phoneXPos = this.isMobile ? config.startX : config.phoneNumberPos.x;
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
    const emailXPos = this.isMobile ? config.startX : config.emailPos.x;
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

    const experienceHeaderXPos = this.isMobile ? config.startX : config.experienceHeaderXPos;
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

      // Position bullet points - hide on mobile
      if (!this.isMobile) {
        this.addCircle(
          config.verticalDividerPos.x,
          currentPositionYPos,
          config.positionBulletRadius,
          this.highlightColor,
          `positionBulletPoint-${i}`,
        );
      }

      const positionTitleXPos = this.isMobile ? config.startX : config.positionTitleXPos;
      this.addText(
        positionTitleXPos,
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

      // Position Date Range
      const positionDateRangeWidth = getTextWidthInPoints(
        position.date_range,
        getFontString(
          config.positionDateRangeWeight,
          config.positionDateRangeSize,
          config.units,
          config.fontFamily,
        ),
      );
      let positionDateRangeXPos: number;
      let positionDateRangeYPos: number;

      if (this.isMobile) {
        // On mobile, place date below title at left edge
        positionDateRangeXPos = positionTitleXPos;
        positionDateRangeYPos = currentPositionYPos + config.positionTitleSize;
      } else {
        // On desktop, place date on left side at same Y position as title
        positionDateRangeXPos =
          config.verticalDividerPos.x -
          config.centerBulletMargin -
          positionDateRangeWidth;
        positionDateRangeYPos = currentPositionYPos;
      }

      this.addText(
        positionDateRangeXPos,
        positionDateRangeYPos,
        config.positionTitleSize,
        config.fontFamily,
        this.foregroundColor,
        position.date_range,
        `positionDateRange-${i}`,
      );

      // Hyphen After Title (hidden on mobile)
      let companyNameXPos: number;
      if (!this.isMobile) {
        const hyphen1XPos =
          positionTitleXPos + titleWidth + config.hyphenSpacing;
        this.addText(
          hyphen1XPos,
          currentPositionYPos,
          config.positionTitleSize,
          config.fontFamily,
          this.foregroundColor,
          "-",
          `hyphenAfterTitle-${i}`,
        );
        companyNameXPos = hyphen1XPos + hyphenWidth + config.hyphenSpacing;
      } else {
        // On mobile, place company name directly after title with just a space
        companyNameXPos = positionTitleXPos + titleWidth + config.hyphenSpacing;
      }
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

      // Hyphen After Company Name (hidden on mobile)
      let companyLocationXPos: number;
      if (!this.isMobile) {
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
        companyLocationXPos = hyphen2XPos + hyphenWidth + config.hyphenSpacing;
      } else {
        // On mobile, place location directly after company with just a space
        companyLocationXPos = currentXPos + config.hyphenSpacing;
      }

      // Company Location
      this.addText(
        companyLocationXPos,
        currentPositionYPos,
        config.positionTitleSize,
        config.fontFamily,
        this.foregroundColor,
        position.location,
        "positionCompanyLocation-",
      );

      // Accomplishments
      let accomplishmentYPos =
        currentPositionYPos +
        config.positionTitleSize +
        config.positionAccomplishmentHeaderSpacing;

      // On mobile, add extra spacing to account for date being on a separate line
      if (this.isMobile) {
        accomplishmentYPos += config.positionTitleSize;
      }
      const accomplishmentFont = getFontString(
        config.positionAccomplishmentWeight,
        config.positionAccomplishmentSize,
        config.units,
        config.fontFamily,
      );

      for (let j = 0; j < position.accomplishments.length; j++) {
        const accomplishment = position.accomplishments[j];

        // Accomplishment bullet - position on mobile
        const accomplishmentBulletXPos = this.isMobile
          ? config.startX + 5
          : config.positionAccomplishmentBulletXPos;

        this.addCircle(
          accomplishmentBulletXPos,
          accomplishmentYPos,
          config.positionAccomplishmentBulletRadius,
          this.foregroundColor,
          `accomplishmentBullet-${i}-${j}`,
        );

        // Accomplishment text - adjust position on mobile
        const accomplishmentXPos = this.isMobile
          ? config.startX + 12  // Position after bullet on mobile
          : config.positionAccomplishmentXPos;

        const accomplishmentLines: ChunkedLine[] = wrapLabel(
          accomplishment,
          config.positionAccomplishmentMaxWidth,
          accomplishmentFont,
        );
        for (let k = 0; k < accomplishmentLines.length; k++) {
          const chunkedLine: ChunkedLine = accomplishmentLines[k];
          for (const chunk of chunkedLine.chunks) {
            this.addText(
              accomplishmentXPos,
              accomplishmentYPos,
              config.positionAccomplishmentSize,
              config.fontFamily,
              this.foregroundColor,
              chunk.text,
              `positionAccomplishmentLine-${i}-${j}-${k}`,
            );
          }
          accomplishmentYPos += config.positionAccomplishmentSize;
          if (k < accomplishmentLines.length - 1) {
            // Then it is not the last line in the accomplishment.
            // Add some vertical spacing for the next line.
            accomplishmentYPos += config.positionAccomplishmentLineSpacing;
          }
        }
        if (j < position.accomplishments.length - 1) {
          // Then there is another accomplishment
          accomplishmentYPos += config.positionAccomplishmentSpacing;
        }
      }
      currentPositionYPos = accomplishmentYPos + config.positionVerticalSpacing;
    }

    // Education Header
    const educationHeaderYPos = currentPositionYPos + config.positionTitleSize;
    const educationHeaderXPos = this.isMobile ? config.startX : config.educationHeaderXPos;
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
      const educationXPos = this.isMobile ? config.startX : config.educationXPos;
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

    // Internet
    this.addText(
      config.namePos.x,
      config.internetPresencesHeaderYPos,
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
      config.namePos.x + interenetWidthInPoints,
      config.internetPresencesHeaderYPos,
      config.internetPresencesHeaderSize,
      config.fontFamily,
      this.foregroundColor,
      "PRESENCES",
      "PresencesLabel",
    );

    // Internet Presences Separator
    this.addLine(
      config.verticalDividerPos.x,
      config.verticalDividerPos.x - config.internetPresencesLineWidth,
      config.internetPresencesLineYPos,
      config.internetPresencesLineYPos,
      this.highlightColor,
      "internetPresencesSeparator",
    );

    let internetPresenceYPos = config.internetPresencesYPos;
    for (let n = 0; n < this.resume.internetPresences.length; n++) {
      const internetPresence = this.resume.internetPresences[n];
      const wihoutUrlPrefix = internetPresence.split("//")[1];
      // URL
      this.addTextWithLink(
        config.namePos.x,
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
  }
}
