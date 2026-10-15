import { $, browser, expect } from "@wdio/globals";

describe("Local Tearleads API integration", () => {
  it("recovers the identity, note and attachment in a fresh browser", async () => {
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
    // Start a trial for the disposable local account before Drive begins sync.
    // Observe the real login response; no credentials leave the browser.
    await browser.execute((origin) => {
      const original = window.fetch.bind(window);
      window.fetch = Object.assign(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const response = await original(input, init);
          const url = input instanceof Request ? input.url : String(input);
          if (url === `${origin}/auth/verify` && response.ok) {
            const identity = await response.clone().json();
            if (identity.authenticated) {
              const trial = await original(
                `${origin}/organizations/${encodeURIComponent(identity.organizationId)}/billing/trial`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${identity.token}` },
                },
              );
              if (!trial.ok || (await trial.json()).status !== "trialing")
                throw new Error("Local sync trial setup failed");
              window.fetch = original;
              document.body.setAttribute("data-test-trial", "ready");
            }
          }
          return response;
        },
        window.fetch,
      );
    }, api.origin);
    await $(".drive-dialog .drive-primary").click();
    await expect($(".drive-dialog .drive-primary")).toHaveText("Disconnect", {
      wait: 30000,
    });
    await expect($("body")).toHaveAttribute("data-test-trial", "ready");
    await $('button[aria-label="Close dialog"]').click();
    await $("button=New folder").click();
    await $("#drive-item-name").setValue("Round trip");
    await $("button=Create").click();
    await expect($(".drive-table tbody")).not.toHaveText(
      expect.stringContaining("Pending"),
    );
    await expect($(".drive-table .drive-file-name")).toHaveText("Round trip", {
      wait: 30000,
    });
    await $(".drive-table .drive-file-name").click();
    await browser.execute(() => {
      const input =
        document.querySelector<HTMLInputElement>("input[type='file']");
      if (!input) throw new Error("Upload input missing");
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(
          ["Bytes recovered from the Tearleads server"],
          "round-trip.txt",
          { type: "text/plain" },
        ),
      );
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await $("button=round-trip.txt").click();
    await expect($(".drive-attachments")).toBeDisplayed();
    await $("#drive-note-text").setValue(
      "round-trip.txt\nA note recovered from the server.",
    );
    await $("button=Save note").click();
    await expect($(".drive-dialog-actions [role='status']")).toHaveText(
      "Saved on this device",
    );
    await expect($(".drive-attachments")).not.toHaveText(
      expect.stringContaining("Upload pending"),
      { wait: 30000 },
    );
    await expect($(".drive-document-meta")).not.toHaveText(
      expect.stringContaining("Syncing"),
      { wait: 30000 },
    );
    await $('button[aria-label="Close dialog"]').click();
    expect(
      (await $(".drive-error").isExisting())
        ? await $(".drive-error").getText()
        : "",
    ).toBe("");
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
    await expect($(".drive-dialog .drive-primary")).toHaveText("Disconnect", {
      wait: 30000,
    });
    await expect($(".drive-identity code")).toHaveText(fingerprint);
    await $('button[aria-label="Close dialog"]').click();
    await expect($(".drive-main-heading h1")).not.toHaveText("All drives");
    await expect($(".drive-table .drive-file-name")).toHaveText("Round trip", {
      wait: 30000,
    });
    await $(".drive-table .drive-file-name").click();
    await expect($(".drive-table .drive-file-name")).toHaveText(
      "round-trip.txt",
    );
    await $("button=round-trip.txt").click();
    await expect($("#drive-note-text")).toHaveValue(
      "round-trip.txt\nA note recovered from the server.",
      { wait: 30000 },
    );
    await browser.execute(() => {
      HTMLAnchorElement.prototype.click = function () {
        if (this.download === "round-trip.txt")
          void fetch(this.href)
            .then((r) => r.text())
            .then((text) =>
              document.body.setAttribute("data-test-download", text),
            );
      };
    });
    await $("button[aria-label='Download round-trip.txt']").click();
    await expect($("body")).toHaveAttribute(
      "data-test-download",
      "Bytes recovered from the Tearleads server",
      { wait: 30000 },
    );
    expect(
      (await $(".drive-error").isExisting())
        ? await $(".drive-error").getText()
        : "",
    ).toBe("");
  });
});
