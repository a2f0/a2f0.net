import { $, $$, browser, expect } from "@wdio/globals";
import {
  asciiArtWindow,
  backgroundOf,
  dnbmWindow,
  frontWindowApp,
  playerWindow,
  resumeWindow,
  siteState,
  skylineWindow,
  taskbar,
  titleOf,
  useDesktop,
  waitForDnbmApps,
  waitForResume,
  waitForResumeFit,
} from "../lib/desktop";

// WebDriver's code for the Shift key.
const SHIFT = "\uE008";

// The focused window's title, and whether it shows a focus ring.
const focusRing = () =>
  browser.execute(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) throw new Error("Nothing focused");
    return {
      title: active.querySelector(".window-titlebar-title")?.textContent,
      outline: getComputedStyle(active).outlineStyle,
    };
  });

describe("Website desktop windows", () => {
  useDesktop();

  it("renders every app with the published window styles", async () => {
    await expect($$(".desktop-surface section.window")).toBeElementsArrayOfSize(
      5,
    );
    await expect(resumeWindow().$(".window-titlebar-title")).toHaveText(
      "Resume",
    );
    await expect(asciiArtWindow().$(".window-titlebar-title")).toHaveText(
      "a2f0.net",
    );
    await expect(skylineWindow().$(".window-titlebar-title")).toHaveText(
      "Skyline",
    );
    // The dnbm windows name their song once their app is ready.
    await expect(dnbmWindow().$(".window-titlebar-title")).toHaveText(
      titleOf("dnbm"),
    );
    await expect(playerWindow().$(".window-titlebar-title")).toHaveText(
      titleOf("dnbm player"),
    );
    expect((await siteState()).ascii?.trim().length).toBeGreaterThan(0);

    const styles = await browser.execute(() => {
      const frame = document.querySelector(
        "section.window:has(.ascii-art-window)",
      );
      if (!frame) throw new Error("Missing artwork window");
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
    // A window's scroll pane draws the package's thin scrollbar: a thumb of
    // the theme's #E5E5E5 foreground at 32% over the window, with no track.
    const scrollbar = await browser.execute(() => {
      const pane = document.querySelector(
        "section.window:has(.resume-window) .window-body-content-scroll",
      );
      if (!pane) throw new Error("Missing resume scroll pane");
      const style = getComputedStyle(pane);
      return { width: style.scrollbarWidth, color: style.scrollbarColor };
    });
    expect(scrollbar).toEqual({
      width: "thin",
      color: "color(srgb 0.898039 0.898039 0.898039 / 0.32) rgba(0, 0, 0, 0)",
    });
    // Around its page the resume shows the page's #0F0F0F background with a
    // tenth of its #DCDCDC foreground mixed in.
    expect(await backgroundOf("section.window:has(.resume-window)")).toBe(
      "color(srgb 0.139216 0.139216 0.139216)",
    );

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

  it("rings a focused window only for keyboard focus", async () => {
    // The resume starts in front and takes focus before any input, without a ring.
    expect(await frontWindowApp()).toBe("Resume");
    await expect(taskbar("Resume")).toHaveAttribute("aria-pressed", "true");
    expect(await focusRing()).toEqual({ title: "Resume", outline: "none" });

    // A window reopened from the keyboard shows where focus went.
    await browser.execute(() =>
      document
        .querySelector<HTMLButtonElement>(
          "section.window:has(.ascii-art-window) button[aria-label='Minimize window']",
        )
        ?.focus(),
    );
    await browser.keys("Enter");
    await expect(asciiArtWindow()).not.toBeExisting();
    await browser.execute(() =>
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          ".desktop-taskbar-button",
        ),
      ]
        .find((button) => button.textContent === "a2f0.net")
        ?.focus(),
    );
    await browser.keys("Enter");
    await expect(asciiArtWindow()).toBeExisting();
    await expect($("html")).toHaveAttribute("data-input", "keyboard");
    await browser.waitUntil(
      async () => (await focusRing()).outline === "solid",
      { timeoutMsg: "the keyboard-opened window showed no focus ring" },
    );
  });

  it("keeps pointer focus ringless", async () => {
    // Clicking the window that took focus on load leaves that focus in place,
    // so it must not bring back the load-time ring.
    await resumeWindow().$(".window-titlebar-title").click();
    expect(await focusRing()).toEqual({ title: "Resume", outline: "none" });

    // Shift alone is not keyboard use: some browsers ring the clicked window
    // on it, so the ring waits for the root to record keyboard input.
    await browser.action("key").down(SHIFT).up(SHIFT).perform();
    await expect($("html")).toHaveAttribute("data-input", "pointer");
    expect(await focusRing()).toEqual({ title: "Resume", outline: "none" });

    await resumeWindow().$("button[aria-label='Minimize window']").click();
    await expect(resumeWindow()).not.toBeExisting();
    await taskbar("Resume").click();
    await expect(resumeWindow()).toBeExisting();
    expect(await focusRing()).toEqual({ title: "Resume", outline: "none" });
  });

  it("opens apps from the start menu", async () => {
    const start = $(".desktop-taskbar button[aria-label='Menu']");
    await expect(start).toHaveAttribute("aria-haspopup", "menu");
    await expect(start).toHaveAttribute("aria-expanded", "false");
    // The button stays square and shows the graffiti restacked into a square
    // inside it, with the letters painted in its chrome.
    await expect(start.$("svg.desktop-start-icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      await browser.execute(() => {
        const button = document.querySelector(".start-menu-button");
        const icon = button?.querySelector("svg.desktop-start-icon");
        const face = icon?.querySelector("use:last-of-type");
        if (!button || !icon || !face)
          throw new Error("Missing the start icon");
        const outer = button.getBoundingClientRect();
        const inner = icon.getBoundingClientRect();
        return {
          squareButton: outer.width === outer.height,
          squareIcon: inner.width === inner.height && inner.width > 0,
          inside:
            inner.left >= outer.left &&
            inner.right <= outer.right &&
            inner.top >= outer.top &&
            inner.bottom <= outer.bottom,
          chrome: getComputedStyle(face).fill.includes("start-icon-silver"),
        };
      }),
    ).toEqual({
      squareButton: true,
      squareIcon: true,
      inside: true,
      chrome: true,
    });
    await skylineWindow().$("button[aria-label='Close window']").click();
    await expect(skylineWindow()).not.toBeExisting();
    await expect(taskbar("Skyline")).not.toBeExisting();

    await start.click();
    await expect(start).toHaveAttribute("aria-expanded", "true");
    const items = $$(".menu button");
    expect(await items.map((item) => item.getText())).toEqual([
      "dnbm",
      "Skyline",
      "dnbm player",
      "a2f0.net",
      "Resume",
    ]);
    await expect($$(".menu button svg.menu-item-icon")).toBeElementsArrayOfSize(
      5,
    );

    await $(".menu").$("button=Skyline").click();
    await expect($(".menu")).not.toBeExisting();
    await expect(start).toHaveAttribute("aria-expanded", "false");
    await expect(skylineWindow()).toBeExisting();
    expect(await frontWindowApp()).toBe("Skyline");
    await expect(taskbar("Skyline")).toHaveAttribute("aria-pressed", "true");
  });

  it("lists open windows in the taskbar, marking the front one", async () => {
    const taskbarState = () =>
      browser.execute(() =>
        [
          ...document.querySelectorAll<HTMLButtonElement>(
            ".desktop-taskbar-button",
          ),
        ].map((button) => {
          const style = getComputedStyle(button);
          const label = button.querySelector(".desktop-taskbar-label");
          return {
            title: label?.textContent,
            icon: button.querySelector("svg.desktop-taskbar-icon") !== null,
            pressed: button.getAttribute("aria-pressed"),
            state: button.dataset.state,
            muted: label ? getComputedStyle(label).opacity === "0.75" : null,
            // The chips take Tearleads' muted control border, not the text color.
            mutedBorder: style.borderTopColor !== style.color,
          };
        }),
      );
    await waitForDnbmApps();
    await resumeWindow().$("button[aria-label='Minimize window']").click();
    await playerWindow().$("button[aria-label='Minimize window']").click();
    await skylineWindow().$("button[aria-label='Close window']").click();
    await expect(skylineWindow()).not.toBeExisting();

    // A closed window leaves the taskbar; a minimized one stays, muted. The
    // sequencer's names its song, and the minimized player's only its app.
    const chip = { icon: true, mutedBorder: true };
    expect(await taskbarState()).toEqual([
      {
        ...chip,
        title: expect.stringMatching(/^.+ — dnbm$/),
        pressed: "false",
        state: "open",
        muted: false,
      },
      {
        ...chip,
        title: "dnbm player",
        pressed: "false",
        state: "minimized",
        muted: true,
      },
      // Only the front window's button is pressed.
      {
        ...chip,
        title: "a2f0.net",
        pressed: "true",
        state: "open",
        muted: false,
      },
      {
        ...chip,
        title: "Resume",
        pressed: "false",
        state: "minimized",
        muted: true,
      },
    ]);

    await taskbar("Resume").click();
    await expect(taskbar("Resume")).toHaveAttribute("aria-pressed", "true");
    await expect(taskbar("a2f0.net")).toHaveAttribute("aria-pressed", "false");
  });

  it("moves, resizes, minimizes, and reopens a window", async () => {
    // The resume opens as tall as the desktop; a taller viewport gives it room
    // to move down and puts its bottom edge clear of the taskbar.
    await waitForResumeFit();
    await browser.setViewport({ width: 1440, height: 1200 });
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
    await expect(taskbar("Resume")).not.toBeExisting();
    await $(".desktop-taskbar button[aria-label='Menu']").click();
    await $(".menu").$("button=Resume").click();
    await waitForResume();
    await expect(taskbar("Resume")).toBeExisting();
    await expect($$(".desktop-surface section.window")).toBeElementsArrayOfSize(
      5,
    );
  });
});
