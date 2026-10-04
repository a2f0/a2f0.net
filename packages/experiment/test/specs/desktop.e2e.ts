import { $, $$, browser, expect } from "@wdio/globals";

const resumeWindow = () => $("section.window:has(.resume-window)");
const asciiArtWindow = () => $("section.window:has(.ascii-art-window)");
const taskbar = (title: string) => $(`.desktop-taskbar-button=${title}`);

// A scrollbar changes the measured body width, replacing the SVG during
// layout. Query the current node each time instead of retaining a detached one.
const waitForResume = () =>
  browser.waitUntil(
    () =>
      browser.execute(() => {
        const svg = document.querySelector(".resume-window svg");
        if (!(svg instanceof SVGElement)) return false;
        const { width, height } = svg.getBoundingClientRect();
        return (
          width > 0 &&
          height > 0 &&
          svg.querySelector("text") !== null &&
          svg.checkVisibility({
            contentVisibilityAuto: true,
            opacityProperty: true,
            visibilityProperty: true,
          })
        );
      }),
    { timeoutMsg: "the current resume SVG did not render visibly" },
  );

const siteState = () =>
  browser.execute(() => {
    const root = document.querySelector(".ascii-art-window")?.shadowRoot;
    return {
      view: root?.querySelector(".stage")?.getAttribute("data-view"),
      ascii: root?.querySelector(".ascii")?.textContent,
      terminal: root?.querySelector(".canvas")?.hasAttribute("data-window"),
    };
  });

describe("Experiment desktop", () => {
  beforeEach(async () => {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.url("/");
    await waitForResume();
    await browser.waitUntil(async () => (await siteState()).view === "ascii", {
      timeoutMsg: "the website did not mount inside its shadow root",
    });
  });

  it("renders both apps with the published window styles", async () => {
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(2);
    await expect(resumeWindow().$(".window-titlebar-title")).toHaveText(
      "Resume",
    );
    await expect(asciiArtWindow().$(".window-titlebar-title")).toHaveText(
      "a2f0.net",
    );
    expect((await siteState()).ascii?.trim().length).toBeGreaterThan(0);

    const styles = await browser.execute(() => {
      const frame = document.querySelector("section.window");
      if (!frame) throw new Error("Missing window");
      const style = getComputedStyle(frame);
      return {
        position: style.position,
        borderWidth: style.borderTopWidth,
        borderColor: style.borderTopColor,
        radius: style.borderTopLeftRadius,
        background: style.backgroundColor,
      };
    });
    expect(styles).toEqual({
      position: "absolute",
      borderWidth: "1px",
      // The dark theme's muted edge, not the near-white foreground.
      borderColor: "rgb(59, 59, 59)",
      radius: "12px",
      background: "rgb(22, 22, 22)",
    });

    // The artwork paints to the window's bottom edge; the body clips it inside
    // the window's rounded border (12px less the 1px border).
    const corners = await browser.execute(() => {
      const body = document.querySelector(
        "section.window:has(.ascii-art-window) .window-body",
      );
      if (!body) throw new Error("Missing artwork window body");
      const style = getComputedStyle(body);
      return {
        left: style.borderBottomLeftRadius,
        right: style.borderBottomRightRadius,
        overflow: style.overflow,
      };
    });
    expect(corners).toEqual({
      left: "11px",
      right: "11px",
      overflow: "hidden",
    });
  });

  it("registers the resume and artwork menus", async () => {
    await taskbar("Resume").click();
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=Light Theme").click();
    await expect($("html")).toHaveAttribute("data-theme", "light");
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=150%").click();
    await resumeWindow().$("button=View").click();
    await expect(resumeWindow().$("button*=150%")).toHaveText("✓ 150%");
    // Close View first. While a menu is open, hovering File opens it, and the
    // click then closes it again whenever React renders the hover first.
    await resumeWindow().$("button=View").click();
    await expect(resumeWindow().$("button*=150%")).not.toBeExisting();
    await resumeWindow().$("button=File").click();
    await expect(resumeWindow().$("button=Download PDF")).toBeDisplayed();
    await expect(resumeWindow().$("button=Download SVG")).toBeDisplayed();

    await taskbar("a2f0.net").click();
    await asciiArtWindow().$("button=View").click();
    await asciiArtWindow().$("button*=ASCII View").click();
    await browser.waitUntil(async () => (await siteState()).view === "svg", {
      timeoutMsg: "the window menu did not update the artwork controls",
    });
  });

  it("puts the artwork controls in the window toolbar", async () => {
    const toolbar = asciiArtWindow().$(
      "[role='toolbar'][aria-label='Toolbar']",
    );
    const labels = await toolbar
      .$$("button")
      .map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Play code rain animation",
      "Music player (coming soon)",
      "ASCII view",
      "Terminal window",
    ]);
    await expect(toolbar.$("button[aria-label^='Music']")).toBeDisabled();
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

    const terminal = toolbar.$("button[aria-label='Terminal window']");
    await terminal.click();
    await expect(terminal).toHaveAttribute("aria-pressed", "true");
    expect((await siteState()).terminal).toBe(true);
  });

  it("moves, resizes, minimizes, and reopens a window", async () => {
    // Exercise the scrollbars that consume layout width on Linux too.
    await browser.execute(() => {
      const style = document.createElement("style");
      style.textContent =
        ".window-body-content-scroll::-webkit-scrollbar { width: 17px; height: 17px; }";
      document.head.append(style);
    });
    await taskbar("Resume").click();
    const before = await resumeWindow().getLocation();
    await browser
      .action("pointer")
      .move({ origin: resumeWindow().$(".window-titlebar-title") })
      .down()
      .move({ origin: "pointer", x: 40, y: 30, duration: 150 })
      .up()
      .perform();
    const after = await resumeWindow().getLocation();
    expect(after.x).toBe(before.x + 40);
    expect(after.y).toBe(before.y + 30);

    const sizeBefore = await resumeWindow().getSize();
    await browser
      .action("pointer")
      .move({ origin: resumeWindow().$(".window-resize--se") })
      .down()
      .move({ origin: "pointer", x: -60, y: -40, duration: 150 })
      .up()
      .perform();
    const sizeAfter = await resumeWindow().getSize();
    expect(sizeAfter.width).toBe(sizeBefore.width - 60);
    expect(sizeAfter.height).toBe(sizeBefore.height - 40);

    // A side handle resizes only its own axis.
    await browser
      .action("pointer")
      .move({ origin: resumeWindow().$(".window-resize--e") })
      .down()
      .move({ origin: "pointer", x: 30, y: 20, duration: 150 })
      .up()
      .perform();
    const sideAfter = await resumeWindow().getSize();
    expect(sideAfter.width).toBe(sizeAfter.width + 30);
    expect(sideAfter.height).toBe(sizeAfter.height);

    await resumeWindow().$("button[aria-label='Minimize window']").click();
    await expect(resumeWindow()).not.toBeExisting();
    await expect(taskbar("Resume")).toHaveAttribute("aria-pressed", "false");
    await taskbar("Resume").click();
    await waitForResume();
    await resumeWindow().$("button[aria-label='Close window']").click();
    await expect(resumeWindow()).not.toBeExisting();
    await taskbar("Resume").click();
    await waitForResume();
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(2);
  });

  it("starts maximized on narrow screens and switches apps through the taskbar", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await browser.refresh();
    await expect(asciiArtWindow()).toHaveElementClass("window--maximized");
    await taskbar("Resume").click();
    await expect(resumeWindow()).toHaveElementClass("window--maximized");
    await waitForResume();
    const width = await resumeWindow().getSize("width");
    expect(width).toBeLessThanOrEqual(390);
    await expect(taskbar("a2f0.net")).toBeDisplayed();
  });
});
