import { $, browser, expect } from "@wdio/globals";
import { useDesktop } from "../lib/desktop";

const displayWindow = () => $("section.window:has(.display-properties-window)");

// The first render uses the generic window size; wait for the app's one-time
// content fit to set explicit dimensions before measuring the initial layout.
const waitForDisplayFit = () =>
  browser.waitUntil(
    () =>
      browser.execute(() => {
        const frame = document.querySelector<HTMLElement>(
          "section.window:has(.display-properties-window)",
        );
        return Boolean(frame?.style.width && frame.style.height);
      }),
    { timeoutMsg: "Display Properties did not fit its initial content size" },
  );

const openFittedDisplayProperties = async () => {
  await $(".desktop-taskbar button[aria-label='Menu']").click();
  // Native WebDriver input exercises the real fit/ResizeObserver ordering.
  // DOM .click() changes scheduling and can hide a lost initial fit.
  await $(".menu").$("button=Display Properties").click();
  await expect(displayWindow()).toBeDisplayed();
  await waitForDisplayFit();
};

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

const selectWallpaper = async (label: string, id: string) => {
  const choice = displayWindow().$(`label=${label}`);
  await choice.scrollIntoView();
  await choice.click();
  await browser.waitUntil(async () => (await wallpaper())?.id === id, {
    timeoutMsg: `the desktop did not repaint with ${label}`,
  });
};

// Measure whole cards against the scrollport, not just DOM visibility: a
// label below its clipped bottom still counts as displayed to WebDriver.
const displayLayout = () =>
  browser.execute(() => {
    const content = document.querySelector<HTMLElement>(".display-properties");
    const pane = content?.closest<HTMLElement>(".window-body-content-scroll");
    if (!content || !pane) throw new Error("Missing Display Properties pane");
    const bounds = pane.getBoundingClientRect();
    const padding = getComputedStyle(pane);
    // The fit contract reserves a vertical scrollbar even when nothing scrolls.
    // Measure this browser's thin scrollbar without changing the real pane.
    const probe = document.createElement("div");
    probe.style.cssText = `position:fixed;left:-1000px;top:-1000px;width:100px;height:100px;overflow:scroll;border:0;padding:0;scrollbar-width:${padding.scrollbarWidth}`;
    document.body.append(probe);
    const scrollbarWidth = probe.offsetWidth - probe.clientWidth;
    probe.remove();
    const frame = content.closest("section.window")?.getBoundingClientRect();
    const choices = [...content.querySelectorAll<HTMLElement>("label")];
    return {
      frame: frame && { width: frame.width, height: frame.height },
      scrollbarWidth,
      fittedContent: {
        width:
          pane.clientWidth -
          Number.parseFloat(padding.paddingLeft) -
          Number.parseFloat(padding.paddingRight),
        height:
          pane.clientHeight -
          Number.parseFloat(padding.paddingTop) -
          Number.parseFloat(padding.paddingBottom),
      },
      wallpapers: choices
        .filter((choice) => choice.matches(".display-properties-wallpaper"))
        .map((choice) => choice.textContent?.trim()),
      themes: choices
        .filter((choice) => choice.matches(".display-properties-theme"))
        .map((choice) => choice.textContent?.trim()),
      clipped: choices
        .filter((choice) => {
          const rect = choice.getBoundingClientRect();
          return (
            !choice.checkVisibility() ||
            rect.width === 0 ||
            rect.height === 0 ||
            rect.left < Math.max(0, bounds.left) ||
            rect.right > Math.min(innerWidth, bounds.left + pane.clientWidth) ||
            rect.top < Math.max(0, bounds.top) ||
            rect.bottom > Math.min(innerHeight, bounds.top + pane.clientHeight)
          );
        })
        .map((choice) => choice.textContent?.trim()),
      scrollTop: pane.scrollTop,
      scrollHeight: pane.scrollHeight,
      clientHeight: pane.clientHeight,
      clientWidth: pane.clientWidth,
      contentHeight: content.getBoundingClientRect().height,
    };
  });

// Read the actual preview cascade and SVG dimensions. A full-height tile
// must also fit horizontally, while the selected desktop stays at native size.
const patternScale = (id: string) =>
  browser.execute(async (value) => {
    const preview = document.querySelector(
      `.display-properties-wallpaper:has(input[value="${value}"]) .display-properties-swatch`,
    );
    const desktop = document.querySelector(
      ".desktop-surface > .desktop-wallpaper",
    );
    if (!preview || !desktop) throw new Error("Missing wallpaper layers");
    const swatch = getComputedStyle(preview, "::before");
    const surface = getComputedStyle(desktop, "::before");
    const image = new Image();
    image.src = swatch.maskImage.slice(5, -2);
    await image.decode();
    // HTMLImageElement rounds fractional intrinsic dimensions (Honeycomb's
    // 27.71px width); read the authored SVG dimensions without that rounding.
    const source = await fetch(image.src).then((response) => response.text());
    const svg = new DOMParser().parseFromString(source, "image/svg+xml");
    const tileWidth = Number(svg.documentElement.getAttribute("width"));
    const tileHeight = Number(svg.documentElement.getAttribute("height"));
    if (!(tileWidth > 0 && tileHeight > 0)) {
      throw new Error("Missing natural tile dimensions");
    }
    const height = Number.parseFloat(swatch.height);
    const width = Number.parseFloat(swatch.width);
    return {
      id: value,
      previewMaskSize: swatch.maskSize,
      previewRepeat: swatch.maskRepeat,
      previewPosition: swatch.maskPosition,
      previewWidth: width,
      previewHeight: height,
      scaledTileWidth: (tileWidth / tileHeight) * height,
      nativeTile: `${tileWidth}px ${tileHeight}px`,
      desktopMaskSize: surface.maskSize,
      sameArtwork: surface.maskImage === swatch.maskImage,
    };
  }, id);

// Rasterize the actual mask the desktop paints, not a test copy of its SVG.
// Resolve CSS colors in the browser and composite every pixel against the
// real icon label color, including the darkest part of each Paper pattern.
const patternReadability = () =>
  browser.execute(async () => {
    const layer = document.querySelector(
      ".desktop-surface > .desktop-wallpaper",
    );
    const label = document.querySelector(".desktop-icon-label");
    if (!layer || !label) throw new Error("Missing wallpaper or icon label");
    const inkStyle = getComputedStyle(layer, "::before");
    const image = new Image();
    image.src = inkStyle.maskImage.slice(5, -2);
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing raster context");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const rgb = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (color: number[]) =>
      color.reduce((sum, channel, index) => {
        const value = channel / 255;
        return (
          sum +
          (value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4) *
            [0.2126, 0.7152, 0.0722][index]
        );
      }, 0);
    const base = rgb(getComputedStyle(layer).backgroundColor);
    const ink = rgb(inkStyle.backgroundColor);
    const foreground = rgb(getComputedStyle(label).color);
    const text = luminance(foreground);
    let contrast = Number.POSITIVE_INFINITY;
    let covered = 0;
    for (let index = 3; index < data.length; index += 4) {
      const alpha = data[index] / 255;
      if (alpha > 0) covered += 1;
      const background = luminance(
        base.map(
          (value, channel) => value * (1 - alpha) + ink[channel] * alpha,
        ),
      );
      contrast = Math.min(
        contrast,
        (Math.max(text, background) + 0.05) /
          (Math.min(text, background) + 0.05),
      );
    }
    const alphaAt = (x: number, y: number) =>
      data[(y * canvas.width + x) * 4 + 3];
    let horizontalSeam = 0;
    let verticalSeam = 0;
    for (let y = 0; y < canvas.height; y += 1) {
      horizontalSeam += Math.abs(alphaAt(0, y) - alphaAt(canvas.width - 1, y));
    }
    for (let x = 0; x < canvas.width; x += 1) {
      verticalSeam += Math.abs(alphaAt(x, 0) - alphaAt(x, canvas.height - 1));
    }
    return {
      contrast,
      base,
      ink,
      foreground,
      coverage: covered / (canvas.width * canvas.height),
      // Mean alpha jump across each join; diagonal antialiasing can differ
      // by one pixel, but missing edge pieces or a clipped band cannot.
      seams: [horizontalSeam / canvas.height, verticalSeam / canvas.width],
    };
  });

describe("Website Display Properties", () => {
  useDesktop();

  for (const opening of [1, 2, 3, 4, 5]) {
    it(`shows every wallpaper and theme without scrolling on native opening ${opening}`, async () => {
      await openFittedDisplayProperties();
      const layout = await displayLayout();
      console.log(`native opening ${opening}: ${JSON.stringify(layout)}`);
      // Assert the requested content area, independently of platform chrome;
      // the generic 900×600 frame would falsely pass visibility alone.
      expect(layout.fittedContent).toEqual({
        width: 420 + layout.scrollbarWidth,
        height: 400,
      });
      expect(layout.wallpapers).toEqual([
        "Flux",
        "Aperture",
        "Isochrome",
        "Bricks",
        "Honeycomb",
        "Harlequin",
        "Chevron",
        "None",
      ]);
      expect(layout.themes).toEqual(["Graphite", "Paper"]);
      expect(layout.scrollTop).toBe(0);
      expect(layout.clipped).toEqual([]);
      expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight);
    });
  }

  it("fits whole tiles into previews while preserving native desktop tiles", async () => {
    await openDesktopMenu();
    await $(".menu").$("button=Display Properties").click();
    await expect(displayWindow()).toBeDisplayed();
    await waitForDisplayFit();
    const cards = await displayWindow().$$(
      ".display-properties-wallpaper:has(.display-properties-swatch[data-pattern])",
    );
    expect(cards).toHaveLength(7);
    for (const card of cards) {
      const label = await card.getText();
      const id = await card.$("input").getValue();
      await selectWallpaper(label, id);
      const scale = await patternScale(id);
      console.log(`wallpaper tile scale: ${JSON.stringify(scale)}`);
      expect(scale.previewMaskSize).toBe("auto 100%");
      expect(scale.previewRepeat).toBe("repeat");
      expect(scale.previewPosition).toBe("0% 0%");
      expect(scale.previewHeight).toBeGreaterThan(0);
      expect(scale.scaledTileWidth).toBeLessThanOrEqual(scale.previewWidth);
      expect(scale.desktopMaskSize).toBe(scale.nativeTile);
      expect(scale.sameArtwork).toBe(true);
    }
  });

  it("keeps every wallpaper and theme reachable by scrolling on a narrow desktop", async () => {
    // Keep the desktop layout while shrinking its available surface.
    await browser.setViewport({ width: 380, height: 360 });
    await openFittedDisplayProperties();
    const initial = await displayLayout();
    expect(initial.scrollTop).toBe(0);
    expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight);
    expect(initial.clipped).toContain("Paper");
    const cards = await displayWindow().$$(".display-properties-wallpaper");
    expect(cards).toHaveLength(8);
    for (const card of cards) {
      const label = await card.getText();
      const id = await card.$("input").getValue();
      await selectWallpaper(label, id);
      expect((await displayLayout()).clipped).not.toContain(label);
    }
    const themes = await displayWindow().$$(".display-properties-theme");
    expect(themes).toHaveLength(2);
    for (const theme of themes) {
      const label = await theme.getText();
      const id = await theme.$("input").getValue();
      await theme.scrollIntoView();
      await theme.click();
      await browser.waitUntil(
        () =>
          browser.execute(
            (value) => document.documentElement.dataset.theme === value,
            id,
          ),
        { timeoutMsg: `${label} was not reachable on the narrow desktop` },
      );
      expect((await displayLayout()).clipped).not.toContain(label);
    }
    expect((await displayLayout()).scrollTop).toBeGreaterThan(0);
  });

  it("paints Flux behind the icons for a new visitor", async () => {
    const shown = await wallpaper();
    expect(shown?.id).toBe("flux");
    expect(shown?.mask).toContain("data:image/svg+xml");
  });

  for (const [id, label] of [
    ["flux", "Flux"],
    ["aperture", "Aperture"],
    ["isochrome", "Isochrome"],
  ]) {
    it(`selects ${label}, keeps icons readable in both themes, and persists it`, async () => {
      await openDesktopMenu();
      await $(".menu").$("button=Display Properties").click();
      await expect(displayWindow()).toBeDisplayed();
      await expect($(".menu")).not.toBeExisting();
      // Move away first, so choosing the default is a real change too.
      await selectWallpaper("None", "plain");
      await selectWallpaper(label, id);
      const graphite = await patternReadability();
      const paperChoice = displayWindow().$("label=Paper");
      await paperChoice.scrollIntoView();
      await paperChoice.click();
      await browser.waitUntil(
        () =>
          browser.execute(
            () => document.documentElement.dataset.theme === "paper",
          ),
        { timeoutMsg: "the theme did not change to Paper" },
      );
      const paper = await patternReadability();
      for (const result of [graphite, paper]) {
        expect(result.contrast).toBeGreaterThanOrEqual(4.5);
        expect(result.coverage).toBeGreaterThan(0.15);
        expect(result.coverage).toBeLessThan(0.85);
        expect(Math.max(...result.seams)).toBeLessThan(4);
      }
      expect(graphite.base).not.toEqual(paper.base);
      expect(graphite.ink).not.toEqual(paper.ink);
      console.log(
        `${id} palette evidence: ${JSON.stringify({ graphite, paper })}`,
      );
      await browser.refresh();
      await browser.waitUntil(async () => (await wallpaper())?.id === id, {
        timeoutMsg: `${label} did not survive a reload`,
      });
      expect(
        await browser.execute(() => ({
          theme: localStorage.getItem("website.theme"),
          wallpaper: localStorage.getItem("website.wallpaper"),
        })),
      ).toEqual({ theme: "paper", wallpaper: id });
      expect(await patternReadability()).toEqual(paper);
    });
  }

  for (const [id, label] of [
    ["bricks", "Bricks"],
    ["honeycomb", "Honeycomb"],
    ["harlequin", "Harlequin"],
    ["chevron", "Chevron"],
    ["plain", "None"],
  ]) {
    it(`honors an existing ${label} preference and keeps its card reachable`, async () => {
      await browser.execute(
        (saved) => localStorage.setItem("website.wallpaper", saved),
        id,
      );
      await browser.refresh();
      await browser.waitUntil(async () => (await wallpaper())?.id === id);
      expect((await wallpaper())?.mask === "none").toBe(id === "plain");
      await openDesktopMenu();
      await $(".menu").$("button=Display Properties").click();
      await selectWallpaper("Flux", "flux");
      await selectWallpaper(label, id);
      expect(
        await browser.execute(() => localStorage.getItem("website.wallpaper")),
      ).toBe(id);
    });
  }

  it("falls back to Flux for an unrecognized saved id", async () => {
    await browser.execute(() =>
      localStorage.setItem("website.wallpaper", "removed-pattern"),
    );
    await browser.refresh();
    await browser.waitUntil(async () => (await wallpaper())?.id === "flux");
  });

  it("opens from the start menu with the keyboard", async () => {
    await $(".desktop-taskbar button[aria-label='Menu']").click();
    const item = $(".menu").$("button=Display Properties");
    await item.waitForDisplayed();
    await browser.execute(() => {
      const button = [...document.querySelectorAll(".menu button")].find(
        (candidate) => candidate.textContent?.trim() === "Display Properties",
      );
      if (button instanceof HTMLElement) button.focus();
    });
    await browser.keys("Enter");
    await expect(displayWindow()).toBeDisplayed();
    await selectWallpaper("Chevron", "chevron");
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
