import { $, browser, expect } from "@wdio/globals";

describe("Local Tearleads API integration", () => {
  it("registers, signs in, and recovers the same identity in a fresh browser", async () => {
    await browser.url("/");
    await $(".drive-welcome-actions .drive-primary").click();
    await $(".drive-account-button").waitForDisplayed({ timeout: 30000 });
    await $(".drive-account-button").click();
    await $(".drive-dialog .drive-secondary").click();
    const phrase = await $(".drive-recovery > code").getText();
    const fingerprint = await $(".drive-identity code").getText();
    await $(".drive-dialog .drive-secondary").click();
    // Refuse production before creating any remote account.
    const api = new URL(
      (await $("[data-api-url]").getAttribute("data-api-url")) ?? "",
    );
    expect(["localhost", "127.0.0.1", "[::1]"]).toContain(api.hostname);
    expect(api.protocol).toBe("http:");
    await $("button=Connect to Tearleads").click();
    await $("button=Disconnect").waitForDisplayed({ timeout: 30000 });
    await $('button[aria-label="Close dialog"]').click();
    expect(
      await browser.execute(() =>
        performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((url) => url.startsWith("https://api.tearleads.com")),
      ),
    ).toEqual([]);
    await browser.reloadSession();
    await browser.url("/");
    await $(".drive-welcome-actions .drive-secondary").waitForDisplayed({
      timeout: 30000,
    });
    await $(".drive-welcome-actions .drive-secondary").click();
    await $("#drive-recovery").setValue(phrase);
    await $(".drive-welcome form .drive-primary").click();
    await $(".drive-account-button").waitForDisplayed({ timeout: 30000 });
    await $(".drive-account-button").click();
    await $("button=Disconnect").waitForDisplayed({ timeout: 30000 });
    await expect($(".drive-identity code")).toHaveText(fingerprint);
    await $('button[aria-label="Close dialog"]').click();
    await expect($(".drive-main-heading h1")).not.toHaveText("All drives");
  });
});
