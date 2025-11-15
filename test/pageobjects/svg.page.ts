import Base from "./base";

class SvgPage extends Base {
  get leftPartition(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#leftPartition");
  }
  get svgResume(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#svgResume");
  }
  get darkThemeMenuOption(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#darkThemeMenuOption");
  }
  get lightThemeMenuOption(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#lightThemeMenuOption");
  }
  open(): ReturnType<WebdriverIO.Browser["url"]> {
    return super.open("");
  }
}

export default new SvgPage();
