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

  it("has no axe violations with the terminal window open", async () => {
    await browser.url("/");
    await $(".window-toggle").click();
    await expect($(".window")).toBeDisplayed();
    expect(await axeViolations()).toEqual([]);
  });

  it("reaches and operates the toolbar from the keyboard", async () => {
    await browser.url("/");
    await browser.keys("Tab");
    expect(await focused()).toEqual({
      label: "Play etching animation",
      visible: true,
    });
    await browser.keys("Tab");
    expect(await focused()).toEqual({ label: "Music player", visible: true });
    await browser.keys("Tab");
    expect(await focused()).toEqual({ label: "ASCII view", visible: true });

    await browser.keys("Enter");
    await expect($(".stage")).toHaveAttribute("data-view", "ascii");
    await expect($(".view-toggle")).toHaveAttribute("aria-pressed", "true");
    // The play button names the animation of the view on show.
    await expect($(".play-toggle")).toHaveAttribute(
      "aria-label",
      "Play code rain animation",
    );
    await browser.keys(" ");
    await expect($(".stage")).toHaveAttribute("data-view", "svg");
    await expect($(".view-toggle")).toHaveAttribute("aria-pressed", "false");
    await expect($(".play-toggle")).toHaveAttribute(
      "aria-label",
      "Play etching animation",
    );

    await browser.keys("Tab");
    expect(await focused()).toEqual({
      label: "Terminal window",
      visible: true,
    });
    await browser.keys("Enter");
    await expect($(".window-toggle")).toHaveAttribute("aria-pressed", "true");
    await expect($(".window")).toBeDisplayed();
    await browser.keys(" ");
    await expect($(".window-toggle")).toHaveAttribute("aria-pressed", "false");
    await expect($(".window")).not.toBeDisplayed();
  });

  it("has no axe violations while etching", async () => {
    await browser.url("/");
    await $(".play-toggle").click();
    await expect($(".stage")).toHaveAttribute("data-etching");
    expect(await axeViolations()).toEqual([]);
  });

  it("has no axe violations while the code rain plays", async () => {
    await browser.url("/");
    await $(".view-toggle").click();
    await expect($(".stage")).toHaveAttribute("data-view", "ascii");
    await $(".play-toggle").click();
    await expect($(".stage")).toHaveAttribute("data-raining");
    expect(await axeViolations({ logos: [".ascii"] })).toEqual([]);
  });

  it("plays and stops the etching from the keyboard", async () => {
    await browser.url("/");
    await browser.keys("Tab");
    await browser.keys("Enter");
    await expect($(".stage")).toHaveAttribute("data-etching");
    await expect($(".play-toggle")).toHaveAttribute(
      "aria-label",
      "Stop etching animation",
    );
    await browser.keys("Enter");
    await expect($(".stage")).not.toHaveAttribute("data-etching");
    expect(await focused()).toEqual({
      label: "Play etching animation",
      visible: true,
    });
  });
});
