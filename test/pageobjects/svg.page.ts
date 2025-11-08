import Base from './base';

class SvgPage extends Base {
  get leftPartition(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#leftPartition');
  }
  get svgResume(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#svgResume');
  }
  get darkThemeMenuOption(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#darkThemeMenuOption');
  }
  get lightThemeMenuOption(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#lightThemeMenuOption');
  }
  open(): ReturnType<WebdriverIO.Browser['url']> {
    return super.open('');
  }
}

let instance: SvgPage | undefined;
export default {
  get leftPartition() {
    if (!instance) instance = new SvgPage();
    return instance.leftPartition;
  },
  get svgResume() {
    if (!instance) instance = new SvgPage();
    return instance.svgResume;
  },
  get darkThemeMenuOption() {
    if (!instance) instance = new SvgPage();
    return instance.darkThemeMenuOption;
  },
  get lightThemeMenuOption() {
    if (!instance) instance = new SvgPage();
    return instance.lightThemeMenuOption;
  },
  get fileMenuButton() {
    if (!instance) instance = new SvgPage();
    return instance.fileMenuButton;
  },
  get fileMenuItems() {
    if (!instance) instance = new SvgPage();
    return instance.fileMenuItems;
  },
  get downloadSvgMenuOption() {
    if (!instance) instance = new SvgPage();
    return instance.downloadSvgMenuOption;
  },
  get viewMenuButton() {
    if (!instance) instance = new SvgPage();
    return instance.viewMenuButton;
  },
  get viewMenuItems() {
    if (!instance) instance = new SvgPage();
    return instance.viewMenuItems;
  },
  open() {
    if (!instance) instance = new SvgPage();
    return instance.open();
  },
};
