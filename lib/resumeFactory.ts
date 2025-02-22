import Color from 'color';
import invariant from 'invariant';

import {resumeConfiguration as config} from '../configuration';
import type {Resume} from './resume';
import type {ResumeConfig} from './resumeConfig';
import {breakLinesIntoChunks, type ChunkedLine, extractLinks} from './textUtils';
import {getFontString, getTextWidthInPoints, wrapLabel} from './textUtils';

export default abstract class ResumeFactory {
  foregroundColor: ReturnType<typeof Color>;
  backgroundColor: ReturnType<typeof Color>;
  highlightColor: ReturnType<typeof Color>;
  resume: Resume;

  constructor(config: ResumeConfig, resume: Resume) {
    this.foregroundColor = new Color(config.foregroundColor);
    this.backgroundColor = new Color(config.backgroundColor);
    this.highlightColor = new Color(config.highlightColor);
    this.resume = resume;
  }
  protected abstract addCircle(
    x: number,
    y: number,
    radius: number,
    color: ReturnType<typeof Color>,
    id: string
  ): void;
  protected abstract addRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: ReturnType<typeof Color>,
    id: string
  ): void;
  protected abstract addText(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string,
    id: string
  ): void;
  protected abstract addTextWithLink(
    x: number,
    y: number,
    fontSize: number,
    fontFamily: string,
    color: ReturnType<typeof Color>,
    text: string,
    url: string,
    id: string
  ): void;
  protected abstract addLine(
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    color: ReturnType<typeof Color>,
    id: string
  ): void;

  protected populateResume() {
    this.addRect(
      config.leftPanelPos.x,
      config.leftPanelPos.y,
      config.leftPanelWidth,
      config.documentHeight,
      this.backgroundColor,
      'leftPartition'
    );

    this.addRect(
      config.rightPanelPos.x,
      config.rightPanelPos.y,
      config.rightPanelWidth,
      config.documentHeight,
      this.backgroundColor,
      'rightPartition'
    );

    this.addText(
      config.namePos.x,
      config.nameYPosMiddle,
      config.nameSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.firstName,
      'firstName'
    );

    const firstNameWidthInPoints = getTextWidthInPoints(
      this.resume.firstName,
      getFontString(
        config.nameWeight,
        config.nameSize,
        config.units,
        config.fontFamily
      )
    );
    this.addText(
      config.namePos.x + firstNameWidthInPoints,
      config.nameYPosMiddle,
      config.nameSize,
      config.fontFamily,
      this.highlightColor,
      this.resume.lastName,
      'lastName'
    );

    this.addText(
      config.addressPos.x,
      config.addressYPosMiddle,
      config.addressSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.cityState,
      'addressLine'
    );

    this.addLine(
      config.verticalDividerPos.x,
      config.verticalDividerPos.x,
      config.verticalDividerPos.y,
      config.verticalDividerPos.y + config.verticalDividerHeight,
      this.highlightColor,
      'verticalDivider'
    );

    this.addLine(
      config.addressLineX1,
      config.addressLineX1 + config.addressLineWidth,
      config.addressLineYPos,
      config.addressLineYPos,
      this.highlightColor,
      'addressSeparator'
    );

    this.addTextWithLink(
      config.phoneNumberPos.x,
      config.phoneNumberPos.y,
      config.phoneNumberSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.phoneNumber.number,
      this.resume.phoneNumber.uri,
      'phoneNumber'
    );

    this.addTextWithLink(
      config.emailPos.x,
      config.emailPos.y,
      config.emailSize,
      config.fontFamily,
      this.foregroundColor,
      this.resume.email.email,
      this.resume.email.uri,
      'emailAddress'
    );

    this.addText(
      config.experienceHeaderXPos,
      config.experienceHeaderYPos,
      config.experienceHeaderSize,
      config.fontFamily,
      this.highlightColor,
      config.experienceHeader,
      'experienceHeader'
    );

    // Experience
    let currentPositionYPos = config.positionTitleYPosStart;
    const hyphenWidth = getTextWidthInPoints(
      '-',
      getFontString(
        config.positionTitleWeight,
        config.positionTitleSize,
        config.units,
        config.fontFamily
      )
    );

    // Individual Positions
    for (let i = 0; i < this.resume.experience.length; i++) {
      const position = this.resume.experience[i];

      this.addCircle(
        config.verticalDividerPos.x,
        currentPositionYPos,
        config.positionBulletRadius,
        this.highlightColor,
        `positionBulletPoint-${i}`
      );

      this.addText(
        config.positionTitleXPos,
        currentPositionYPos,
        config.positionTitleSize,
        config.fontFamily,
        this.foregroundColor,
        position.title,
        `positionTitle-${i}`
      );
      const titleWidth = getTextWidthInPoints(
        position.title,
        getFontString(
          config.positionTitleWeight,
          config.positionTitleSize,
          config.units,
          config.fontFamily
        )
      );

      // Position Date Range
      const positionDateRangeWidth = getTextWidthInPoints(
        position.date_range,
        getFontString(
          config.positionDateRangeWeight,
          config.positionDateRangeSize,
          config.units,
          config.fontFamily
        )
      );
      const positionDateRangeXPos =
        config.verticalDividerPos.x -
        config.centerBulletMargin -
        positionDateRangeWidth;
      this.addText(
        positionDateRangeXPos,
        currentPositionYPos,
        config.positionTitleSize,
        config.fontFamily,
        this.foregroundColor,
        position.date_range,
        `positionDateRange-${i}`
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
        '-',
        `hyphenAfterTitle-${i}`
      );

      const companyNameXPos = hyphen1XPos + hyphenWidth + config.hyphenSpacing;
      const {matches, plainString} = extractLinks(position.company);
      const lineChunks = breakLinesIntoChunks([plainString], matches);
      invariant(lineChunks.length === 1, 'Expected 1 line chunk');
      const chunkedLine = lineChunks[0];
      let currentXPos = companyNameXPos;
      for (const chunk of chunkedLine.chunks) {
        if (chunk.isMatch) {
          invariant(chunk.url, 'Expected a url for a match');
          this.addTextWithLink(
            currentXPos,
            currentPositionYPos,
            config.positionTitleSize,
            config.fontFamily,
            this.foregroundColor,
            chunk.text,
            chunk.url,
            `positionCompanyName-${i}`
          );
        } else {
          this.addText(
            currentXPos,
            currentPositionYPos,
            config.positionTitleSize,
            config.fontFamily,
            this.foregroundColor,
            chunk.text,
            `positionCompanyName-${i}`
          );
        }
        currentXPos += getTextWidthInPoints(
          chunk.text,
          getFontString(
            config.positionTitleWeight,
            config.positionTitleSize,
            config.units,
            config.fontFamily
          )
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
        '-',
        `hyphenAfterCompanyName-${i}`
      );

      // Company Location
      const companyLocationXPos =
        hyphen2XPos + hyphenWidth + config.hyphenSpacing;
      this.addText(
        companyLocationXPos,
        currentPositionYPos,
        config.positionTitleSize,
        config.fontFamily,
        this.foregroundColor,
        position.location,
        'positionCompanyLocation-'
      );

      // Accomplishments
      let accomplishmentYPos =
        currentPositionYPos +
        config.positionTitleSize +
        config.positionAccomplishmentHeaderSpacing;
      const accomplishmentFont = getFontString(
        config.positionAccomplishmentWeight,
        config.positionAccomplishmentSize,
        config.units,
        config.fontFamily
      );

      for (let j = 0; j < position.accomplishments.length; j++) {
        const accomplishment = position.accomplishments[j];
        this.addCircle(
          config.positionAccomplishmentBulletXPos,
          accomplishmentYPos,
          config.positionAccomplishmentBulletRadius,
          this.foregroundColor,
          `accomplishmentBullet-${i}-${j}`
        );
        const accomplishmentLines: ChunkedLine[] = wrapLabel(
          accomplishment,
          config.positionAccomplishmentMaxWidth,
          accomplishmentFont
        );
        for (let k = 0; k < accomplishmentLines.length; k++) {
          const chunkedLine: ChunkedLine = accomplishmentLines[k];
          for (const chunk of chunkedLine.chunks) {
            this.addText(
              config.positionAccomplishmentXPos,
              accomplishmentYPos,
              config.positionAccomplishmentSize,
              config.fontFamily,
              this.foregroundColor,
              chunk.text,
              `positionAccomplishmentLine-${i}-${j}-${k}`
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
    this.addText(
      config.educationHeaderXPos,
      educationHeaderYPos,
      config.educationHeaderSize,
      config.fontFamily,
      this.highlightColor,
      config.educationHeader,
      'educationHeader'
    );

    let educationYPos =
      educationHeaderYPos + config.headerSpacing + config.educationSize;
    for (let m = 0; m < this.resume.education.length; m++) {
      const education = this.resume.education[m];

      this.addCircle(
        config.verticalDividerPos.x,
        educationYPos,
        config.positionBulletRadius,
        this.highlightColor,
        `educationBullet-${m}`
      );

      // Education Institution
      this.addTextWithLink(
        config.educationXPos,
        educationYPos,
        config.educationSize,
        config.fontFamily,
        this.foregroundColor,
        education.institution,
        education.url,
        `educationInstitution-${m}`
      );

      // Education Degree
      educationYPos += config.educationSize;
      this.addText(
        config.educationXPos,
        educationYPos,
        config.educationSize,
        config.fontFamily,
        this.foregroundColor,
        education.credential,
        `educationDegree-${m}`
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
      'WEB',
      'WebLabel'
    );

    // Presences
    const interenetWidthInPoints = getTextWidthInPoints(
      'WEB',
      getFontString(
        config.nameWeight,
        config.internetPresencesHeaderSize,
        config.units,
        config.fontFamily
      )
    );
    this.addText(
      config.namePos.x + interenetWidthInPoints,
      config.internetPresencesHeaderYPos,
      config.internetPresencesHeaderSize,
      config.fontFamily,
      this.foregroundColor,
      'PRESENCES',
      'PresencesLabel'
    );

    // Internet Presences Separator
    this.addLine(
      config.verticalDividerPos.x,
      config.verticalDividerPos.x - config.internetPresencesLineWidth,
      config.internetPresencesLineYPos,
      config.internetPresencesLineYPos,
      this.highlightColor,
      'internetPresencesSeparator'
    );

    let internetPresenceYPos = config.internetPresencesYPos;
    for (let n = 0; n < this.resume.internetPresences.length; n++) {
      const internetPresence = this.resume.internetPresences[n];
      const wihoutUrlPrefix = internetPresence.split('//')[1];
      // URL
      this.addTextWithLink(
        config.namePos.x,
        internetPresenceYPos,
        config.internetPresencesSize,
        config.fontFamily,
        this.foregroundColor,
        wihoutUrlPrefix,
        internetPresence,
        `internetPresences-${n}`
      );
      internetPresenceYPos += config.internetPresencesSize;
    }
  }
}
