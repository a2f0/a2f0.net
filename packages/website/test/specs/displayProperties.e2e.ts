import { $, browser, expect } from "@wdio/globals";
import { useDesktop } from "../lib/desktop";

const displayWindow = () => $("section.window:has(.display-properties-window)");

const wallpaper = () =>
  browser.execute(() => {
    const layer = document.querySelector<HTMLElement>(
      ".desktop-surface > .desktop-wallpaper",
    );
    if (!layer) return null;
    return {
      id: layer.dataset["wallpaper"],
      mask: getComputedStyle(layer, "::before").maskImage,
    };
  });

// Right-clicks the bare desktop, below the icon column and clear of the
// windows the page opens with.
const openDesktopMenu = () =>
  browser
    .action("pointer")
    .move({ x: 40, y: 760 })
    .down({ button: 2 })
    .up({ button: 2 })
    .perform();

describe("Website Display Properties", () => {
  useDesktop();

  it("paints the Bricks wallpaper behind the icons by default", async () => {
    const shown = await wallpaper();
    expect(shown?.id).toBe("bricks");
    expect(shown?.mask).toContain("data:image/svg+xml");
  });

  it("opens from the desktop menu and changes the wallpaper and theme, across a reload", async () => {
    await openDesktopMenu();
    await $(".menu").$("button=Display Properties").click();
    await expect(displayWindow()).toBeDisplayed();
    await expect($(".menu")).not.toBeExisting();

    await displayWindow().$("label=Honeycomb").click();
    await browser.waitUntil(
      async () => (await wallpaper())?.id === "honeycomb",
      {
        timeoutMsg: "the desktop did not repaint with Honeycomb",
      },
    );
    await displayWindow().$("label=Paper").click();
    await browser.waitUntil(
      () =>
        browser.execute(
          () => document.documentElement.getAttribute("data-theme") === "paper",
        ),
      { timeoutMsg: "the theme did not change to Paper" },
    );

    await browser.refresh();
    await browser.waitUntil(
      async () => (await wallpaper())?.id === "honeycomb",
      {
        timeoutMsg: "the wallpaper choice did not survive a reload",
      },
    );
    expect(
      await browser.execute(() =>
        document.documentElement.getAttribute("data-theme"),
      ),
    ).toBe("paper");
  });

  it("keeps a window's own right-click away from the desktop menu", async () => {
    await $("section.window:has(.resume-window) .window-titlebar").click({
      button: "right",
    });
    const offered = await browser.execute(() =>
      Array.from(document.querySelectorAll(".menu button"), (button) =>
        button.textContent?.trim(),
      ),
    );
    expect(offered).not.toContain("Display Properties");
  });
});
