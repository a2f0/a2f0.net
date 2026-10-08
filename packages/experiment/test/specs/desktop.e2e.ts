import { $, $$, browser, expect } from "@wdio/globals";

const resumeWindow = () => $("section.window:has(.resume-window)");
const asciiArtWindow = () => $("section.window:has(.ascii-art-window)");
const skylineWindow = () => $("section.window:has(.skyline-window)");
const dnbmWindow = () => $("section.window:has(.dnbm-window)");
const playerWindow = () => $("section.window:has(.dnbm-player-window)");
// A window's title is its app's, or names what the app shows before it, as the
// dnbm windows name their song: "Undertow — dnbm".
const appTitle = (title: string | null | undefined) =>
  title?.split(" — ").at(-1);
const titleOf = (app: string) => new RegExp(`^(.+ — )?${app}$`);
// A taskbar button carries its window's title. A CSS selector, unlike a text
// selector, finds no match without searching the artwork's shadow root.
const taskbar = (app: string) =>
  $(
    `.desktop-taskbar-button[title="${app}"], .desktop-taskbar-button[title$=" — ${app}"]`,
  );
// WebDriver's code for the Shift key.
const SHIFT = "\uE008";

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

const backgroundOf = (selector: string) =>
  browser.execute((target) => {
    const frame = document.querySelector(target);
    if (!frame) throw new Error(`Missing ${target}`);
    return getComputedStyle(frame).backgroundColor;
  }, selector);

// The colors the resume draws its text in, which follow its theme.
const resumeTextFills = () =>
  browser.execute(() => [
    ...new Set(
      Array.from(document.querySelectorAll(".resume-window svg text"), (text) =>
        text.getAttribute("fill"),
      ),
    ),
  ]);

// The resume opens fitted once its page renders: at the 900px desktop the
// window fills the surface's height.
const waitForResumeFit = () =>
  browser.waitUntil(
    () =>
      browser.execute(() => {
        const frame = document.querySelector<HTMLElement>(
          "section.window:has(.resume-window)",
        );
        return frame?.parentElement?.clientHeight === frame?.offsetHeight;
      }),
    { timeoutMsg: "the resume window did not fit to its page" },
  );

const siteState = () =>
  browser.execute(() => {
    const root = document.querySelector(".ascii-art-window")?.shadowRoot;
    return {
      view: root?.querySelector(".stage")?.getAttribute("data-view"),
      ascii: root?.querySelector(".ascii")?.textContent,
    };
  });

// The skyline viewer's region and the viewer the package renders in its shadow
// root, in this page rather than in a frame.
const skylineApp = () =>
  browser.execute(() => {
    const region = document.querySelector<HTMLElement>(
      ".skyline-window [role=region]",
    );
    const root = region?.shadowRoot;
    return {
      frames: document.querySelectorAll(".skyline-window iframe").length,
      title: region?.getAttribute("aria-label"),
      busy: region?.hasAttribute("aria-busy"),
      viewer: root && {
        canvas: root.querySelector("canvas#building") !== null,
        controlsOpen:
          root.querySelector("#menu-toggle")?.getAttribute("aria-expanded") ===
          "true",
        loading: root.querySelector<HTMLElement>("#loading")?.checkVisibility(),
      },
    };
  });

// The viewer is ready once its 3D skyline draws its first frame: the region
// drops aria-busy. The scene's code, models, and WebGL take a while in CI.
const waitForSkyline = () =>
  browser.waitUntil(
    async () => {
      const { busy, viewer } = await skylineApp();
      return busy === false && viewer?.canvas === true;
    },
    {
      timeout: 30000,
      timeoutMsg: "the skyline viewer did not draw its 3D skyline",
    },
  );

// Presses the skyline's 3D scene where it shows in front of the other windows.
// A press without a drag leaves the camera where it is.
const pressSkylineScene = async () => {
  const { x, y } = await browser.execute(() => {
    const region = document.querySelector(".skyline-window [role=region]");
    const root = region?.shadowRoot;
    if (!region || !root) throw new Error("Missing skyline viewer");
    const { left, top, right, bottom } = region.getBoundingClientRect();
    for (let y = Math.ceil(top) + 4; y < bottom; y += 8) {
      for (let x = Math.floor(right) - 4; x > left; x -= 8) {
        if (
          document.elementFromPoint(x, y) === region &&
          root.elementFromPoint(x, y)?.matches("canvas#building")
        )
          return { x, y };
      }
    }
    throw new Error("No part of the skyline's scene shows");
  });
  await browser
    .action("pointer")
    .move({ origin: "viewport", x, y })
    .down()
    .up()
    .perform();
};

// The dnbm sequencer's region and the app the package renders in its shadow
// root, in this page rather than in a frame.
const dnbmApp = () =>
  browser.execute(() => {
    const region = document.querySelector<HTMLElement>(
      ".dnbm-window [role=region]",
    );
    const root = region?.shadowRoot;
    const wordmark = root?.querySelector(".brand");
    return {
      frames: document.querySelectorAll(".dnbm-window iframe").length,
      title: region?.getAttribute("aria-label"),
      width: region?.clientWidth ?? 0,
      app: root && {
        embedded: root.querySelector(".frame")?.hasAttribute("data-embed"),
        wordmark: wordmark && getComputedStyle(wordmark).display,
        // The window's menus and toolbar take the place of these buttons.
        ownActions: root.querySelector(".topbar .play, .files button") !== null,
        steps: root.querySelectorAll(".cell").length > 0,
      },
    };
  });

// The dnbm player's region and the player in its shadow root.
const playerApp = () =>
  browser.execute(() => {
    const region = document.querySelector<HTMLElement>(
      ".dnbm-player-window [role=region]",
    );
    const root = region?.shadowRoot;
    const wordmark = root?.querySelector(".bar");
    return {
      frames: document.querySelectorAll(".dnbm-player-window iframe").length,
      title: region?.getAttribute("aria-label"),
      width: region?.clientWidth ?? 0,
      app: root && {
        embedded: root.querySelector(".frame")?.hasAttribute("data-embed"),
        wordmark: wordmark && getComputedStyle(wordmark).display,
        // The window's toolbar and View menu take the place of these buttons.
        ownActions: root.querySelector(".controls button") !== null,
        tracks: root.querySelectorAll(".track").length,
      },
    };
  });

const dnbmRegion = () => $(".dnbm-window [role=region]");
const playerRegion = () => $(".dnbm-player-window [role=region]");

const waitForDnbmApps = () =>
  browser.waitUntil(
    async () =>
      (await dnbmApp()).app?.steps === true &&
      ((await playerApp()).app?.tracks ?? 0) > 0,
    { timeoutMsg: "the dnbm sequencer and player did not load" },
  );

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

// Presses the first element matching `target` inside a dnbm app where it
// shows in front of the other windows: a grid cell, say, or a knob.
const pressInApp = async (selector: string, target: string) => {
  const { x, y } = await browser.execute(
    (regionSelector, targetSelector) => {
      const region = document.querySelector(regionSelector);
      const root = region?.shadowRoot;
      if (!region || !root) throw new Error(`Missing ${regionSelector}`);
      for (const element of root.querySelectorAll(targetSelector)) {
        const { left, top, width, height } = element.getBoundingClientRect();
        const x = Math.round(left + width / 2);
        const y = Math.round(top + height / 2);
        if (
          document.elementFromPoint(x, y) === region &&
          root.elementFromPoint(x, y)?.closest(targetSelector) === element
        )
          return { x, y };
      }
      throw new Error(`No ${targetSelector} shows in ${regionSelector}`);
    },
    selector,
    target,
  );
  await browser
    .action("pointer")
    .move({ origin: "viewport", x, y })
    .down()
    .up()
    .perform();
};

// The sequencer's and the player's actions in their windows' toolbars, by label.
const dnbmAction = (label: string) =>
  dnbmWindow().$(`.window-toolbar button[aria-label='${label}']`);
const playerAction = (label: string) =>
  playerWindow().$(`.window-toolbar button[aria-label='${label}']`);
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

// The resume's print frame would open the browser's print dialog. Record the
// PDF it was asked to print instead.
const stubFramePrint = () =>
  browser.execute(() => {
    const contentWindow = Object.getOwnPropertyDescriptor(
      HTMLIFrameElement.prototype,
      "contentWindow",
    );
    Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
      configurable: true,
      get(this: HTMLIFrameElement) {
        if (this.id !== "resumePrintFrame") {
          return contentWindow?.get?.call(this);
        }
        return {
          print: () => {
            document.documentElement.dataset.printed = this.src;
          },
        };
      },
    });
  });

const printedPdf = () =>
  browser.execute(async () => {
    const src = document.documentElement.dataset.printed;
    if (!src) return null;
    const pdf = await (await fetch(src)).text();
    return {
      header: pdf.slice(0, 5),
      pages: pdf.match(/\/Type \/Page\b/g)?.length ?? 0,
      firstFill: pdf.split("\n").find((line) => / g$/.test(line)),
    };
  });

// The app of the window foremost on the desktop.
const frontWindowApp = async () =>
  appTitle(
    await browser.execute(() => {
      const windows = [
        ...document.querySelectorAll<HTMLElement>(
          ".desktop-surface > section.window",
        ),
      ];
      const front = windows.reduce((top, candidate) =>
        Number(candidate.style.zIndex) > Number(top.style.zIndex)
          ? candidate
          : top,
      );
      return front.querySelector(".window-titlebar-title")?.textContent;
    }),
  );

describe("Experiment desktop", () => {
  beforeEach(async () => {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.url("/");
    await waitForResume();
    await browser.waitUntil(async () => (await siteState()).view === "ascii", {
      timeoutMsg: "the website did not mount inside its shadow root",
    });
  });

  // The sequencer autosaves its song in this origin's storage, and the layout
  // switch its choice. Start each test from the example song on the windowed
  // desktop, even after a test that changed them failed.
  afterEach(() =>
    browser.execute(() => {
      localStorage.removeItem("dnbm:song");
      localStorage.removeItem("dnbm:saved");
      localStorage.removeItem("experiment.navigationMode");
      localStorage.removeItem("experiment.launcherPlacement");
    }),
  );

  it("renders every app with the published window styles", async () => {
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(5);
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
    const focusRing = () =>
      browser.execute(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement))
          throw new Error("Nothing focused");
        return {
          title: active.querySelector(".window-titlebar-title")?.textContent,
          outline: getComputedStyle(active).outlineStyle,
        };
      });
    // The front window takes focus on load, before any input, without a ring.
    expect(await focusRing()).toEqual({ title: "a2f0.net", outline: "none" });

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
    const focusRing = () =>
      browser.execute(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement))
          throw new Error("Nothing focused");
        return {
          title: active.querySelector(".window-titlebar-title")?.textContent,
          outline: getComputedStyle(active).outlineStyle,
        };
      });
    // Clicking the window that took focus on load leaves that focus in place,
    // so it must not bring back the load-time ring.
    await asciiArtWindow().$(".window-titlebar-title").click();
    expect(await focusRing()).toEqual({ title: "a2f0.net", outline: "none" });

    // Shift alone is not keyboard use: some browsers ring the clicked window
    // on it, so the ring waits for the root to record keyboard input.
    await browser.action("key").down(SHIFT).up(SHIFT).perform();
    await expect($("html")).toHaveAttribute("data-input", "pointer");
    expect(await focusRing()).toEqual({ title: "a2f0.net", outline: "none" });

    await asciiArtWindow().$("button[aria-label='Minimize window']").click();
    await expect(asciiArtWindow()).not.toBeExisting();
    await taskbar("a2f0.net").click();
    await expect(asciiArtWindow()).toBeExisting();
    expect(await focusRing()).toEqual({ title: "a2f0.net", outline: "none" });
  });

  it("registers the resume and artwork menus", async () => {
    await taskbar("Resume").click();
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=Light Theme").click();
    await browser.waitUntil(
      async () => (await resumeTextFills()).includes("#000000"),
      { timeoutMsg: "the resume did not redraw in the light theme" },
    );
    expect(await resumeTextFills()).not.toContain("#DCDCDC");
    // The theme is the page's alone. As on resume.a2f0.net, the window
    // around it stays dark, as do its title bar, the other windows, and the
    // taskbar.
    expect(await backgroundOf("section.window:has(.resume-window)")).toBe(
      "color(srgb 0.139216 0.139216 0.139216)",
    );
    expect(
      await backgroundOf("section.window:has(.resume-window) .window-titlebar"),
    ).toBe("rgb(40, 40, 40)");
    expect(await backgroundOf("section.window:has(.ascii-art-window)")).toBe(
      "rgb(22, 22, 22)",
    );
    expect(await backgroundOf(".desktop-taskbar")).toBe("rgb(40, 40, 40)");
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
    await expect(resumeWindow().$("button=Print")).toBeDisplayed();

    await taskbar("a2f0.net").click();
    await asciiArtWindow().$("button=View").click();
    await asciiArtWindow().$("button*=ASCII View").click();
    await browser.waitUntil(async () => (await siteState()).view === "svg", {
      timeoutMsg: "the window menu did not update the artwork controls",
    });
  });

  it("prints the resume PDF on white in the dark theme", async () => {
    await stubFramePrint();
    await taskbar("Resume").click();
    expect(await resumeTextFills()).toContain("#DCDCDC");
    await resumeWindow().$("button=File").click();
    await resumeWindow().$("button=Print").click();
    await expect(resumeWindow().$("button=Print")).not.toBeExisting();

    await browser.waitUntil(async () => (await printedPdf()) !== null, {
      timeoutMsg: "the print frame did not print",
    });
    expect(await printedPdf()).toEqual({
      header: "%PDF-",
      pages: 1,
      // The panels paint first, in the light theme's white.
      firstFill: "1. g",
    });
  });

  it("opens the resume fitted to its page", async () => {
    const fitState = () =>
      browser.execute(() => {
        const pane = document.querySelector<HTMLElement>(
          "section.window:has(.resume-window) .window-body-content-scroll",
        );
        const svg = pane?.querySelector("svg");
        if (!pane || !svg) throw new Error("Missing resume");
        const { paddingLeft, paddingRight } = getComputedStyle(pane);
        return {
          contentWidth:
            pane.clientWidth -
            Number.parseFloat(paddingLeft) -
            Number.parseFloat(paddingRight),
          scrollsAcross: pane.scrollWidth > pane.clientWidth,
          viewBox: svg.getAttribute("viewBox"),
        };
      });
    // The page is taller than the 900px desktop, so the window fills its
    // height and scrolls down, while the desktop page shows its full width.
    const page = {
      contentWidth: 816,
      scrollsAcross: false,
      viewBox: "0 0 816 1056",
    };
    const expectFitted = async () => {
      await waitForResumeFit();
      await browser.waitUntil(
        async () => (await fitState()).viewBox === page.viewBox,
        { timeoutMsg: "the fitted resume did not show its desktop page" },
      );
      expect(await fitState()).toEqual(page);
    };
    await expectFitted();

    // Narrowed past the page, the resume takes its single column; View > Fit
    // to Content brings the page back.
    await taskbar("Resume").click();
    await browser
      .action("pointer")
      .move({ origin: resumeWindow().$(".window-resize--e") })
      .down()
      .move({ origin: "pointer", x: -100, y: 0, duration: 150 })
      .up()
      .perform();
    await browser.waitUntil(
      () =>
        browser.execute(
          () =>
            document
              .querySelector(".resume-window svg")
              ?.getAttribute("viewBox") !== "0 0 816 1056",
        ),
      { timeoutMsg: "the narrowed resume kept its desktop page" },
    );
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button=Fit to Content").click();
    await expectFitted();
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
  });

  it("renders the skyline viewer in the page from its copied assets", async () => {
    // The viewer loads its code, styles, and 3D scene from /skyline/.
    await waitForSkyline();
    expect(await skylineApp()).toEqual({
      // The package renders the viewer in a shadow root, not a frame.
      frames: 0,
      title: "Interactive Chicago skyline",
      busy: false,
      viewer: {
        canvas: true,
        // The scene's control bar starts open.
        controlsOpen: true,
        // The first frame hides the loading silhouette.
        loading: false,
      },
    });
    // The skyline opens behind the artwork.
    expect(await frontWindowApp()).toBe("a2f0.net");
  });

  it("opens the skyline at three quarters of the desktop", async () => {
    const skylineGeometry = () =>
      browser.execute(() => {
        const surface = document.querySelector(".desktop-surface");
        const frame = document.querySelector(
          "section.window:has(.skyline-window)",
        );
        if (!surface || !frame) throw new Error("Missing skyline window");
        const desktop = surface.getBoundingClientRect();
        const window = frame.getBoundingClientRect();
        return {
          width: window.width / desktop.width,
          height: window.height / desktop.height,
          onDesktop:
            window.left >= desktop.left &&
            window.top >= desktop.top &&
            window.right <= desktop.right &&
            window.bottom <= desktop.bottom,
        };
      });
    const expectThreeQuarters = async () => {
      const { width, height, onDesktop } = await skylineGeometry();
      expect(width).toBeCloseTo(0.75, 2);
      expect(height).toBeCloseTo(0.75, 2);
      expect(onDesktop).toBe(true);
    };
    await expectThreeQuarters();

    // On a smaller desktop it keeps the proportion and moves to stay on it.
    await browser.setViewport({ width: 1100, height: 700 });
    await browser.refresh();
    await skylineWindow().waitForExist();
    await expectThreeQuarters();
  });

  it("raises the skyline window on a press inside it", async () => {
    await waitForSkyline();
    // The skyline's scene shows right of the artwork, which is in front.
    await pressSkylineScene();
    await browser.waitUntil(
      async () => (await frontWindowApp()) === "Skyline",
      { timeoutMsg: "pressing the skyline did not raise its window" },
    );
    // The press reaches the window from the page itself: no frame takes
    // focus, and the viewer keeps it.
    expect(
      await browser.execute(
        () =>
          document.activeElement?.matches(".skyline-window [role=region]") ??
          false,
      ),
    ).toBe(true);
  });

  it("closes open menus on a press inside the skyline", async () => {
    await waitForSkyline();
    const start = $(".desktop-taskbar button[aria-label='Menu']");
    await start.click();
    await expect(start).toHaveAttribute("aria-expanded", "true");
    await pressSkylineScene();
    await expect($(".menu")).not.toBeExisting();
    await expect(start).toHaveAttribute("aria-expanded", "false");

    // A window's own menu closes too.
    await taskbar("Resume").click();
    await resumeWindow().$("button=View").click();
    await expect(resumeWindow().$("button=Fit to Content")).toBeDisplayed();
    await pressSkylineScene();
    await expect(resumeWindow().$("button=Fit to Content")).not.toBeExisting();
  });

  it("keeps keys pressed outside the skyline out of it", async () => {
    await waitForSkyline();
    // The viewer marks the keys it takes as handled. Record them as they
    // reach the window.
    await browser.execute(() => {
      const keys: [string, boolean][] = [];
      Object.assign(window, { skylineKeys: keys });
      window.addEventListener("keydown", (event) =>
        keys.push([event.key, event.defaultPrevented]),
      );
    });
    const takenKeys = () =>
      browser.execute(() =>
        (
          window as unknown as { skylineKeys: [string, boolean][] }
        ).skylineKeys.splice(0),
      );
    // The artwork window has focus. Arrows rotate the skyline and + zooms it,
    // but only while focus is inside it.
    await browser.keys(["ArrowLeft", "+"]);
    expect(await takenKeys()).toEqual([
      ["ArrowLeft", false],
      ["+", false],
    ]);

    // Focused by a press, the viewer takes the same keys.
    await pressSkylineScene();
    await browser.keys(["ArrowLeft", "+"]);
    expect(await takenKeys()).toEqual([
      ["ArrowLeft", true],
      ["+", true],
    ]);
  });

  it("releases the skyline's WebGL context when its window closes", async () => {
    await waitForSkyline();
    // Asked again, the scene's canvas returns the context it draws with.
    expect(
      await browser.execute(() => {
        const canvas = document
          .querySelector(".skyline-window [role=region]")
          ?.shadowRoot?.querySelector("canvas#building");
        if (!(canvas instanceof HTMLCanvasElement)) return false;
        const context = canvas.getContext("webgl2");
        Object.assign(window, { skylineContext: context });
        return context !== null && !context.isContextLost();
      }),
    ).toBe(true);

    await skylineWindow().$("button[aria-label='Close window']").click();
    await expect(skylineWindow()).not.toBeExisting();
    await browser.waitUntil(
      () =>
        browser.execute(() =>
          (
            window as unknown as { skylineContext: WebGL2RenderingContext }
          ).skylineContext.isContextLost(),
        ),
      { timeoutMsg: "the closed skyline kept its WebGL context" },
    );

    // Reopened, a new viewer draws the skyline again.
    await $(".desktop-taskbar button[aria-label='Menu']").click();
    await $(".menu").$("button=Skyline").click();
    await waitForSkyline();
  });

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
    // The player opens behind the artwork.
    expect(await frontWindowApp()).toBe("a2f0.net");

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
    expect(await frontWindowApp()).toBe("a2f0.net");
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
    // The artwork window has focus. Space plays either app, and X the player,
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
      "Resume",
      "Skyline",
      "dnbm player",
      "a2f0.net",
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
        title: "Resume",
        pressed: "false",
        state: "minimized",
        muted: true,
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
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(5);
  });

  it("shows one app at a time in the routed shell on a phone", async () => {
    await browser.setViewport({ width: 390, height: 844 });
    await browser.refresh();
    await expect($(".routed-pane.routed-pane--mobile")).toBeDisplayed();
    await expect($(".desktop-taskbar")).not.toBeExisting();
    await expect($("html")).toHaveAttribute("data-navigation-mode", "routed");
    // The root route shows the artwork, as the desktop opens it in front,
    // with its controls in the app bar's toolbar.
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
    ).toEqual(["dnbm", "Resume", "Skyline", "dnbm player", "a2f0.net"]);

    // A tile navigates: the resume shows in the column layout, with its menu
    // actions in the toolbar, and Back returns to the artwork.
    await $(".routed-pane-sheet-tile=Resume").click();
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
      async () => (await resumeTextFills()).includes("#000000"),
      { timeoutMsg: "the resume did not take the light theme" },
    );

    // Narrower than windows suit, the page keeps the layout it loaded with:
    // a switch would remount every app.
    await browser.setViewport({ width: 900, height: 900 });
    await browser.pause(500);
    await expect($(".desktop-taskbar")).toBeDisplayed();
    await expect($("html")).toHaveAttribute("data-navigation-mode", "windowed");
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(5);
    expect(await resumeTextFills()).toContain("#000000");
  });

  it("keeps the resume's theme across a layout switch", async () => {
    await taskbar("Resume").click();
    await resumeWindow().$("button=View").click();
    await resumeWindow().$("button*=Light Theme").click();
    await $(
      ".desktop-taskbar-end button[aria-label='Switch to iPad / mobile layout']",
    ).click();
    await $("button[aria-label='Expand navigation rail']").click();
    await $(".routed-pane-nav-link=Resume").click();
    await waitForResume();
    // The light theme carried over, so the toolbar offers the dark one.
    await expect(
      $(".routed-pane-toolbar button[aria-label='Dark Theme']"),
    ).toBeDisplayed();
    expect(await resumeTextFills()).toContain("#000000");
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
    await $(".routed-pane-nav-link=Resume").click();
    await expect($(".routed-pane-title")).toHaveText("Resume");
    await waitForResume();

    // The tray switches back to the windows as they were.
    await toWindowed();
    await expect($(".desktop-taskbar")).toBeDisplayed();
    await expect($("html")).toHaveAttribute("data-navigation-mode", "windowed");
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(4);
    await expect(skylineWindow()).not.toBeExisting();

    // The choice survives a reload.
    await toRouted();
    await browser.url("/");
    await expect($(".routed-pane")).toBeDisplayed();
    await toWindowed();
    await expect($(".desktop-taskbar")).toBeDisplayed();
  });
});
