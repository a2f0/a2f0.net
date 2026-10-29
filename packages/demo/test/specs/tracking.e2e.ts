import {
  interceptClickTracking,
  targetsLocalPreview,
} from "@a2f0/testing/clickTrackingProbe";
import { $, browser, expect } from "@wdio/globals";

describe("standalone click tracking", () => {
  it("keeps the built local preview inactive without the WebDriver signal", async function () {
    if (!targetsLocalPreview()) this.skip();
    const tracking = await interceptClickTracking();
    try {
      await browser.url("/?secret=private#private");
      await expect($(".view-toggle")).toBeEnabled();
      await $(".view-toggle").click();
      await tracking.expectNothingSent();
    } finally {
      await tracking.remove();
    }
  });
});
