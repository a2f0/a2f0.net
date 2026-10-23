import { $, browser, expect } from "@wdio/globals";

describe("standalone click tracking", () => {
  it("keeps the built local preview inactive without the WebDriver signal", async () => {
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
    const attempts: string[] = [];
    const script = await browser.addInitScript<string>((emit) => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "globalPrivacyControl", {
        get: () => true,
      });
      const originalFetch = window.fetch;
      Object.defineProperty(window, "fetch", {
        value(input: RequestInfo | URL, options?: RequestInit) {
          const url = input instanceof Request ? input.url : String(input);
          if (url.startsWith("https://ct.a2f0.net/")) {
            emit(url);
            return Promise.resolve(new Response(null, { status: 204 }));
          }
          return originalFetch(input, options);
        },
      });
    });
    script.on("data", (url) => attempts.push(url));
    try {
      await browser.url("/?secret=private#private");
      await expect($("#menuButtonView")).toBeEnabled();
      await browser.waitUntil(() => tagManager.calls.length > 0);
      expect(tagManager.calls.length).toBeGreaterThan(0);
      await $("#menuButtonView").click();

      await browser.execute(() => window.dispatchEvent(new Event("pagehide")));
      // Prove interception and wait for earlier browser-to-runner messages.
      const probe = "https://ct.a2f0.net/__interception_probe__";
      await browser.execute(async (url) => {
        await fetch(url, { method: "POST" });
      }, probe);
      await browser.waitUntil(() => attempts.includes(probe));
      expect(attempts).toEqual([probe]);
    } finally {
      await script.remove();
      await browser.url("about:blank");
      await tagManager.restore();
      await analytics.restore();
      await regionalAnalytics.restore();
    }
  });
});
