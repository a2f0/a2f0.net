import assert from "node:assert";

import waitForHydration from "../lib/hydration";
import SvgPage from "../pageobjects/svg.page";

// The print frame's print would open the browser's print dialog. Record the
// PDF it was asked to print instead.
const stubFramePrint = () =>
  browser.execute(() => {
    const contentWindow = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "contentWindow",
    );
    Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
      configurable: true,
      get(this: HTMLIFrameElement) {
        if (this.id !== "resumePrintFrame") {
          return contentWindow?.get?.call(this);
        }
        return {
          print: () => {
            document.documentElement.dataset.printed = this.src;
          },
        };
      },
    });
  });

const printedPdf = () =>
  browser.execute(async () => {
    const src = document.documentElement.dataset.printed;
    if (!src) return null;
    const pdf = await (await fetch(src)).text();
    return {
      header: pdf.slice(0, 5),
      pages: pdf.match(/\/Type \/Page\b/g)?.length ?? 0,
      firstFill: pdf.split("\n").find((line) => / g$/.test(line)),
    };
  });

describe("Print", () => {
  it("prints the resume PDF on white in the dark theme", async () => {
    await SvgPage.open();
    await waitForHydration("#svgContainer");
    await expect(SvgPage.darkThemeMenuOption).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await stubFramePrint();

    await SvgPage.fileMenuButton.click();
    await expect(SvgPage.printMenuOption).toBeDisplayed();
    await SvgPage.printMenuOption.click();
    await expect(SvgPage.fileMenuItems).not.toBeDisplayed();

    await browser.waitUntil(async () => (await printedPdf()) !== null, {
      timeoutMsg: "the print frame did not print",
    });
    const pdf = await printedPdf();
    assert.deepStrictEqual(pdf, {
      header: "%PDF-",
      pages: 1,
      // The panels paint first, in the light theme's white.
      firstFill: "1. g",
    });
  });
});
