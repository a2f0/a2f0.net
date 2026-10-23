import { $, browser, expect } from "@wdio/globals";

describe("standalone click tracking", () => {
  it("keeps the built local preview inactive without the WebDriver signal", async () => {
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
      await expect($(".view-toggle")).toBeEnabled();
      await $(".view-toggle").click();

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
    }
  });
});
