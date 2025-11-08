import Base from './base';

class PdfPage extends Base {
  get pdfResume(): ReturnType<WebdriverIO.Browser['$']> {
    return $('#pdfObjectContainer');
  }
  open(): ReturnType<WebdriverIO.Browser['url']> {
    return super.open('pdf');
  }
}

let instance: PdfPage | undefined;
export default {
  get pdfResume() {
    if (!instance) instance = new PdfPage();
    return instance.pdfResume;
  },
  get fileMenuButton() {
    if (!instance) instance = new PdfPage();
    return instance.fileMenuButton;
  },
  get fileMenuItems() {
    if (!instance) instance = new PdfPage();
    return instance.fileMenuItems;
  },
  get downloadPdfMenuOption() {
    if (!instance) instance = new PdfPage();
    return instance.downloadPdfMenuOption;
  },
  open() {
    if (!instance) instance = new PdfPage();
    return instance.open();
  },
};
