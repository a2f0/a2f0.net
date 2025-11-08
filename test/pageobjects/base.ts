class Base {
  get fileMenuButton(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#menuButtonFile');
  }
  get fileMenuItems(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#menuItemsFile');
  }
  get viewMenuButton(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#menuButtonView');
  }
  get viewMenuItems(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#menuItemsView');
  }
  get downloadSvgMenuOption(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#downloadSvgMenuOption');
  }
  get downloadPdfMenuOption(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#downloadPdfMenuOption');
  }
  open(path: string): ReturnType<WebdriverIO.Browser['url']> {
    return browser.url(`http://localhost:4001/${path}`);
  }
}

export default Base;

let baseInstance: Base | undefined;
export const BasePage = {
  get fileMenuButton() {
    if (!baseInstance) baseInstance = new Base();
    return baseInstance.fileMenuButton;
  },
  get fileMenuItems() {
    if (!baseInstance) baseInstance = new Base();
    return baseInstance.fileMenuItems;
  },
  get viewMenuButton() {
    if (!baseInstance) baseInstance = new Base();
    return baseInstance.viewMenuButton;
  },
  get viewMenuItems() {
    if (!baseInstance) baseInstance = new Base();
    return baseInstance.viewMenuItems;
  },
  get downloadSvgMenuOption() {
    if (!baseInstance) baseInstance = new Base();
    return baseInstance.downloadSvgMenuOption;
  },
  get downloadPdfMenuOption() {
    if (!baseInstance) baseInstance = new Base();
    return baseInstance.downloadPdfMenuOption;
  },
  open(path: string) {
    if (!baseInstance) baseInstance = new Base();
    return baseInstance.open(path);
  },
};
