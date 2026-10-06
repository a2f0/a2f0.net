import { $, $$, browser, expect } from "@wdio/globals";

const resumeWindow = () => $("section.window:has(.resume-window)");
const asciiArtWindow = () => $("section.window:has(.ascii-art-window)");
const skylineWindow = () => $("section.window:has(.skyline-window)");
const dnbmWindow = () => $("section.window:has(.dnbm-window)");
const taskbar = (title: string) => $(`.desktop-taskbar-button=${title}`);
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

const windowBackground = (selector: string) =>
  browser.execute((frameSelector) => {
    const frame = document.querySelector(frameSelector);
    if (!frame) throw new Error(`Missing ${frameSelector}`);
    return getComputedStyle(frame).backgroundColor;
  }, selector);

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

// The skyline viewer's frame and the 3D scene inside it, read through the
// same-origin frames the package mounts.
const skylineFrames = () =>
  browser.execute(() => {
    const viewer = document.querySelector<HTMLIFrameElement>(
      ".skyline-window iframe",
    );
    const viewerDocument = viewer?.contentDocument;
    const scene =
      viewerDocument?.querySelector<HTMLIFrameElement>("#skyline-3d-scene");
    const sceneDocument = scene?.contentDocument;
    return {
      title: viewer?.title,
      viewer: viewerDocument && {
        path: viewerDocument.location.pathname,
        query: viewerDocument.location.search,
        embedded: viewerDocument.documentElement.dataset.embedded,
      },
      scene: sceneDocument && {
        path: sceneDocument.location.pathname,
        canvas: sceneDocument.querySelector("canvas#building") !== null,
      },
    };
  });

// The dnbm sequencer's frame and the app inside it, read through the
// same-origin frame the package mounts.
const dnbmFrame = () =>
  browser.execute(() => {
    const frame = document.querySelector<HTMLIFrameElement>(
      ".dnbm-window iframe",
    );
    const app = frame?.contentDocument;
    const wordmark = app?.querySelector(".brand");
    return {
      title: frame?.title,
      width: frame?.clientWidth ?? 0,
      app: app && {
        path: app.location.pathname,
        query: app.location.search,
        embedded: app.documentElement.hasAttribute("data-embed"),
        wordmark: wordmark && getComputedStyle(wordmark).display,
        steps: app.querySelectorAll(".cell").length > 0,
      },
    };
  });

// The window whose title bar is foremost on the desktop.
const frontWindowTitle = () =>
  browser.execute(() => {
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

  it("renders every app with the published window styles", async () => {
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(4);
    await expect(resumeWindow().$(".window-titlebar-title")).toHaveText(
      "Resume",
    );
    await expect(asciiArtWindow().$(".window-titlebar-title")).toHaveText(
      "a2f0.net",
    );
    await expect(skylineWindow().$(".window-titlebar-title")).toHaveText(
      "Skyline",
    );
    await expect(dnbmWindow().$(".window-titlebar-title")).toHaveText("dnbm");
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
    expect(await windowBackground("section.window:has(.resume-window)")).toBe(
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
    await expect($("html")).toHaveAttribute("data-theme", "light");
    // White with a tenth of black.
    expect(await windowBackground("section.window:has(.resume-window)")).toBe(
      "color(srgb 0.9 0.9 0.9)",
    );
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

  it("embeds the skyline viewer from its copied assets", async () => {
    // The viewer and its 3D scene load from /skyline/: the trailing slash
    // keeps the scene's relative URL inside the copied assets.
    await browser.waitUntil(
      async () => (await skylineFrames()).scene?.canvas === true,
      { timeoutMsg: "the skyline viewer did not load its 3D scene" },
    );
    expect(await skylineFrames()).toEqual({
      title: "Interactive Chicago skyline",
      viewer: { path: "/skyline/", query: "?embed=1", embedded: "true" },
      scene: { path: "/skyline/skyline-3d", canvas: true },
    });
    // The skyline opens behind the artwork, so its frame has no focus yet.
    expect(await frontWindowTitle()).toBe("a2f0.net");
  });

  it("raises the skyline window when its frame is pressed", async () => {
    await browser.waitUntil(
      async () => (await skylineFrames()).scene?.canvas === true,
      { timeoutMsg: "the skyline viewer did not load its 3D scene" },
    );
    // Press the part of the skyline's body that shows right of the artwork.
    const artwork = await asciiArtWindow().getSize();
    const artworkAt = await asciiArtWindow().getLocation();
    const skylineAt = await skylineWindow().getLocation();
    const skylineSize = await skylineWindow().getSize();
    const x = Math.round(
      (artworkAt.x + artwork.width + skylineAt.x + skylineSize.width) / 2,
    );
    const y = Math.round(skylineAt.y + skylineSize.height / 2);
    await browser
      .action("pointer")
      .move({ origin: "viewport", x, y })
      .down()
      .up()
      .perform();
    await browser.waitUntil(
      async () => (await frontWindowTitle()) === "Skyline",
      { timeoutMsg: "pressing the skyline did not raise its window" },
    );
    // Focus went into the viewer's frame, not back to the window.
    expect(
      await browser.execute(
        () => document.activeElement?.closest(".skyline-window") !== null,
      ),
    ).toBe(true);
  });

  it("embeds the dnbm sequencer from its copied assets, fitted to its layout", async () => {
    // The steps render as the sequencer's document parses; the window fits
    // only on the frame's load event, once its assets have loaded too.
    await browser.waitUntil(
      async () => {
        const { app, width } = await dnbmFrame();
        return app?.steps === true && width >= 1200;
      },
      { timeoutMsg: "the dnbm sequencer did not load and fit its layout" },
    );
    const { width, ...frame } = await dnbmFrame();
    expect(frame).toEqual({
      title: "dnbm drum and bass sequencer",
      app: {
        path: "/dnbm/",
        query: "?embed=1",
        embedded: true,
        // The window's title names the app.
        wordmark: "none",
        steps: true,
      },
    });
    // The window opens fitted to the sequencer's 1200px desktop layout.
    expect(width).toBeGreaterThanOrEqual(1200);
    // The sequencer opens behind the other apps.
    expect(await frontWindowTitle()).toBe("a2f0.net");

    // In front, a press on play starts its audio engine: the playhead moves.
    await taskbar("dnbm").click();
    await browser.switchFrame($(".dnbm-window iframe"));
    await $(".play").click();
    await $(".cell.now").waitForExist({
      timeoutMsg: "the sequencer's playhead did not move",
    });
    await $(".play").click();
    await browser.switchFrame(null);
  });

  it("opens apps from the start menu", async () => {
    const start = $(".desktop-taskbar button[aria-label='Menu']");
    await expect(start).toHaveAttribute("aria-haspopup", "menu");
    await expect(start).toHaveAttribute("aria-expanded", "false");
    await skylineWindow().$("button[aria-label='Close window']").click();
    await expect(skylineWindow()).not.toBeExisting();

    await start.click();
    await expect(start).toHaveAttribute("aria-expanded", "true");
    const items = $$(".menu button");
    expect(await items.map((item) => item.getText())).toEqual([
      "dnbm",
      "Resume",
      "Skyline",
      "a2f0.net",
    ]);
    await expect($$(".menu button svg.menu-item-icon")).toBeElementsArrayOfSize(
      4,
    );

    await $(".menu").$("button=Skyline").click();
    await expect($(".menu")).not.toBeExisting();
    await expect(start).toHaveAttribute("aria-expanded", "false");
    await expect(skylineWindow()).toBeExisting();
    expect(await frontWindowTitle()).toBe("Skyline");
  });

  it("marks the front window and muted apps in the taskbar", async () => {
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
    await resumeWindow().$("button[aria-label='Minimize window']").click();
    await skylineWindow().$("button[aria-label='Close window']").click();
    await expect(skylineWindow()).not.toBeExisting();

    const chip = { icon: true, mutedBorder: true };
    expect(await taskbarState()).toEqual([
      { ...chip, title: "dnbm", pressed: "false", state: "open", muted: false },
      {
        ...chip,
        title: "Resume",
        pressed: "false",
        state: "minimized",
        muted: true,
      },
      {
        ...chip,
        title: "Skyline",
        pressed: "false",
        state: "closed",
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
    await taskbar("Resume").click();
    await waitForResume();
    await expect(
      $$(".desktop-surface > section.window"),
    ).toBeElementsArrayOfSize(4);
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
