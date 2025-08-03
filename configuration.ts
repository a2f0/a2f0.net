interface ICoordinate {
  x: number;
  y: number;
}

interface IResumeConfiguration {
  documentWidth: number;
  documentHeight: number;
  darkForegroundColor: string;
  darkBackgroundColor: string;
  darkHighlightColor: string;
  lightForegroundColor: string;
  lightBackgroundColor: string;
  lightHighlightColor: string;
  standardFontSize: number;
  pixelsPerPoint: number;
  startX: number;
  startY: number;
  rightPanelStartY: number;
  units: string;
  fontFamily: string;
  headerSize: number;
  headerSpacing: number;
  hyphenSpacing: number;
  centerBulletMargin: number;
  namePos: ICoordinate;
  nameSize: number;
  nameWeight: number;
  nameYPosMiddle: number;
  leftPanelPos: ICoordinate;
  leftPanelPercentage: number;
  leftPanelWidth: number;
  leftPanelMargin: number;
  rightPanelPos: ICoordinate;
  rightPanelPercentage: number;
  rightPanelWidth: number;
  addressPos: ICoordinate;
  addressYPosMiddle: number;
  addressSize: number;
  verticalDividerPos: ICoordinate;
  verticalDividerHeight: number;
  rightPanelMargin: number;
  rightPanelStartX: number;
  addressLineStrokeWidth: number;
  addressLineSpacing: number;
  addressLineYPos: number;
  addressLineWidth: number;
  addressLineX2: number;
  addressLineX1: number;
  phoneNumberSize: number;
  phoneNumberPos: ICoordinate;
  phoneNumberYPosMiddle: number;
  emailSize: number;
  emailPos: ICoordinate;
  experienceHeader: string;
  experienceHeaderSize: number;
  experienceHeaderXPos: number;
  experienceHeaderYPos: number;
  positionVerticalSpacing: number;
  positionTitleWeight: number;
  positionTitleSize: number;
  positionTitleColor: string;
  positionTitleXPos: number;
  positionTitleYPosStart: number;
  positionDateRangeWeight: number;
  positionDateRangeSize: number;
  positionDateRangeColor: string;
  positionCompanyWeight: number;
  positionCompanySize: number;
  positionCompanyColor: string;
  positionCompanyXPos: number;
  positionCompanyYPosStart: number;
  positionAccomplishmentHeaderSpacing: number;
  positionAccomplishmentSpacing: number;
  positionAccomplishmentLineSpacing: number;
  positionAccomplishmentWeight: number;
  positionAccomplishmentSize: number;
  positionAccomplishmentColor: string;
  positionAccomplishmentBulletRadius: number;
  positionAccomplishmentBulletXPos: number;
  positionAccomplishmentBulletMargin: number;
  positionAccomplishmentXPos: number;
  positionAccomplishmentMaxWidth: number;
  positionBulletRadius: number;
  educationHeaderWeight: number;
  educationHeaderSize: number;
  educationHeaderXPos: number;
  educationHeader: string;
  educationWeight: number;
  educationSize: number;
  educationColor: string;
  educationXPos: number;
  educationBulletRadius: number;
  educationVerticalSpacing: number;
  internetPresencesHeaderYPos: number;
  internetPresencesHeaderSize: number;
  internetPresencesLineSpacing: number;
  internetPresencesLineYPos: number;
  internetPresencesLineWidth: number;
  internetPresencesYPos: number;
  internetPresencesSize: number;
}

class ResumeConfiguration implements IResumeConfiguration {
  documentWidth = 612;
  documentHeight = 792;
  darkForegroundColor = "#DCDCDC";
  darkBackgroundColor = "#0F0F0F";
  darkHighlightColor = "#909090";
  lightForegroundColor = "#000000";
  lightBackgroundColor = "#FFFFFF";
  lightHighlightColor = "#707070";
  standardFontSize = 9.75;
  pixelsPerPoint = 0.75;
  startX = 18; // .25 inches from edge of page
  startY = 18; // .25 inches from edge of page
  rightPanelStartY = 77;
  units = "pt" as const;
  fontFamily = "Helvetica";
  headerSize = 12;
  headerSpacing = 4;
  hyphenSpacing = 4;
  centerBulletMargin = 8;
  namePos = { x: this.startX, y: this.startY };
  nameWeight = 400;
  nameSize = 15;
  nameYPosMiddle = this.namePos.y + this.nameSize / 2;
  leftPanelPos = { x: 0, y: 0 };
  leftPanelPercentage = 0.23;
  leftPanelWidth = this.leftPanelPercentage * this.documentWidth;
  leftPanelMargin = 18;
  rightPanelPos = { x: this.leftPanelWidth, y: 0 };
  rightPanelPercentage = 1 - this.leftPanelPercentage;
  rightPanelWidth = this.rightPanelPercentage * this.documentWidth;
  addressPos = { x: this.startX, y: this.startY + this.nameSize };
  addressSize = this.standardFontSize;
  addressYPosMiddle = this.addressPos.y + this.addressSize / 2;
  addressWeight = 400;
  verticalDividerPos = { x: this.leftPanelWidth, y: 20 };
  verticalDividerHeight = this.documentHeight - 60;
  rightPanelMargin = this.leftPanelMargin;
  rightPanelStartX = this.verticalDividerPos.x + this.centerBulletMargin;
  addressLineStrokeWidth = 1;
  addressLineSpacing = 6;
  addressLineYPos =
    this.addressPos.y + this.addressSize + this.addressLineSpacing;
  addressLineWidth = this.leftPanelWidth * (1 / 3);
  addressLineX2 = this.verticalDividerPos.x;
  addressLineX1 = this.verticalDividerPos.x - this.addressLineWidth;
  phoneNumberSize = this.addressSize;
  phoneNumberPos = {
    x: this.startX,
    y: this.addressLineYPos + this.addressLineSpacing,
  };
  phoneNumberYPosMiddle = this.phoneNumberPos.y + this.phoneNumberSize / 2;
  emailSize = this.addressSize;
  emailPos = {
    x: this.startX,
    y: this.phoneNumberYPosMiddle + this.emailSize / 2,
  };
  experienceHeaderSize = 12;
  experienceHeader = "EXPERIENCE";
  experienceHeaderXPos = this.rightPanelStartX;
  experienceHeaderYPos = this.rightPanelStartY;
  positionVerticalSpacing = 12;
  positionTitleWeight = 400;
  positionTitleSize = this.standardFontSize;
  positionTitleColor = "white";
  positionTitleXPos = this.rightPanelStartX;
  positionTitleYPosStart =
    this.experienceHeaderYPos + this.positionTitleSize + this.headerSpacing;
  positionDateRangeWeight = 400;
  positionDateRangeSize = this.standardFontSize;
  positionDateRangeColor = "white";
  positionCompanyWeight = 400;
  positionCompanySize = this.positionTitleSize;
  positionCompanyColor = "white";
  positionCompanyXPos = this.rightPanelStartX;
  positionCompanyYPosStart = this.positionTitleYPosStart;
  positionAccomplishmentHeaderSpacing = 1;
  positionAccomplishmentSpacing = 1;
  positionAccomplishmentLineSpacing = 1;
  positionAccomplishmentWeight = 400;
  positionAccomplishmentSize = this.positionTitleSize;
  positionAccomplishmentColor = "white";
  positionAccomplishmentBulletRadius = 1;
  positionAccomplishmentBulletXPos =
    this.rightPanelStartX + this.positionAccomplishmentBulletRadius * 2;
  positionAccomplishmentBulletMargin = 5;
  positionAccomplishmentXPos =
    this.positionAccomplishmentBulletXPos +
    this.positionAccomplishmentBulletMargin;
  positionAccomplishmentMaxWidth =
    this.rightPanelWidth -
    this.rightPanelMargin * 2 -
    this.positionAccomplishmentBulletMargin +
    this.positionAccomplishmentBulletRadius;
  positionBulletRadius = 2.75;
  educationHeaderWeight = 400;
  educationHeaderSize = this.headerSize;
  educationHeaderXPos = this.rightPanelStartX;
  educationHeader = "EDUCATION";
  educationWeight = 400;
  educationSize = this.addressSize;
  educationColor = "white";
  educationXPos = this.rightPanelStartX;
  educationBulletRadius = this.positionBulletRadius;
  educationVerticalSpacing = this.positionVerticalSpacing;
  internetPresencesHeaderYPos = this.documentHeight - 97;
  internetPresencesHeaderSize = this.headerSize;
  internetPresencesLineSpacing = 4;
  internetPresencesLineYPos =
    this.internetPresencesHeaderYPos +
    this.internetPresencesHeaderSize / 2 +
    this.internetPresencesLineSpacing;
  internetPresencesLineWidth = this.leftPanelWidth * (1 / 10);
  internetPresencesYPos =
    this.internetPresencesLineYPos + this.internetPresencesLineSpacing;
  internetPresencesSize = this.standardFontSize;
}

const resumeConfiguration = new ResumeConfiguration();

export { resumeConfiguration };
