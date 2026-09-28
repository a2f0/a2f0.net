import { $, $$, browser, expect } from "@wdio/globals";

import { axeViolations } from "../lib/axe";
import waitForHydration from "../lib/hydration";

const focusedId = () => browser.execute(() => document.activeElement?.id);

const openResume = async () => {
  await browser.url("/");
  await $("#svgResume").waitForExist();
};

describe("Accessibility", () => {
  it("has no axe violations on the SVG resume", async () => {
    await openResume();
    expect(await axeViolations()).toEqual([]);
  });

  it("has no axe violations with either menu open", async () => {
    await openResume();
    await $("#menuButtonFile").click();
    await expect($("#menuItemsFile")).toBeDisplayed();
    expect(await axeViolations()).toEqual([]);

    await browser.keys("Escape");
    await expect($("#menuItemsFile")).not.toBeDisplayed();
    await $("#menuButtonView").click();
    await expect($("#menuItemsView")).toBeDisplayed();
    expect(await axeViolations()).toEqual([]);
  });

  it("has no axe violations in the light theme", async () => {
    await openResume();
    await $("#menuButtonView").click();
    await $("#lightThemeMenuOption").click();
    await expect($("#lightThemeMenuOption")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await axeViolations()).toEqual([]);
  });

  it("has no axe violations at phone width", async () => {
    await openResume();
    const viewport = await browser.execute(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    await browser.setViewport({ width: 390, height: 844 });
    try {
      await browser.waitUntil(
        () =>
          browser.execute(
            () => window.matchMedia("(max-width: 768px)").matches,
          ),
        { timeoutMsg: "expected a phone viewport" },
      );
      await browser.execute(() => window.dispatchEvent(new Event("resize")));
      // Phones hide the pre-rendered desktop SVG and generate their own once
      // the page hydrates. The app replaces that SVG while the viewport
      // settles, so look it up afresh on each check rather than waiting on
      // an element that may be detached.
      await waitForHydration("#svgContainer");
      await browser.waitUntil(
        async () => (await $("#svgResume.svg:not(.desktop-svg)")).isDisplayed(),
        { timeoutMsg: "expected the generated mobile resume to be displayed" },
      );
      expect(await axeViolations()).toEqual([]);
    } finally {
      await browser.setViewport(viewport);
    }
  });

  it("opens, uses, and closes the menus from the keyboard", async () => {
    await openResume();
    await browser.keys("Tab");
    expect(await focusedId()).toBe("menuButtonFile");
    await browser.keys("Enter");
    await expect($("#menuButtonFile")).toHaveAttribute("aria-expanded", "true");
    await browser.keys("Tab");
    expect(await focusedId()).toBe("downloadPdfMenuOption");

    // Escape closes the menu and returns focus to its button.
    await browser.keys("Escape");
    await expect($("#menuItemsFile")).not.toBeDisplayed();
    await expect($("#menuButtonFile")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(await focusedId()).toBe("menuButtonFile");

    // Choosing an option closes the menu, again returning focus.
    await browser.keys("Tab");
    expect(await focusedId()).toBe("menuButtonView");
    await browser.keys(" ");
    await browser.keys(["Tab", "Tab"]);
    expect(await focusedId()).toBe("lightThemeMenuOption");
    await browser.keys("Enter");
    await expect($("#menuItemsView")).not.toBeDisplayed();
    await expect($("#lightThemeMenuOption")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await focusedId()).toBe("menuButtonView");

    // Tabbing past the last option closes the menu.
    await browser.keys("Enter");
    await expect($("#menuItemsView")).toBeDisplayed();
    const options = await $$("#menuItemsView a, #menuItemsView button").length;
    await browser.keys(Array(options + 1).fill("Tab"));
    await expect($("#menuItemsView")).not.toBeDisplayed();
  });

  // Last, because the embedded PDF viewer can leave the session targeting
  // another browsing context.
  it("has no axe violations on the PDF preview", async () => {
    await browser.url("/pdf");
    await $("#pdfObjectContainer iframe").waitForExist();
    expect(await axeViolations()).toEqual([]);
  });
});
