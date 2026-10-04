import { $, browser, expect } from "@wdio/globals";

import { MAIN_WIDTH } from "../../lib/breakpoints";
import waitForHydration from "../lib/hydration";
import SvgPage from "../pageobjects/svg.page";

const SCALES = [
  { scale: 1.5, label: "150%" },
  { scale: 1.25, label: "125%" },
  { scale: 1, label: "Real Size" },
];

const chooseScale = async (label: string) => {
  await SvgPage.viewMenuButton.click();
  await $(`button=${label}`).click();
  await expect($(`button=${label}`)).toHaveAttribute("aria-pressed", "true");
};

const getLayout = () =>
  browser.execute(() => {
    const box = (selector: string) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      return bounds
        ? {
            left: bounds.left,
            right: bounds.right,
            top: bounds.top,
            bottom: bounds.bottom,
          }
        : null;
    };
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      header: box("header"),
      file: box("#menuButtonFile"),
      view: box("#menuButtonView"),
    };
  });

describe("Responsive Layout", () => {
  after(async () => {
    await browser.setViewport({ width: 1366, height: 900 });
  });

  for (const { scale, label } of SCALES) {
    it(`keeps the menu on screen at every width at ${label}`, async () => {
      const columnWidth = Math.ceil(MAIN_WIDTH * scale);
      // Around the old 768px breakpoint, through the range where the
      // desktop column used to overflow, and either side of the new one.
      const widths = [390, 768, 769, 1000, columnWidth - 1, columnWidth];
      await browser.setViewport({ width: 1366, height: 900 });
      await SvgPage.open();
      await waitForHydration("#menuButtonView");
      await chooseScale(label);

      for (const width of widths) {
        await browser.setViewport({ width, height: 900 });
        try {
          await browser.waitUntil(async () => {
            const { clientWidth, scrollWidth, header, file, view } =
              await getLayout();
            return (
              header !== null &&
              file !== null &&
              view !== null &&
              scrollWidth <= clientWidth &&
              file.left >= 0 &&
              view.right <= clientWidth &&
              file.top >= header.top &&
              file.bottom <= header.bottom
            );
          });
        } catch {
          throw new Error(
            `Menu off screen at ${width}px: ${JSON.stringify(await getLayout())}`,
          );
        }
      }
    });
  }

  it("switches between layouts as the scale changes", async () => {
    // Too narrow for the column at 150%, but wide enough at real size.
    await browser.setViewport({ width: 1000, height: 900 });
    await SvgPage.open();
    await waitForHydration("#svgContainer");
    await browser.waitUntil(
      async () => !(await SvgPage.leftPartition.isExisting()),
      { timeoutMsg: "expected the mobile layout at 150%" },
    );

    await chooseScale("Real Size");
    await browser.waitUntil(() => SvgPage.leftPartition.isDisplayed(), {
      timeoutMsg: "expected the desktop layout at real size",
    });

    await chooseScale("150%");
    await browser.waitUntil(
      async () => !(await SvgPage.leftPartition.isExisting()),
      { timeoutMsg: "expected the mobile layout again at 150%" },
    );
  });

  it("keeps the header in view while scrolling on mobile", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await SvgPage.open();
    await waitForHydration("#svgContainer");
    await browser.waitUntil(
      () =>
        browser.execute(() => {
          window.scrollTo(0, 600);
          return window.scrollY > 0;
        }),
      { timeoutMsg: "expected the mobile page to scroll" },
    );
    const headerTop = await browser.execute(
      () => document.querySelector("header")?.getBoundingClientRect().top,
    );
    expect(headerTop).toBe(0);
  });
});
