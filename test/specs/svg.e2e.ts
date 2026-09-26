import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import { resumeConfiguration } from "../../configuration";
import waitForFileExists from "../lib/fs";
import SvgPage from "../pageobjects/svg.page";
import { testDownloadDir } from "../testDownloadDir";

const { darkBackgroundColor, lightBackgroundColor } = resumeConfiguration;

describe("SVG Resume", () => {
  it("includes the desktop resume in the exported HTML", async () => {
    const response = await fetch(new URL("/", browser.options.baseUrl));
    const html = await response.text();
    assert.strictEqual(response.status, 200);
    assert.match(html, /id="svgResume"/);
    assert.match(html, /id="firstName"/);
    assert.match(html, /font-family="Arimo, Arial, sans-serif"/);
  });

  it("should load", async () => {
    await SvgPage.open();
    await expect(SvgPage.svgResume).toBeExisting();
    const layout = await browser.execute(async () => {
      await document.fonts.load("400 12pt Arimo");
      const svg = document.querySelector<SVGSVGElement>("#svgResume");
      if (!svg) throw new Error("Resume SVG is missing");
      const lines = svg.querySelectorAll<SVGTextElement>(
        'text[id^="positionAccomplishmentLine"]',
      );
      return {
        fontLoaded: document.fonts.check("400 12pt Arimo"),
        maxRight: Math.max(
          ...Array.from(lines, (line) => {
            const bounds = line.getBBox();
            return bounds.x + bounds.width;
          }),
        ),
        viewBoxWidth: svg.viewBox.baseVal.width,
      };
    });
    assert.ok(layout.fontLoaded);
    assert.ok(layout.maxRight <= layout.viewBoxWidth);
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

  it("generates the mobile layout after hydration", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await SvgPage.open();
    await expect(SvgPage.svgResume).toBeDisplayed();
    await browser.waitUntil(
      async () => !(await SvgPage.leftPartition.isExisting()),
      { timeoutMsg: "expected the hydrated mobile layout" },
    );
    await expect($("#firstName")).toBeDisplayed();

    await browser.setViewport({ width: 768, height: 844 });
    await expect(SvgPage.svgResume).toBeDisplayed();
    await expect(SvgPage.leftPartition).not.toBeExisting();
    await expect(SvgPage.svgResume).toHaveAttribute("width", "768px");

    await browser.setViewport({ width: 1366, height: 900 });
    await expect(SvgPage.leftPartition).toBeExisting();
  });

  it("renders mobile content when the font fails to load", async () => {
    await SvgPage.open();
    await browser.execute(() => {
      document.fonts.load = async () => {
        throw new Error("Font unavailable");
      };
    });
    await browser.setViewport({ width: 390, height: 844 });
    await browser.waitUntil(
      async () => !(await SvgPage.leftPartition.isExisting()),
      { timeoutMsg: "expected the fallback mobile layout" },
    );
    await expect(SvgPage.svgResume).toBeDisplayed();
    await expect($("#firstName")).toHaveAttribute("font-family", "Helvetica");
  });
});
