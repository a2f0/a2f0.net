import { $, browser } from "@wdio/globals";

// The selectors, probes, and setup more than one desktop spec uses.

export const resumeWindow = () => $("section.window:has(.resume-window)");
export const asciiArtWindow = () => $("section.window:has(.ascii-art-window)");
export const skylineWindow = () => $("section.window:has(.skyline-window)");
export const dnbmWindow = () => $("section.window:has(.dnbm-window)");
export const playerWindow = () => $("section.window:has(.dnbm-player-window)");

// A window's title is its app's, or names what the app shows before it, as the
// dnbm windows name their song: "Undertow — dnbm".
const appTitle = (title: string | null | undefined) =>
  title?.split(" — ").at(-1);
export const titleOf = (app: string) => new RegExp(`^(.+ — )?${app}$`);

// A taskbar button carries its window's title. A CSS selector, unlike a text
// selector, finds no match without searching the artwork's shadow root.
export const taskbar = (app: string) =>
  $(
    `.desktop-taskbar-button[title="${app}"], .desktop-taskbar-button[title$=" — ${app}"]`,
  );

// A scrollbar changes the measured body width, replacing the SVG during
// layout. Query the current node each time instead of retaining a detached one.
export const waitForResume = () =>
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

export const backgroundOf = (selector: string) =>
  browser.execute((target) => {
    const frame = document.querySelector(target);
    if (!frame) throw new Error(`Missing ${target}`);
    return getComputedStyle(frame).backgroundColor;
  }, selector);

// The colors the resume draws its text in, which follow its theme.
export const resumeTextFills = () =>
  browser.execute(() => [
    ...new Set(
      Array.from(document.querySelectorAll(".resume-window svg text"), (text) =>
        text.getAttribute("fill"),
      ),
    ),
  ]);

// The resume opens fitted once its page renders: at the 900px desktop the
// window fills the surface's height.
export const waitForResumeFit = () =>
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

export const siteState = () =>
  browser.execute(() => {
    const root = document.querySelector(".ascii-art-window")?.shadowRoot;
    return {
      view: root?.querySelector(".stage")?.getAttribute("data-view"),
      ascii: root?.querySelector(".ascii")?.textContent,
    };
  });

// The skyline viewer's region and the viewer the package renders in its shadow
// root, in this page rather than in a frame.
export const skylineApp = () =>
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
export const waitForSkyline = () =>
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

// The dnbm sequencer's region and the app the package renders in its shadow
// root, in this page rather than in a frame.
export const dnbmApp = () =>
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
export const playerApp = () =>
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

export const dnbmRegion = () => $(".dnbm-window [role=region]");
export const playerRegion = () => $(".dnbm-player-window [role=region]");

export const waitForDnbmApps = () =>
  browser.waitUntil(
    async () =>
      (await dnbmApp()).app?.steps === true &&
      ((await playerApp()).app?.tracks ?? 0) > 0,
    { timeoutMsg: "the dnbm sequencer and player did not load" },
  );

// Presses the first element matching `target` inside a dnbm app where it
// shows in front of the other windows: a grid cell, say, or a knob.
export const pressInApp = async (selector: string, target: string) => {
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
export const dnbmAction = (label: string) =>
  dnbmWindow().$(`.window-toolbar button[aria-label='${label}']`);
export const playerAction = (label: string) =>
  playerWindow().$(`.window-toolbar button[aria-label='${label}']`);

// The app of the window foremost on the desktop.
export const frontWindowApp = async () =>
  appTitle(
    await browser.execute(() => {
      const windows = [
        ...document.querySelectorAll<HTMLElement>(
          ".desktop-surface section.window",
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

// Every desktop spec starts each test from a loaded windowed desktop, with
// the resume and the artwork drawn.
export const useDesktop = () => {
  beforeEach(async () => {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.url("/");
    await waitForResume();
    await browser.waitUntil(async () => (await siteState()).view === "ascii", {
      timeoutMsg: "the demo did not mount inside its shadow root",
    });
  });

  // The sequencer autosaves its song in this origin's storage, the layout and
  // theme switches their choices, and the desktop its icon layout (in the
  // private file system). Start each test from the example song on the
  // windowed desktop in the default theme with the icons in their grid, even
  // after a test that changed them failed.
  afterEach(() =>
    browser.execute(async () => {
      localStorage.removeItem("dnbm:song");
      localStorage.removeItem("dnbm:saved");
      localStorage.removeItem("website.navigationMode");
      localStorage.removeItem("website.launcherPlacement");
      localStorage.removeItem("website.theme");
      const root = await navigator.storage.getDirectory();
      // A test that never moved an icon leaves no directory to remove.
      await root
        .removeEntry("website", { recursive: true })
        .catch(() => undefined);
    }),
  );
};
