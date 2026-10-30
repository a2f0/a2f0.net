import { $, $$, browser, expect } from "@wdio/globals";
import { resumeWindow, useDesktop, waitForResume } from "../lib/desktop";

// A desktop icon, by its app's id.
const desktopIcon = (appId: string) =>
  $(`.desktop-icons [role="option"][data-app-id="${appId}"]`);

const iconPosition = (appId: string) =>
  browser.execute((selector) => {
    const icon = document.querySelector<HTMLElement>(selector);
    if (!icon) throw new Error(`Missing ${selector}`);
    return { left: icon.style.left, top: icon.style.top };
  }, `.desktop-icon[data-app-id="${appId}"]`);

const closeResume = async () => {
  await resumeWindow().$("button[aria-label='Close window']").click();
  await expect(resumeWindow()).not.toBeExisting();
};

describe("Website desktop icons", () => {
  useDesktop();

  it("shows every app as an icon, clear of the windows", async () => {
    await expect($$(".desktop-icons [role='option']")).toBeElementsArrayOfSize(
      5,
    );
    const labels = await $$(".desktop-icon-label").map((label) =>
      label.getText(),
    );
    expect(labels).toEqual([
      "dnbm",
      "Skyline",
      "dnbm player",
      "a2f0.net",
      "Resume",
    ]);
    // The resume opens right of the icon column.
    const icon = await desktopIcon("resume").getLocation();
    const iconSize = await desktopIcon("resume").getSize();
    const window = await resumeWindow().getLocation();
    expect(window.x).toBeGreaterThanOrEqual(icon.x + iconSize.width);
  });

  it("opens an app on double-click, and from its menu", async () => {
    await closeResume();
    await desktopIcon("resume").doubleClick();
    await waitForResume();

    await closeResume();
    await desktopIcon("resume").click({ button: "right" });
    await $(".menu").$("button=Open").click();
    await waitForResume();
    await expect($(".menu")).not.toBeExisting();
  });

  it("keeps a dragged icon where it was dropped, across a reload", async () => {
    const before = await desktopIcon("resume").getLocation();
    await browser
      .action("pointer")
      .move({ origin: desktopIcon("resume") })
      .down()
      .move({ origin: "pointer", x: 30, y: -40, duration: 150 })
      .up()
      .perform();
    const after = await desktopIcon("resume").getLocation();
    expect(after.x).toBe(before.x + 30);
    expect(after.y).toBe(before.y - 40);
    const dropped = await iconPosition("resume");

    // The layout is written to the origin's private file system after the
    // drop; wait for the file before reloading.
    await browser.waitUntil(
      () =>
        browser.execute(async () => {
          try {
            const root = await navigator.storage.getDirectory();
            const folder = await root.getDirectoryHandle("website");
            const handle = await folder.getFileHandle("desktop-state.json");
            return (await (await handle.getFile()).text()).includes("resume");
          } catch {
            return false;
          }
        }),
      { timeoutMsg: "the desktop layout was not saved" },
    );
    await browser.refresh();
    await waitForResume();
    await browser.waitUntil(
      async () =>
        (await iconPosition("resume")).left === dropped.left &&
        (await iconPosition("resume")).top === dropped.top,
      { timeoutMsg: "the dragged icon did not keep its position" },
    );
  });
});
