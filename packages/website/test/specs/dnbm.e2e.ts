import { $, browser, expect } from "@wdio/globals";
import {
  asciiArtWindow,
  dnbmAction,
  dnbmApp,
  dnbmRegion,
  dnbmWindow,
  frontWindowApp,
  playerAction,
  playerApp,
  playerRegion,
  playerWindow,
  pressInApp,
  taskbar,
  titleOf,
  useDesktop,
  waitForDnbmApps,
} from "../lib/desktop";

// Whether the sequencer plays (its playhead shows), and the player's state.
const dnbmPlayback = () =>
  browser.execute(() => ({
    sequencer:
      document
        .querySelector(".dnbm-window [role=region]")
        ?.shadowRoot?.querySelector(".cell.now") !== null,
    player: document
      .querySelector(".dnbm-player-window [role=region]")
      ?.shadowRoot?.querySelector(".player")
      ?.getAttribute("data-state"),
  }));

// Presses a part of a dnbm app that shows in front of the other windows, off
// its controls, so the press only focuses the app.
const pressVisible = async (selector: string) => {
  const { x, y } = await browser.execute((regionSelector) => {
    const region = document.querySelector(regionSelector);
    const root = region?.shadowRoot;
    if (!region || !root) throw new Error(`Missing ${regionSelector}`);
    const { left, top, right, bottom } = region.getBoundingClientRect();
    for (let y = Math.ceil(top) + 4; y < bottom; y += 8) {
      for (let x = Math.ceil(left) + 4; x < right; x += 8) {
        const target = root.elementFromPoint(x, y);
        if (
          document.elementFromPoint(x, y) === region &&
          target &&
          !target.closest("button, input, canvas, svg, .cell, .track")
        )
          return { x, y };
      }
    }
    throw new Error(`No part of ${regionSelector} shows`);
  }, selector);
  await browser
    .action("pointer")
    .move({ origin: "viewport", x, y })
    .down()
    .up()
    .perform();
};

const toolbarState = (frame: ReturnType<typeof $>) =>
  frame.$$(".window-toolbar-actions button").map(async (button) => ({
    label: await button.getAttribute("aria-label"),
    enabled: await button.isEnabled(),
    pressed: await button.getAttribute("aria-pressed"),
  }));

const dnbmTitle = () => dnbmWindow().$(".window-titlebar-title").getText();

const playerTitle = () => playerWindow().$(".window-titlebar-title").getText();

// The sequencer's File menu: each item, and whether it is enabled. The menu
// stays open.
const dnbmFileMenu = async () => {
  if (!(await dnbmWindow().$(".window-menubar-dropdown").isExisting()))
    await dnbmWindow().$("button=File").click();
  return dnbmWindow()
    .$$(".window-menubar-dropdown button")
    .map(async (item) => [await item.getText(), await item.isEnabled()]);
};

describe("Website dnbm windows", () => {
  useDesktop();

  it("renders the dnbm player in the page from the same assets, and plays a song", async () => {
    await browser.waitUntil(
      async () => {
        const { app, width } = await playerApp();
        return (app?.tracks ?? 0) > 0 && width >= 440;
      },
      { timeoutMsg: "the dnbm player did not load and fit its playlist" },
    );
    expect(await playerApp()).toEqual({
      // The package renders the player in a shadow root, not a frame.
      frames: 0,
      title: "dnbm player",
      width: expect.any(Number),
      app: {
        embedded: true,
        // The window's title names the app.
        wordmark: "none",
        ownActions: false,
        tracks: expect.any(Number),
      },
    });
    // The player opens behind the resume.
    expect(await frontWindowApp()).toBe("Resume");

    // In front, Play in the window's toolbar starts its audio engine: the
    // clock runs.
    await taskbar("dnbm player").click();
    await playerAction("Play").click();
    await browser.waitUntil(
      async () => (await playerRegion().shadow$(".time").getText()) !== "0:00",
      { timeoutMsg: "the player's clock did not run" },
    );
    await playerWindow().$("button=View").click();
    await playerWindow().$("button*=Stop").click();
    await expect(playerRegion().shadow$(".player")).toHaveAttribute(
      "data-state",
      "stopped",
    );
  });

  it("drives the dnbm player from its window toolbar and View menu", async () => {
    await waitForDnbmApps();
    await taskbar("dnbm player").click();
    const player = () => playerRegion().shadow$(".player");
    const action = (label: string, pressed: string | null = null) => ({
      label,
      enabled: true,
      pressed,
    });
    await browser.waitUntil(
      async () =>
        (await toolbarState(playerWindow())).every(({ enabled }) => enabled),
      { timeoutMsg: "the player's toolbar did not enable" },
    );
    expect(await toolbarState(playerWindow())).toEqual([
      action("Previous"),
      action("Play"),
      action("Next"),
      action("Shuffle", "false"),
      action("Repeat", "false"),
    ]);
    // The window names the playlist's first song.
    const first = await playerTitle();
    expect(first).toMatch(titleOf("dnbm player"));
    expect(first).not.toBe("dnbm player");

    // Stopped at the start, there is nothing to stop.
    await playerWindow().$("button=View").click();
    await expect(playerWindow().$("button*=Stop")).toBeDisabled();
    await playerWindow().$("button=View").click();

    // Next and Previous move through the playlist, and the window names the
    // current song.
    await playerAction("Next").click();
    await browser.waitUntil(async () => (await playerTitle()) !== first, {
      timeoutMsg: "the window did not name the next song",
    });
    expect(await playerTitle()).toMatch(titleOf("dnbm player"));
    await playerAction("Previous").click();
    await browser.waitUntil(async () => (await playerTitle()) === first, {
      timeoutMsg: "the window did not name the previous song",
    });

    await playerAction("Play").click();
    await expect(player()).toHaveAttribute("data-state", "playing");
    await playerAction("Pause").click();
    await expect(player()).toHaveAttribute("data-state", "paused");
    await expect(playerAction("Play")).toBeExisting();

    // Shuffle and repeat toggle from the toolbar or the View menu, which
    // checks them.
    await playerAction("Shuffle").click();
    await expect(playerAction("Shuffle")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await playerWindow().$("button=View").click();
    await expect(playerWindow().$("button*=Shuffle")).toHaveText("✓ Shuffle");
    await playerWindow().$("button*=Repeat").click();
    await expect(playerAction("Repeat")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await playerWindow().$("button=View").click();
    await playerWindow().$("button*=Shuffle").click();
    await expect(playerAction("Shuffle")).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    // Paused, Stop goes back to the start.
    await playerWindow().$("button=View").click();
    await playerWindow().$("button*=Stop").click();
    await expect(player()).toHaveAttribute("data-state", "stopped");
    await playerWindow().$("button=View").click();
    await expect(playerWindow().$("button*=Stop")).toBeDisabled();
    await playerWindow().$("button=View").click();
  });

  it("renders the dnbm sequencer in the page from its copied assets, fitted to its layout", async () => {
    // The window fits once the sequencer is ready: styled, laid out, and
    // showing its steps.
    await browser.waitUntil(
      async () => {
        const { app, width } = await dnbmApp();
        return app?.steps === true && width >= 1200;
      },
      { timeoutMsg: "the dnbm sequencer did not load and fit its layout" },
    );
    const { width, ...app } = await dnbmApp();
    expect(app).toEqual({
      // The package renders the sequencer in a shadow root, not a frame.
      frames: 0,
      title: "dnbm drum and bass sequencer",
      app: {
        embedded: true,
        // The window's title names the app.
        wordmark: "none",
        ownActions: false,
        steps: true,
      },
    });
    // The window opens fitted to the sequencer's 1200px desktop layout.
    expect(width).toBeGreaterThanOrEqual(1200);
    // The sequencer opens behind the other apps.
    expect(await frontWindowApp()).toBe("Resume");
  });

  it("plays and stops the dnbm sequencer from its window toolbar and View menu", async () => {
    await waitForDnbmApps();
    await taskbar("dnbm").click();
    await expect(dnbmAction("Play")).toBeEnabled();
    expect(await toolbarState(dnbmWindow())).toEqual([
      { label: "Play", enabled: true, pressed: null },
      // A song just opened has nothing to undo or redo.
      { label: "Undo", enabled: false, pressed: null },
      { label: "Redo", enabled: false, pressed: null },
    ]);

    // Play starts the audio engine: the playhead moves, and the action stops.
    await dnbmAction("Play").click();
    await dnbmRegion().shadow$(".cell.now").waitForExist({
      timeoutMsg: "the sequencer's playhead did not move",
    });
    await dnbmAction("Stop").click();
    await dnbmRegion().shadow$(".cell.now").waitForExist({
      reverse: true,
      timeoutMsg: "the sequencer did not stop",
    });
    await expect(dnbmAction("Play")).toBeExisting();

    // The View menu plays and stops too.
    await dnbmWindow().$("button=View").click();
    await dnbmWindow().$("button=Play").click();
    await dnbmRegion().shadow$(".cell.now").waitForExist({
      timeoutMsg: "the View menu did not play the sequencer",
    });
    await dnbmWindow().$("button=View").click();
    await dnbmWindow().$("button=Stop").click();
    await dnbmRegion().shadow$(".cell.now").waitForExist({
      reverse: true,
      timeoutMsg: "the View menu did not stop the sequencer",
    });
  });

  it("raises a dnbm window on a press inside it", async () => {
    await waitForDnbmApps();
    // With the artwork minimized and the resume in front, the player shows
    // to the right of the resume.
    await taskbar("a2f0.net").click();
    await asciiArtWindow().$("button[aria-label='Minimize window']").click();
    await taskbar("Resume").click();
    await pressVisible(".dnbm-player-window [role=region]");
    await browser.waitUntil(
      async () => (await frontWindowApp()) === "dnbm player",
      { timeoutMsg: "pressing the dnbm player did not raise its window" },
    );
    // The press reaches the window from the page itself: no frame takes
    // focus, and the app keeps it.
    expect(
      await browser.execute(
        () =>
          document.activeElement?.matches(
            ".dnbm-player-window [role=region]",
          ) ?? false,
      ),
    ).toBe(true);

    // The sequencer, behind every other window, shows below them.
    await pressVisible(".dnbm-window [role=region]");
    await browser.waitUntil(async () => (await frontWindowApp()) === "dnbm", {
      timeoutMsg: "pressing the dnbm sequencer did not raise its window",
    });
  });

  it("keeps keys pressed outside a dnbm app out of it", async () => {
    await waitForDnbmApps();
    // The resume window has focus. Space plays either app, and X the player,
    // but only while focus is inside it.
    await browser.keys(" ");
    await browser.keys("x");
    await browser.pause(500);
    expect(await dnbmPlayback()).toEqual({
      sequencer: false,
      player: "stopped",
    });

    // Focused by a press, the player takes the same key.
    await taskbar("dnbm player").click();
    await pressVisible(".dnbm-player-window [role=region]");
    await browser.keys("x");
    await browser.waitUntil(
      async () => (await dnbmPlayback()).player === "playing",
      { timeoutMsg: "the focused player did not play on X" },
    );
    // V stops it.
    await browser.keys("v");
    await browser.waitUntil(
      async () => (await dnbmPlayback()).player === "stopped",
      { timeoutMsg: "the focused player did not stop on V" },
    );
    expect((await dnbmPlayback()).sequencer).toBe(false);
  });

  it("closes open menus on a press on a dnbm grid cell or knob", async () => {
    await waitForDnbmApps();
    await taskbar("dnbm").click();
    const start = $(".desktop-taskbar button[aria-label='Menu']");
    const windowMenu = () => dnbmWindow().$(".window-menubar-dropdown");
    const song = (await dnbmTitle()).replace(/^● /, "");

    await start.click();
    await expect(start).toHaveAttribute("aria-expanded", "true");
    await pressInApp(".dnbm-window [role=region]", ".control.knob");
    await expect($(".menu")).not.toBeExisting();
    await expect(start).toHaveAttribute("aria-expanded", "false");

    await dnbmWindow().$("button=View").click();
    await expect(windowMenu()).toBeDisplayed();
    await pressInApp(".dnbm-window [role=region]", ".control.knob");
    await expect(windowMenu()).not.toBeExisting();

    // A press on a step paints it, and the window marks the song as changed.
    await start.click();
    await expect(start).toHaveAttribute("aria-expanded", "true");
    await pressInApp(".dnbm-window [role=region]", ".grid-row .cell");
    await expect($(".menu")).not.toBeExisting();
    await expect(start).toHaveAttribute("aria-expanded", "false");
    await browser.waitUntil(async () => (await dnbmTitle()) === `● ${song}`, {
      timeoutMsg: "the window did not mark the painted song as changed",
    });

    await dnbmWindow().$("button=File").click();
    await expect(windowMenu()).toBeDisplayed();
    await pressInApp(".dnbm-window [role=region]", ".grid-row .cell");
    await expect(windowMenu()).not.toBeExisting();

    // Undo takes both steps back, and the song is as it was.
    await dnbmAction("Undo").click();
    await dnbmAction("Undo").click();
    await browser.waitUntil(async () => (await dnbmTitle()) === song, {
      timeoutMsg: "undoing the paints did not restore the song",
    });
    await expect(dnbmAction("Undo")).toBeDisabled();
    await expect(dnbmAction("Redo")).toBeEnabled();
  });

  it("disables the dnbm File menu while the sequencer asks something", async () => {
    await waitForDnbmApps();
    await taskbar("dnbm").click();
    const fileItems = (enabled: boolean) => [
      ["New", enabled],
      ["Open…", enabled],
      ["Save", enabled],
      ["Save As…", enabled],
      ["Export WAV…", enabled],
      ["Close", true],
    ];
    await expect(dnbmAction("Play")).toBeEnabled();
    expect(await dnbmFileMenu()).toEqual(fileItems(true));
    await dnbmWindow().$("button=File").click();

    // With a change to discard, New asks first, in a dialog over the app,
    // which takes no command until it is answered.
    await pressInApp(".dnbm-window [role=region]", ".grid-row .cell");
    await expect(dnbmAction("Undo")).toBeEnabled();
    await dnbmWindow().$("button=File").click();
    await dnbmWindow().$("button=New").click();
    const dialog = () => dnbmRegion().shadow$("dialog[open]");
    await expect(dialog()).toBeDisplayed();
    expect(await dnbmFileMenu()).toEqual(fileItems(false));
    await dnbmWindow().$("button=File").click();
    expect(await toolbarState(dnbmWindow())).toEqual([
      { label: "Play", enabled: false, pressed: null },
      { label: "Undo", enabled: false, pressed: null },
      { label: "Redo", enabled: false, pressed: null },
    ]);

    // Cancelled, the dialog leaves the song as it was, and the menu enabled.
    await dialog().$("button:not(.dialog-accept)").click();
    await expect(dialog()).not.toBeExisting();
    expect(await dnbmFileMenu()).toEqual(fileItems(true));
    await dnbmWindow().$("button=File").click();
    await expect(dnbmAction("Undo")).toBeEnabled();
    await dnbmAction("Undo").click();
    await expect(dnbmAction("Undo")).toBeDisabled();
  });

  it("opens the dnbm file pickers inside the menu press", async () => {
    await waitForDnbmApps();
    await taskbar("dnbm").click();
    // Record whether each picker opens with the press's user activation, as
    // browsers require, and cancel it.
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
    await expect(dnbmAction("Play")).toBeEnabled();

    await dnbmWindow().$("button=File").click();
    await dnbmWindow().$("button=Open…").click();
    await browser.waitUntil(async () => (await pickers()).length === 1, {
      timeoutMsg: "Open… did not open a picker",
    });
    await dnbmWindow().$("button=File").click();
    await dnbmWindow().$("button=Save As…").click();
    await browser.waitUntil(async () => (await pickers()).length === 2, {
      timeoutMsg: "Save As… did not open a picker",
    });
    expect(await pickers()).toEqual([
      ["open", true],
      ["save", true],
    ]);
  });
});
