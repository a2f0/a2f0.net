import { $, browser, expect } from "@wdio/globals";

import { MAIN_WIDTH, mobileQuery } from "../../lib/breakpoints";
import waitForHydration from "../lib/hydration";
import SvgPage from "../pageobjects/svg.page";

const SCALES = [
  { scale: 1.5, label: "150%" },
  { scale: 1.25, label: "125%" },
  { scale: 1, label: "Real Size" },
];

// Resize only once the page has loaded, as the other specs do. Chrome on the
// Linux CI runner can revert a viewport change made just after a click, so
// set it again until the page has kept the new width for a moment.
const setWidth = async (width: number, height = 900) => {
  const innerWidth = () => browser.execute(() => window.innerWidth);
  try {
    await browser.waitUntil(async () => {
      await browser.setViewport({ width, height });
      await browser.pause(500);
      return (await innerWidth()) === width;
    });
  } catch {
    throw new Error(
      `expected a ${width}px viewport, got ${await innerWidth()}px`,
    );
  }
  await browser.execute(() => window.dispatchEvent(new Event("resize")));
};

const chooseScale = async (label: string) => {
  await SvgPage.viewMenuButton.click();
  await $(`button=${label}`).click();
  await expect($(`button=${label}`)).toHaveAttribute("aria-pressed", "true");
};

// The desktop SVG has a left partition; the mobile one does not.
const waitForLayout = async (desktop: boolean, message: string) => {
  try {
    await browser.waitUntil(async () =>
      desktop
        ? SvgPage.leftPartition.isDisplayed()
        : !(await SvgPage.leftPartition.isExisting()),
    );
  } catch {
    const state = await browser.execute(() => ({
      innerWidth: window.innerWidth,
      svgClass: document.querySelector("#svgResume")?.getAttribute("class"),
    }));
    throw new Error(`${message}: ${JSON.stringify(state)}`);
  }
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
      await SvgPage.open();
      await waitForHydration("#menuButtonView");
      await setWidth(1366);
      await chooseScale(label);

      for (const width of widths) {
        await setWidth(width);
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
    await SvgPage.open();
    await waitForHydration("#svgContainer");
    // Too narrow for the column at 150%, but wide enough at real size.
    await setWidth(1000);
    await waitForLayout(false, "expected the mobile layout at 150%");

    await chooseScale("Real Size");
    await waitForLayout(true, "expected the desktop layout at real size");

    await chooseScale("150%");
    await waitForLayout(false, "expected the mobile layout again at 150%");
  });

  it("keeps the header in view while scrolling on mobile", async () => {
    await SvgPage.open();
    await waitForHydration("#svgContainer");
    await setWidth(390, 844);
    await browser.waitUntil(
      () =>
        browser.execute(
          (query: string) => window.matchMedia(query).matches,
          mobileQuery(1.5),
        ),
      { timeoutMsg: "expected a mobile viewport" },
    );
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
