import { $, $$, browser, expect } from "@wdio/globals";

const resumeWindow = () => $("section.window:has(.resume-window)");
const websiteWindow = () => $("section.window:has(.website-window)");
const taskbar = (title: string) => $(`.desktop-taskbar-button=${title}`);

const siteState = () =>
  browser.execute(() => {
    const root = document.querySelector(".website-window")?.shadowRoot;
    return {
      view: root?.querySelector(".stage")?.getAttribute("data-view"),
      ascii: root?.querySelector(".ascii")?.textContent,
    };
  });

describe("Experiment desktop", () => {
  beforeEach(async () => {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.url("/");
    await expect($(".resume-window svg")).toBeDisplayed();
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
    await expect(websiteWindow().$(".window-titlebar-title")).toHaveText(
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
        radius: style.borderTopLeftRadius,
        background: style.backgroundColor,
      };
    });
    expect(styles).toEqual({
      position: "absolute",
      borderWidth: "1px",
      radius: "12px",
      background: "rgb(22, 22, 22)",
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
    await resumeWindow().$("button=File").click();
    await expect(resumeWindow().$("button=Download PDF")).toBeDisplayed();
    await expect(resumeWindow().$("button=Download SVG")).toBeDisplayed();

    await taskbar("a2f0.net").click();
    await websiteWindow().$("button=View").click();
    await websiteWindow().$("button*=ASCII View").click();
    await browser.waitUntil(async () => (await siteState()).view === "svg", {
      timeoutMsg: "the window menu did not update the artwork controls",
    });
  });

  it("moves, resizes, minimizes, and reopens a window", async () => {
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

    await resumeWindow().$("button[aria-label='Minimize window']").click();
    await expect(resumeWindow()).not.toBeExisting();
    await expect(taskbar("Resume")).toHaveAttribute("aria-pressed", "false");
    await taskbar("Resume").click();
    await expect($(".resume-window svg")).toBeDisplayed();
    await resumeWindow().$("button[aria-label='Close window']").click();
    await expect(resumeWindow()).not.toBeExisting();
    await taskbar("Resume").click();
    await expect($(".resume-window svg")).toBeDisplayed();
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(2);
  });

  it("starts maximized on narrow screens and switches apps through the taskbar", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await browser.refresh();
    await expect(websiteWindow()).toHaveElementClass("window--maximized");
    await taskbar("Resume").click();
    await expect(resumeWindow()).toHaveElementClass("window--maximized");
    await expect($(".resume-window svg")).toBeDisplayed();
    const width = await resumeWindow().getSize("width");
    expect(width).toBeLessThanOrEqual(390);
    await expect(taskbar("a2f0.net")).toBeDisplayed();
  });
});
