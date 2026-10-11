import { $, browser, expect } from "@wdio/globals";

describe("Drive with the published Tearleads SDK", () => {
  it("keeps an invalid recovery phrase available for correction", async () => {
    await browser.url("/");
    await expect($("button=Use an existing identity")).toBeEnabled();
    await $("button=Use an existing identity").click();
    await $("#drive-recovery").setValue("an invalid recovery phrase");
    await $("button=Open my drive").click();
    await expect($(".drive-error")).toBeDisplayed();
    await expect($("#drive-recovery")).toHaveValue(
      "an invalid recovery phrase",
    );
    await expect($("#drive-recovery")).toBeEnabled();
    await $("button=Back").click();
  });
  it("creates a local identity, folders, documents and files, then restores them after reload", async () => {
    await browser.url("/");
    await expect($("button=Create a drive")).toBeDisplayed();
    await $("button=Create a drive").click();
    await expect($("button=New folder")).toBeEnabled({ wait: 30000 });
    await $("button=New folder").click();
    await $("#drive-item-name").setValue("Field notes");
    await $("button=Create").click();
    await expect($("button=Field notes")).toBeDisplayed();
    await $("button=Field notes").click();
    await expect($(".drive-main-heading h1")).toHaveText("Field notes");
    await $("button=New note").click();
    await $("#drive-item-name").setValue("A first idea");
    await $("button=Create").click();
    await expect($("#drive-note-text")).toBeDisplayed();
    await $("#drive-note-text").setValue(
      "A first idea\nA real SDK document, saved locally.",
    );
    await $("button=Save note").click();
    await expect($(".drive-dialog-actions [role='status']")).toHaveText(
      "Saved on this device",
    );
    await $("button[aria-label='Close dialog']").click();
    await browser.execute(() => {
      const input =
        document.querySelector<HTMLInputElement>("input[type='file']");
      if (!input) throw new Error("Upload input missing");
      const transfer = new DataTransfer();
      transfer.items.add(
        new File(["hello from the first external SDK host"], "hello.txt", {
          type: "text/plain",
        }),
      );
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect($("button=hello.txt")).toBeDisplayed();
    await $("button=hello.txt").click();
    await expect($("button[aria-label='Download hello.txt']")).toBeDisplayed();
    await $("button[aria-label='Close dialog']").click();
    await $("button=Your identity").click();
    const fingerprint = await $(".drive-identity code").getText();
    await $("button[aria-label='Close dialog']").click();
    await browser.refresh();
    await expect($("button=Field notes")).toBeDisplayed({ wait: 30000 });
    await $("button=Field notes").click();
    await $("button=A first idea").click();
    await expect($("#drive-note-text")).toHaveValue(
      "A first idea\nA real SDK document, saved locally.",
    );
    await $("button[aria-label='Close dialog']").click();
    await $("button=hello.txt").click();
    await expect($("button[aria-label='Download hello.txt']")).toBeDisplayed();
    await browser.execute(() => {
      // Capture this test's download in the browser without a machine-specific directory.
      const original = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (this.download === "hello.txt") {
          void fetch(this.href)
            .then((r) => r.text())
            .then((text) =>
              document.body.setAttribute("data-test-download", text),
            );
        } else original.call(this);
      };
    });
    await $("button[aria-label='Download hello.txt']").click();
    await expect($("body")).toHaveAttribute(
      "data-test-download",
      "hello from the first external SDK host",
    );
    await $("button[aria-label='Close dialog']").click();
    await $("button=Your identity").click();
    await expect($(".drive-identity code")).toHaveText(fingerprint);
    await $("button[aria-label='Close dialog']").click();
    const requests = await browser.execute(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => url.startsWith("https://api.tearleads.com")),
    );
    expect(requests).toEqual([]);
    expect(
      (await $(".drive-error[role='alert']").isExisting())
        ? await $(".drive-error[role='alert']").getText()
        : "",
    ).toBe("");
  });

  it("keeps a second tab from opening a competing identity host", async () => {
    const original = await browser.getWindowHandle();
    const url = await browser.getUrl();
    await browser.newWindow(url);
    try {
      await expect($(".drive-error[role='alert']")).toHaveText(
        expect.stringContaining("already open in another tab"),
      );
    } finally {
      await browser.closeWindow();
      await browser.switchToWindow(original);
    }
    await expect($("button=New note")).toBeEnabled();
  });

  it("searches the current folder and fits a phone viewport", async () => {
    await $("input[type='search']").setValue("HELLO");
    await expect($("button=hello.txt")).toBeDisplayed();
    await expect($("button=A first idea")).not.toBeExisting();
    await $("input[type='search']").setValue("no such file");
    await expect($(".drive-empty h2")).toHaveText("Nothing by that name.");
    await $("input[type='search']").clearValue();
    await browser.setWindowSize(390, 844);
    await expect($("button=Upload files")).toBeDisplayed();
    expect(
      await browser.execute(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await browser.setWindowSize(1440, 900);
  });

  it("renames a drive from All drives", async () => {
    await $("button[aria-label='All drives']").click();
    await $("button[aria-label='Rename My drive']").click();
    await $("#drive-item-name").setValue("Personal files");
    await $("button=Rename").click();
    await expect($(".drive-table .drive-file-name")).toHaveText(
      "Personal files",
    );
  });

  it("shows connection errors inside the active dialog", async () => {
    await browser.execute(() => {
      const original = window.fetch.bind(window);
      window.fetch = Object.assign(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = input instanceof Request ? input.url : String(input);
          if (url.startsWith("https://api.tearleads.com"))
            throw new Error("Simulated connection failure");
          return original(input, init);
        },
        window.fetch,
      );
    });
    await $("button=Your identity").click();
    await $("button=Connect to Tearleads").click();
    await expect($(".drive-dialog .drive-error")).toBeDisplayed();
    await $(".drive-dialog button[aria-label='Dismiss message']").click();
    await expect($(".drive-dialog .drive-error")).not.toBeExisting();
    await $("button[aria-label='Close dialog']").click();
    await browser.refresh();
  });
});
