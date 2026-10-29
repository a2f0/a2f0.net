import { $, $$, browser, expect } from "@wdio/globals";
import {
  resumeTextFills,
  resumeWindow,
  skylineWindow,
  taskbar,
  useDesktop,
  waitForResume,
} from "../lib/desktop";

describe("Website routed shell", () => {
  useDesktop();

  it("shows one app at a time in the routed shell on a phone", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await browser.refresh();
    await expect($(".routed-pane.routed-pane--mobile")).toBeDisplayed();
    await expect($(".desktop-taskbar")).not.toBeExisting();
    await expect($("html")).toHaveAttribute("data-navigation-mode", "routed");
    // The root route shows the artwork with its controls in the app bar's
    // toolbar.
    await expect($(".routed-pane-main .ascii-art-window")).toBeExisting();
    await expect(
      $(".routed-pane-toolbar button[aria-label='ASCII view']"),
    ).toBeDisplayed();
    // Windows do not suit a phone, so the tray offers no switch to them.
    await expect(
      $("button[aria-label='Switch to windowed layout']"),
    ).not.toBeExisting();

    // The launcher sheet offers every app, in launch order, under the
    // stacked graffiti.
    const menu = $(".routed-pane-taskbar button[aria-label='Menu']");
    await expect(menu.$("svg.desktop-start-icon")).toBeExisting();
    await menu.click();
    await expect($(".routed-pane-sheet")).toHaveAttribute("data-open", "true");
    expect(
      await $$(".routed-pane-sheet-tile").map((tile) => tile.getText()),
    ).toEqual(["dnbm", "Skyline", "dnbm player", "a2f0.net", "Resume"]);

    // A tile navigates: the resume shows in the column layout, with its menu
    // actions in the toolbar, and Back returns to the artwork.
    await $(".routed-pane-sheet-tile[href='/app/resume']").click();
    await expect($(".routed-pane-sheet")).toHaveAttribute("data-open", "false");
    await browser.waitUntil(
      async () => (await browser.getUrl()).endsWith("/app/resume"),
      { timeoutMsg: "the resume tile did not navigate to its route" },
    );
    await waitForResume();
    expect(
      await $$(".routed-pane-toolbar button").map((button) =>
        button.getAttribute("aria-label"),
      ),
    ).toEqual(["Light Theme", "Download PDF", "Download SVG", "Print"]);
    await $(".routed-pane-toolbar button[aria-label='Light Theme']").click();
    await expect(
      $(".routed-pane-toolbar button[aria-label='Dark Theme']"),
    ).toBeDisplayed();

    await browser.back();
    await expect($(".routed-pane-main .ascii-art-window")).toBeExisting();
    expect(new URL(await browser.getUrl()).pathname).toBe("/");
    await browser.forward();
    await expect($(".routed-pane-main .resume-window")).toBeExisting();
  });

  it("fills the routed content pane with the edge-to-edge apps, unscrolled", async () => {
    await browser.setViewport({ width: 1100, height: 800 });
    await browser.refresh();
    await $(
      ".desktop-taskbar-end button[aria-label='Switch to iPad / mobile layout']",
    ).click();
    await $("button[aria-label='Expand navigation rail']").click();
    for (const [app, title, root] of [
      ["ascii-art", "a2f0.net", ".ascii-art-window"],
      ["dnbm", "dnbm", ".dnbm-window"],
      ["skyline", "Skyline", ".skyline-window"],
      ["dnbm-player", "dnbm player", ".dnbm-player-window"],
    ]) {
      const link = $(`.routed-pane-nav-link[href='/app/${app}']`);
      await expect(link).toHaveText(title);
      await link.click();
      await expect($(`.routed-pane-main ${root}`)).toBeExisting();
      // Inside a window the app reaches past the body's padding; the routed
      // pane has none, so the app fills it exactly and nothing scrolls.
      expect(
        await browser.execute((selector) => {
          const main = document.querySelector(".routed-pane-main");
          const app = document.querySelector(selector);
          if (!main || !app) throw new Error(`Missing ${selector}`);
          const pane = main.getBoundingClientRect();
          const box = app.getBoundingClientRect();
          return {
            scrolls:
              main.scrollWidth > main.clientWidth ||
              main.scrollHeight > main.clientHeight,
            fills:
              Math.round(box.left) === Math.round(pane.left) &&
              Math.round(box.top) === Math.round(pane.top) &&
              Math.round(box.width) === main.clientWidth &&
              Math.round(box.height) === main.clientHeight,
          };
        }, root),
      ).toEqual({ scrolls: false, fills: true });
    }
  });

  it("opens an app's route directly in the routed shell", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await browser.url("/app/dnbm-player");
    await expect($(".routed-pane-main .dnbm-player-window")).toBeExisting();
    await expect(
      $(".routed-pane-toolbar button[aria-label='Next']"),
    ).toBeDisplayed();
    // The View menu's Stop, which the routed shell has no menu bar for, joins
    // the toolbar after play.
    await browser.waitUntil(
      async () =>
        (
          await $$(".routed-pane-toolbar button").map((button) =>
            button.getAttribute("aria-label"),
          )
        ).join() === "Previous,Play,Stop,Next,Shuffle,Repeat",
      { timeoutMsg: "the routed player toolbar lacks Stop after play" },
    );
  });

  it("puts the dnbm file commands in the routed toolbar", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await browser.url("/app/dnbm");
    const routedAction = (label: string) =>
      $(`.routed-pane-toolbar button[aria-label='${label}']`);
    await expect(routedAction("Play")).toBeEnabled();
    expect(
      await $$(".routed-pane-toolbar button").map((button) =>
        button.getAttribute("aria-label"),
      ),
    ).toEqual([
      "New",
      "Open…",
      "Save",
      "Save As…",
      "Export WAV…",
      "Play",
      "Undo",
      "Redo",
    ]);

    // The pickers open inside the press, with its user activation, as they do
    // from the desktop window's File menu.
    await browser.execute(() => {
      const opened: [string, boolean][] = [];
      const picker = (name: string) => async () => {
        opened.push([name, navigator.userActivation.isActive]);
        throw new DOMException("The user aborted a request.", "AbortError");
      };
      Object.assign(window, {
        dnbmPickers: opened,
        showOpenFilePicker: picker("open"),
        showSaveFilePicker: picker("save"),
      });
    });
    const pickers = () =>
      browser.execute(
        () =>
          (window as unknown as { dnbmPickers: [string, boolean][] })
            .dnbmPickers,
      );
    await routedAction("Open…").click();
    await browser.waitUntil(async () => (await pickers()).length === 1, {
      timeoutMsg: "Open… did not open a picker",
    });
    await routedAction("Save As…").click();
    await browser.waitUntil(async () => (await pickers()).length === 2, {
      timeoutMsg: "Save As… did not open a picker",
    });
    expect(await pickers()).toEqual([
      ["open", true],
      ["save", true],
    ]);
  });

  it("keeps its layout and apps when the window resizes", async () => {
    await taskbar("Resume").click();
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=Light Theme").click();
    await browser.waitUntil(
      async () => (await resumeTextFills()).includes("#555555"),
      { timeoutMsg: "the resume did not take the light theme" },
    );

    // Narrower than windows suit, the page keeps the layout it loaded with:
    // a switch would remount every app.
    await browser.setViewport({ width: 900, height: 900 });
    await browser.pause(500);
    await expect($(".desktop-taskbar")).toBeDisplayed();
    await expect($("html")).toHaveAttribute("data-navigation-mode", "windowed");
    await expect($$(".desktop-surface section.window")).toBeElementsArrayOfSize(
      5,
    );
    expect(await resumeTextFills()).toContain("#555555");
  });

  it("keeps the resume's theme across a layout switch", async () => {
    await taskbar("Resume").click();
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=Light Theme").click();
    await $(
      ".desktop-taskbar-end button[aria-label='Switch to iPad / mobile layout']",
    ).click();
    await $("button[aria-label='Expand navigation rail']").click();
    await $(".routed-pane-nav-link[href='/app/resume']").click();
    await waitForResume();
    // The light theme carried over, so the toolbar offers the dark one.
    await expect(
      $(".routed-pane-toolbar button[aria-label='Dark Theme']"),
    ).toBeDisplayed();
    expect(await resumeTextFills()).toContain("#555555");
  });

  it("switches between the windowed desktop and the routed shell", async () => {
    const toRouted = () =>
      $(
        ".desktop-taskbar-end button[aria-label='Switch to iPad / mobile layout']",
      ).click();
    const toWindowed = () =>
      $(
        ".routed-pane-taskbar-end button[aria-label='Switch to windowed layout']",
      ).click();

    // A window closed before the switch stays closed after switching back.
    await skylineWindow().$("button[aria-label='Close window']").click();
    await expect(skylineWindow()).not.toBeExisting();

    // The desktop's corner offers the routed layout.
    await toRouted();
    await expect($(".routed-pane.routed-pane--tablet")).toBeDisplayed();
    await expect($(".routed-pane-title")).toHaveText("a2f0.net");

    // The tablet rail lists every app; a link opens it.
    await $("button[aria-label='Expand navigation rail']").click();
    await $(".routed-pane-nav-link[href='/app/resume']").click();
    await expect($(".routed-pane-title")).toHaveText("Resume");
    await waitForResume();

    // The tray switches back to the windows as they were.
    await toWindowed();
    await expect($(".desktop-taskbar")).toBeDisplayed();
    await expect($("html")).toHaveAttribute("data-navigation-mode", "windowed");
    await expect($$(".desktop-surface section.window")).toBeElementsArrayOfSize(
      4,
    );
    await expect(skylineWindow()).not.toBeExisting();

    // The choice survives a reload.
    await toRouted();
    await browser.url("/");
    await expect($(".routed-pane")).toBeDisplayed();
    await toWindowed();
    await expect($(".desktop-taskbar")).toBeDisplayed();
  });
});
