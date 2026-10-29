import { $, browser, expect } from "@wdio/globals";
import {
  backgroundOf,
  dnbmAction,
  dnbmRegion,
  dnbmWindow,
  playerAction,
  playerRegion,
  pressInApp,
  resumeTextFills,
  taskbar,
  useDesktop,
  waitForDnbmApps,
  waitForResume,
  waitForSkyline,
} from "../lib/desktop";

describe("Website themes", () => {
  useDesktop();

  it("switches the desktop's theme from the taskbar's lower-right corner", async () => {
    // A saved choice for the removed blue theme falls back to Graphite.
    await browser.execute(() => {
      localStorage.setItem("website.theme", "skyline");
    });
    await browser.refresh();
    await waitForResume();
    const themeSwitch = () => $(".desktop-taskbar-end > button:last-child");
    const themeState = () =>
      browser.execute(() => {
        const root = document.documentElement;
        const control = document.querySelector(
          ".desktop-taskbar-end > button:last-child",
        );
        const taskbar = document.querySelector(".desktop-taskbar");
        const titlebar = document.querySelector(".window-titlebar");
        if (!control || !taskbar || !titlebar) {
          throw new Error("Missing the taskbar, its switch, or a title bar");
        }
        const corner = control.getBoundingClientRect();
        return {
          theme: root.dataset.theme,
          scheme: root.dataset.themeScheme,
          // The switch's gap to the screen's right and bottom edges.
          corner: [innerWidth - corner.right, innerHeight - corner.bottom],
          taskbar: getComputedStyle(taskbar).backgroundColor,
          titlebar: getComputedStyle(titlebar).backgroundColor,
          // Minimized windows' labels, muted less in Paper to keep 4.5:1.
          muted: getComputedStyle(root).getPropertyValue("--opacity-muted"),
        };
      });

    // Graphite, the dark default, with the switch last in the corner, past
    // the layout switch, offering the next theme.
    await expect(themeSwitch()).toHaveAttribute(
      "aria-label",
      "Switch to Paper theme",
    );
    await expect(
      $(".desktop-taskbar-end > button:first-child"),
    ).toHaveAttribute("aria-label", "Switch to iPad / mobile layout");
    const corner = [16, 16];
    expect(await themeState()).toEqual({
      theme: "graphite",
      scheme: "dark",
      corner,
      taskbar: "rgb(40, 40, 40)",
      titlebar: "rgb(40, 40, 40)",
      muted: "0.75",
    });

    // Each click moves to the next theme and recolors the chrome.
    await themeSwitch().click();
    expect(await themeState()).toEqual({
      theme: "paper",
      scheme: "light",
      corner,
      taskbar: "rgb(228, 228, 228)",
      titlebar: "rgb(228, 228, 228)",
      muted: "0.9",
    });
    // The choice survives a reload, and the cycle wraps to the default.
    await browser.url("/");
    await waitForResume();
    expect((await themeState()).theme).toBe("paper");
    await expect(themeSwitch()).toHaveAttribute(
      "aria-label",
      "Switch to Graphite theme",
    );
    await themeSwitch().click();
    expect((await themeState()).theme).toBe("graphite");
  });

  it("recolors every mini-app while preserving music playback and edits", async () => {
    await waitForDnbmApps();
    await waitForSkyline();
    await taskbar("dnbm").click();
    await pressInApp(".dnbm-window [role=region]", ".grid-row .cell");
    await expect(dnbmAction("Undo")).toBeEnabled();
    await taskbar("dnbm player").click();
    await playerAction("Play").click();
    const player = () => playerRegion().shadow$(".player");
    await expect(player()).toHaveAttribute("data-state", "playing");

    const themeSwitch = () => $(".desktop-taskbar-end > button:last-child");
    const palettes = () =>
      browser.execute(() => {
        const frameStyle = (selector: string) => {
          const frame = document
            .querySelector(`${selector} [role=region]`)
            ?.shadowRoot?.querySelector(".frame");
          if (!frame) throw new Error(`Missing ${selector}'s frame`);
          const style = getComputedStyle(frame);
          return { background: style.backgroundColor, color: style.color };
        };
        const art = document.querySelector(".ascii-art-window");
        if (!art) throw new Error("Missing the artwork");
        const skyline = document.querySelector(".skyline-window [role=region]");
        if (!skyline) throw new Error("Missing the skyline");
        const controls = skyline.shadowRoot?.querySelector(".control-bar");
        if (!controls) throw new Error("Missing the skyline controls");
        const pressed = controls.querySelector("button[aria-pressed='true']");
        if (!pressed) throw new Error("Missing a pressed skyline control");
        return {
          sequencer: frameStyle(".dnbm-window"),
          player: frameStyle(".dnbm-player-window"),
          artwork: getComputedStyle(art).filter,
          skylineBackdrop: getComputedStyle(skyline).backgroundColor,
          skylineScheme: getComputedStyle(skyline).colorScheme,
          skylineControls: {
            background: getComputedStyle(controls).backgroundColor,
            scheme: getComputedStyle(controls).colorScheme,
            color: getComputedStyle(controls).color,
            pressed: getComputedStyle(pressed).color,
          },
          skylineColour: document
            .querySelector(".skyline-window [role=region]")
            ?.shadowRoot?.querySelector("#colour")
            ?.getAttribute("aria-pressed"),
        };
      });

    await themeSwitch().click();
    await waitForSkyline();
    await browser.waitUntil(
      async () => (await resumeTextFills()).includes("#555555"),
      { timeoutMsg: "Paper did not give the resume its light page" },
    );
    expect(await palettes()).toEqual({
      sequencer: { background: "rgb(245, 245, 245)", color: "rgb(85, 85, 85)" },
      player: { background: "rgb(245, 245, 245)", color: "rgb(85, 85, 85)" },
      artwork: "invert(1) contrast(0.541) brightness(1.298)",
      skylineColour: "true",
      skylineBackdrop: "rgb(245, 245, 245)",
      skylineScheme: "light",
      skylineControls: {
        background: "rgb(245, 245, 245)",
        scheme: "light",
        color: "rgb(85, 85, 85)",
        pressed: "rgb(68, 68, 68)",
      },
    });
    expect(await backgroundOf("section.window:has(.resume-window)")).toBe(
      "rgb(231, 231, 231)",
    );
    await expect(player()).toHaveAttribute("data-state", "playing");
    await expect(dnbmAction("Undo")).toBeEnabled();

    // Dialogs live beside the sequencer's frame in its shadow root, so they
    // need the same palette as the editor. Cancel preserves the unsaved edit.
    await taskbar("dnbm").click();
    await dnbmWindow().$("button=File").click();
    await dnbmWindow().$("button=New").click();
    const dialog = () => dnbmRegion().shadow$("dialog[open]");
    await expect(dialog()).toBeDisplayed();
    expect(
      await browser.execute(() => {
        const layer = document
          .querySelector(".dnbm-window [role=region]")
          ?.shadowRoot?.querySelector(".dialog-layer");
        if (!layer) throw new Error("Missing the dialog palette");
        return getComputedStyle(layer).colorScheme;
      }),
    ).toBe("light");
    await dialog().$("button:not(.dialog-accept)").click();

    await themeSwitch().click();
    await waitForSkyline();
    expect(await palettes()).toEqual({
      sequencer: { background: "rgb(10, 10, 10)", color: "rgb(226, 226, 226)" },
      player: { background: "rgb(10, 10, 10)", color: "rgb(226, 226, 226)" },
      artwork: "none",
      skylineColour: "false",
      skylineBackdrop: "rgb(0, 0, 0)",
      skylineScheme: "dark",
      skylineControls: {
        background: "rgb(8, 8, 8)",
        scheme: "dark",
        color: "rgb(221, 221, 221)",
        pressed: "rgb(255, 255, 255)",
      },
    });
    await expect(player()).toHaveAttribute("data-state", "playing");
    await expect(dnbmAction("Undo")).toBeEnabled();
    await taskbar("dnbm player").click();
    await playerAction("Pause").click();

    // Saved Paper must also survive the packages' asynchronous first load.
    await themeSwitch().click();
    await browser.refresh();
    await waitForDnbmApps();
    await waitForSkyline();
    expect(await palettes()).toEqual({
      sequencer: { background: "rgb(245, 245, 245)", color: "rgb(85, 85, 85)" },
      player: { background: "rgb(245, 245, 245)", color: "rgb(85, 85, 85)" },
      artwork: "invert(1) contrast(0.541) brightness(1.298)",
      skylineColour: "true",
      skylineBackdrop: "rgb(245, 245, 245)",
      skylineScheme: "light",
      skylineControls: {
        background: "rgb(245, 245, 245)",
        scheme: "light",
        color: "rgb(85, 85, 85)",
        pressed: "rgb(68, 68, 68)",
      },
    });
    expect(await resumeTextFills()).toContain("#555555");
  });

  it("switches the theme from the routed shell's tray", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await browser.refresh();
    await expect($(".routed-pane.routed-pane--mobile")).toBeDisplayed();

    // On a phone, without the layout switch, the theme switch is the tray's
    // one control, in the taskbar's lower-right corner.
    const tray = $(".routed-pane-taskbar-end");
    await expect(tray.$$("button")).toBeElementsArrayOfSize(1);
    await tray.$("button[aria-label='Switch to Paper theme']").click();
    await expect($("html")).toHaveAttribute("data-theme", "paper");
    await expect(
      tray.$("button[aria-label='Switch to Graphite theme']"),
    ).toBeDisplayed();
    expect(
      await browser.execute(() => {
        const art = document.querySelector(".ascii-art-window");
        return art && getComputedStyle(art).filter;
      }),
    ).toBe("invert(1) contrast(0.541) brightness(1.298)");
    // A directly opened route and a reload both keep Paper for the app's
    // contents, not only the tray and toolbar.
    await browser.url("/app/resume");
    await waitForResume();
    expect(await resumeTextFills()).toContain("#555555");
  });
});
