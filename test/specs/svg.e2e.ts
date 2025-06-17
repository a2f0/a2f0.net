import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import { resumeConfiguration } from "../../configuration";
import waitForFileExists from "../lib/fs";
import SvgPage from "../pageobjects/svg.page";
import { testDownloadDir } from "../testDownloadDir";

const { darkBackgroundColor, lightBackgroundColor } = resumeConfiguration;

describe("SVG Resume", () => {
  it("should load", async () => {
    await SvgPage.open();
    await expect(SvgPage.svgResume).toBeExisting();
  });

  it("should work with the light/dark theme switcher", async () => {
    await SvgPage.open();
    expect(SvgPage.leftPartition).toBeExisting();
    const leftPartition = SvgPage.leftPartition;
    const viewMenuButton = SvgPage.viewMenuButton;
    const viewMenuItems = SvgPage.viewMenuItems;
    const darkThemeMenuOption = SvgPage.darkThemeMenuOption;
    const lightThemeMenuOption = SvgPage.lightThemeMenuOption;
    let leftPartitionColor = await leftPartition.getCSSProperty("fill");
    assert.strictEqual(
      leftPartitionColor.parsed.hex?.toUpperCase(),
      darkBackgroundColor,
    );
    viewMenuButton.click();
    await viewMenuItems.waitForDisplayed();
    lightThemeMenuOption.click();

    await leftPartition.waitUntil(
      async () => {
        leftPartitionColor = await leftPartition.getCSSProperty("fill");
        return (
          leftPartitionColor.parsed.hex?.toUpperCase() === lightBackgroundColor
        );
      },
      {
        timeout: 30000,
        timeoutMsg: "expected partition to be light after 3s",
      },
    );

    viewMenuButton.click();
    await viewMenuItems.waitForDisplayed();
    darkThemeMenuOption.click();

    await leftPartition.waitUntil(
      async () => {
        leftPartitionColor = await leftPartition.getCSSProperty("fill");
        return (
          leftPartitionColor.parsed.hex?.toUpperCase() === darkBackgroundColor
        );
      },
      {
        timeout: 30000,
        timeoutMsg: "expected partition to be dark after 3s",
      },
    );
  });

  it("should download an svg", async () => {
    await SvgPage.open();
    await expect(SvgPage.fileMenuButton).toBeExisting();
    await expect(SvgPage.fileMenuItems).toBeExisting();
    await expect(SvgPage.fileMenuItems).not.toBeDisplayed();
    await expect(SvgPage.downloadSvgMenuOption).not.toBeDisplayed();
    await SvgPage.fileMenuButton.click();
    await expect(SvgPage.fileMenuItems).toBeDisplayed();
    await expect(SvgPage.downloadSvgMenuOption).toBeDisplayed();
    await expect(SvgPage.downloadSvgMenuOption).toBeClickable();
    const filePath = path.join(testDownloadDir, "dan.sullivan.resume.svg");
    await expect(fs.existsSync(filePath)).toBe(false);
    await SvgPage.downloadSvgMenuOption.click();
    await browser.call(async () => {
      return await waitForFileExists(filePath, 3000);
    });
    await expect(SvgPage.downloadSvgMenuOption).not.toBeDisplayed();
  });
});
