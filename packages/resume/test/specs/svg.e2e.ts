import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

import { resumeConfiguration } from "@a2f0/shared/configuration";
import { MAIN_WIDTH, mobileQuery } from "../../lib/breakpoints";
import waitForDownload from "../lib/fs";
import waitForHydration from "../lib/hydration";
import SvgPage from "../pageobjects/svg.page";
import { testDownloadDir } from "../testDownloadDir";

const { darkBackgroundColor, lightBackgroundColor } = resumeConfiguration;

// The page opens at a scale of 1.5, where the desktop column needs 1275px.
const DEFAULT_SCALE = 1.5;
const isMobileViewport = () =>
  browser.execute(
    (query: string) => window.matchMedia(query).matches,
    mobileQuery(DEFAULT_SCALE),
  );

// The app replaces the SVG while the viewport settles, so look it up afresh
// on each retry instead of holding an element that may have been detached.
const waitForDisplayed = (selector: string) =>
  browser.waitUntil(async () => (await $(selector)).isDisplayed(), {
    timeoutMsg: `expected ${selector} to be displayed`,
  });

describe("SVG Resume", () => {
  it("includes the desktop resume and its styles without JavaScript", async () => {
    const response = await fetch(new URL("/", browser.options.baseUrl));
    const html = await response.text();
    assert.strictEqual(response.status, 200);
    const dom = new JSDOM(html);
    const document: Document = dom.window.document;
    assert.ok(document.querySelector("#svgResume #firstName"));
    assert.strictEqual(
      document.querySelector("#firstName")?.getAttribute("font-family"),
      "Arimo, Arial, sans-serif",
    );
    const styles = Array.from(document.querySelectorAll("style[data-styled]"))
      .map((style) => style.textContent)
      .join("\n");
    assert.match(styles, /Arimo\.woff2/);
    assert.match(
      styles,
      /@media \(width < 1275px\)\{[^}]*\.desktop-svg\{display:none;/,
    );
    dom.window.close();
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

  it("paints selected text gray in both themes", async () => {
    await SvgPage.open();
    await waitForHydration("#svgContainer");
    // Selects the last name, which is drawn in the highlight color, and
    // returns the two colors painted most over it. Computed styles would
    // miss a selection fill that the browser ignores.
    const paintedSelection = async () => {
      const area = await browser.execute(async () => {
        // The font blocks text rendering until it loads, while the
        // selection highlight paints regardless.
        await document.fonts.load("400 12pt Arimo");
        const text = document.querySelector("#lastName");
        const selection = getSelection();
        if (!text || !selection) return null;
        const range = document.createRange();
        range.selectNodeContents(text);
        selection.removeAllRanges();
        selection.addRange(range);
        const { x, y, width, height } = text.getBoundingClientRect();
        const scale = window.devicePixelRatio;
        return [x, y, width, height].map((value) => Math.round(value * scale));
      });
      if (!area) return null;
      const screenshot = await browser.takeScreenshot();
      return browser.execute(
        async (png, [x, y, width, height]) => {
          const image = new Image();
          image.src = `data:image/png;base64,${png}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d");
          if (!context) return null;
          context.drawImage(image, 0, 0);
          const { data } = context.getImageData(x, y, width, height);
          // Only the most painted colors are checked; Linux draws text with
          // subpixel antialiasing, which tints the glyph edges.
          const counts = new Map<string, number>();
          for (let i = 0; i < data.length; i += 4) {
            const channels = [data[i], data[i + 1], data[i + 2]];
            const color = `#${channels
              .map((value) => value.toString(16).padStart(2, "0"))
              .join("")
              .toUpperCase()}`;
            counts.set(color, (counts.get(color) ?? 0) + 1);
          }
          const [highlight, text] = [...counts]
            .sort((a, b) => b[1] - a[1])
            .map(([color]) => color);
          return { highlight, text };
        },
        screenshot,
        area,
      );
    };
    expect(await paintedSelection()).toEqual({
      highlight: "#6F6F6F",
      text: "#FFFFFF",
    });

    await SvgPage.viewMenuButton.click();
    await SvgPage.viewMenuItems.waitForDisplayed();
    await SvgPage.lightThemeMenuOption.click();
    await browser.waitUntil(
      async () => (await paintedSelection())?.highlight === "#8C8C8C",
      { timeoutMsg: "expected the light theme's selection" },
    );
    expect(await paintedSelection()).toEqual({
      highlight: "#8C8C8C",
      text: "#000000",
    });
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
    const download = await browser.call(() => waitForDownload(filePath));
    const svg = download.toString("utf8");
    expect(svg).toMatch(/^<svg[\s>]/);
    expect(svg.trimEnd()).toMatch(/<\/svg>$/);
    await expect(SvgPage.downloadSvgMenuOption).not.toBeDisplayed();
  });

  it("generates the mobile layout after hydration", async () => {
    await SvgPage.open();
    await browser.setViewport({ width: 390, height: 844 });
    await browser.waitUntil(isMobileViewport, {
      timeoutMsg: "expected a mobile viewport",
    });
    await browser.execute(() => window.dispatchEvent(new Event("resize")));
    await waitForHydration("#svgContainer");
    await browser.waitUntil(
      async () => !(await SvgPage.leftPartition.isExisting()),
      { timeoutMsg: "expected the hydrated mobile layout" },
    );
    await waitForDisplayed("#svgResume");
    await waitForDisplayed("#firstName");

    // Any viewport too narrow for the desktop column is mobile.
    const widestMobile = MAIN_WIDTH * DEFAULT_SCALE - 1;
    await browser.setViewport({ width: widestMobile, height: 844 });
    await browser.waitUntil(isMobileViewport, {
      timeoutMsg: `expected the ${widestMobile}px viewport to be mobile`,
    });
    await browser.execute(() => window.dispatchEvent(new Event("resize")));
    const getMobileLayout = () =>
      browser.execute(() => {
        const svg = document.querySelector<SVGSVGElement>("#svgResume");
        const bounds = svg?.getBoundingClientRect();
        return {
          clientWidth: document.documentElement.clientWidth,
          svgClass: svg?.getAttribute("class"),
          svgWidth: svg?.getAttribute("width"),
          display: svg ? window.getComputedStyle(svg).display : null,
          boundsWidth: bounds?.width ?? 0,
          boundsHeight: bounds?.height ?? 0,
        };
      });
    try {
      await browser.waitUntil(async () => {
        const layout = await getMobileLayout();
        return (
          layout.svgClass === "svg" &&
          layout.svgWidth === `${layout.clientWidth}px` &&
          layout.display !== "none" &&
          layout.boundsWidth > 0 &&
          layout.boundsHeight > 0
        );
      });
    } catch {
      throw new Error(
        `Expected a visible mobile SVG at ${widestMobile}px: ${JSON.stringify(await getMobileLayout())}`,
      );
    }
    await expect(SvgPage.leftPartition).not.toBeExisting();

    await browser.setViewport({ width: 1366, height: 900 });
    await browser.execute(() => window.dispatchEvent(new Event("resize")));
    await expect(SvgPage.leftPartition).toBeExisting();
  });

  it("follows width changes that fire no resize event", async () => {
    await SvgPage.open();
    // Scrollbars that take up width, as on Linux; styling them turns off
    // the overlay scrollbars macOS uses.
    await browser.execute(() =>
      document.head.insertAdjacentHTML(
        "beforeend",
        "<style>::-webkit-scrollbar{width:15px}::-webkit-scrollbar-thumb{background:#666}</style>",
      ),
    );
    await browser.setViewport({ width: 390, height: 844 });
    await browser.waitUntil(isMobileViewport, {
      timeoutMsg: "expected a mobile viewport",
    });
    await browser.execute(() => window.dispatchEvent(new Event("resize")));
    await waitForHydration("#svgContainer");
    const layout = () =>
      browser.execute(() => ({
        clientWidth: document.documentElement.clientWidth,
        svgWidth: document
          .querySelector("#svgResume.svg:not(.desktop-svg)")
          ?.getAttribute("width"),
      }));
    await browser.waitUntil(
      async () => {
        const { clientWidth, svgWidth } = await layout();
        return svgWidth === `${clientWidth}px`;
      },
      { timeoutMsg: "expected the mobile resume to fit the page" },
    );
    const { clientWidth: narrow } = await layout();

    // Hiding the scrollbar widens the page without firing a resize event,
    // as a scrollbar appearing narrows it; the resume must follow either way.
    await browser.execute(() => {
      document.documentElement.style.overflowY = "hidden";
    });
    try {
      await browser.waitUntil(
        async () => {
          const { clientWidth, svgWidth } = await layout();
          return clientWidth > narrow && svgWidth === `${clientWidth}px`;
        },
        {
          timeoutMsg: `expected the resume to follow the wider page: ${JSON.stringify(
            await layout(),
          )}`,
        },
      );
    } finally {
      await browser.execute(() => {
        document.documentElement.style.overflowY = "";
      });
      await browser.setViewport({ width: 1366, height: 900 });
    }
  });

  it("renders mobile content when the font fails to load", async () => {
    // Start from the desktop layout even if an earlier test left a mobile one.
    await browser.setViewport({ width: 1366, height: 900 });
    await SvgPage.open();
    await browser.execute(() => {
      document.fonts.load = async () => {
        throw new Error("Font unavailable");
      };
    });
    await browser.setViewport({ width: 390, height: 844 });
    await waitForHydration("#svgContainer");
    await browser.waitUntil(
      async () => !(await SvgPage.leftPartition.isExisting()),
      { timeoutMsg: "expected the fallback mobile layout" },
    );
    await waitForDisplayed("#svgResume");
    expect(await $("#firstName").getAttribute("font-family")).toBe("Helvetica");
  });
});
