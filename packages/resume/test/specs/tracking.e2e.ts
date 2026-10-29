import {
  interceptClickTracking,
  targetsLocalPreview,
} from "@a2f0/testing/clickTrackingProbe";
import { $, browser, expect } from "@wdio/globals";

describe("standalone click tracking", () => {
  it("keeps the built local preview inactive without the WebDriver signal", async function () {
    if (!targetsLocalPreview()) this.skip();
    // The existing Google Analytics integration must stay isolated too.
    const tagManager = await browser.mock(
      "https://www.googletagmanager.com/**",
    );
    tagManager.respond("", {
      fetchResponse: false,
      statusCode: 200,
      headers: { "content-type": "application/javascript" },
    });
    const analytics = await browser.mock("https://*.google-analytics.com/**");
    analytics.abort();
    const regionalAnalytics = await browser.mock(
      "https://*.analytics.google.com/**",
    );
    regionalAnalytics.abort();
    const tracking = await interceptClickTracking();
    try {
      await browser.url("/?secret=private#private");
      await expect($("#menuButtonView")).toBeEnabled();
      await browser.waitUntil(() => tagManager.calls.length > 0);
      expect(tagManager.calls.length).toBeGreaterThan(0);
      await $("#menuButtonView").click();
      await tracking.expectNothingSent();
    } finally {
      await tracking.remove();
      await tagManager.restore();
      await analytics.restore();
      await regionalAnalytics.restore();
    }
  });
});
