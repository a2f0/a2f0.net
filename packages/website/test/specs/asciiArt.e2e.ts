import { browser, expect } from "@wdio/globals";
import {
  asciiArtWindow,
  resumeWindow,
  siteState,
  taskbar,
  useDesktop,
} from "../lib/desktop";

describe("Website artwork window", () => {
  useDesktop();

  it("puts the artwork controls in the window toolbar", async () => {
    await taskbar("a2f0.net").click();
    const toolbar = asciiArtWindow().$(
      "[role='toolbar'][aria-label='Toolbar']",
    );
    const labels = await toolbar
      .$$("button")
      .map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual(["Play code rain animation", "ASCII view"]);
    // The resume has no toolbar actions, so its window has no toolbar row.
    await expect(resumeWindow().$(".window-toolbar")).not.toBeExisting();

    const asciiView = toolbar.$("button[aria-label='ASCII view']");
    await expect(asciiView).toHaveAttribute("aria-pressed", "true");
    await asciiView.click();
    await browser.waitUntil(async () => (await siteState()).view === "svg", {
      timeoutMsg: "the toolbar did not switch the artwork to the SVG",
    });
    await expect(asciiView).toHaveAttribute("aria-pressed", "false");
    await expect(
      toolbar.$("button[aria-label='Play etching animation']"),
    ).toBeExisting();
  });
});
