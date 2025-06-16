export default class Base {
  get fileMenuButton(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#menuButtonFile");
  }
  get fileMenuItems(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#menuItemsFile");
  }
  get viewMenuButton(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#menuButtonView");
  }
  get viewMenuItems(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#menuItemsView");
  }
  get downloadSvgMenuOption(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#downloadSvgMenuOption");
  }
  get downloadPdfMenuOption(): ReturnType<WebdriverIO.Browser["$"]> {
    return $("#downloadPdfMenuOption");
  }
  open(path: string): ReturnType<WebdriverIO.Browser["url"]> {
    return browser.url(`http://localhost:4001/${path}`);
  }
}

const BasePage = new Base();
export { BasePage };
