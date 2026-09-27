import { browser, expect } from "@wdio/globals";

import SvgPage from "../pageobjects/svg.page";

describe("Analytics", () => {
  it("does not load Google Analytics in automated browsers", async () => {
    await SvgPage.open();
    expect(await browser.execute(() => navigator.webdriver)).toBe(true);

    // Opening the menu needs a hydrated page, and React runs pending mount
    // effects before that update, so analytics would be requested by now.
    await SvgPage.fileMenuButton.click();
    await expect(SvgPage.fileMenuItems).toBeDisplayed();
    // Give an enabled tag time to be injected before asserting it never was.
    await browser.pause(1000);

    const analytics = await browser.execute(() => ({
      dataLayer: "dataLayer" in window,
      scripts: Array.from(document.scripts, (script) => script.src).filter(
        (src) => src.includes("googletagmanager.com"),
      ),
    }));
    expect(analytics).toEqual({ dataLayer: false, scripts: [] });
  });
});
