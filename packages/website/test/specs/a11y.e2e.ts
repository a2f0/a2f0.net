import { $, browser, expect } from "@wdio/globals";

import { axeViolations } from "../axe";

const focused = () =>
  browser.execute(() => {
    const element = document.activeElement;
    return {
      label: element?.getAttribute("aria-label"),
      visible: element?.matches(":focus-visible") ?? false,
    };
  });

describe("Accessibility", () => {
  it("has no axe violations in the SVG view", async () => {
    await browser.url("/");
    expect(await axeViolations()).toEqual([]);
  });

  it("has no axe violations in the ASCII view", async () => {
    await browser.url("/");
    await $(".view-toggle").click();
    await expect($(".stage")).toHaveAttribute("data-view", "ascii");
    // The ASCII art is the logo drawn in characters.
    expect(await axeViolations({ logos: [".ascii"] })).toEqual([]);
  });

  it("reaches and operates the toolbar from the keyboard", async () => {
    await browser.url("/");
    await browser.keys("Tab");
    expect(await focused()).toEqual({ label: "Music player", visible: true });
    await browser.keys("Tab");
    expect(await focused()).toEqual({ label: "ASCII view", visible: true });

    await browser.keys("Enter");
    await expect($(".stage")).toHaveAttribute("data-view", "ascii");
    await expect($(".view-toggle")).toHaveAttribute("aria-pressed", "true");
    await browser.keys(" ");
    await expect($(".stage")).toHaveAttribute("data-view", "svg");
    await expect($(".view-toggle")).toHaveAttribute("aria-pressed", "false");
  });
});
