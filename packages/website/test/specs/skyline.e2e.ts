import { $, browser, expect } from "@wdio/globals";
import {
  frontWindowApp,
  resumeWindow,
  skylineApp,
  skylineWindow,
  taskbar,
  useDesktop,
  waitForSkyline,
} from "../lib/desktop";

// Finds a point where the skyline's 3D scene shows in front of the other
// windows, or null while they cover it.
const skylineScenePoint = () =>
  browser.execute(() => {
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
    return null;
  });

// Presses the skyline's 3D scene where it shows in front of the other windows.
// The skyline can be ready before the dnbm player above it fits its content:
// until then the player opens at its generic size and covers the scene, so
// wait for the scene to show. A press without a drag leaves the camera where
// it is.
const pressSkylineScene = async () => {
  const { x, y } = await browser.waitUntil(skylineScenePoint, {
    timeoutMsg: "No part of the skyline's scene shows",
  });
  await browser
    .action("pointer")
    .move({ origin: "viewport", x, y })
    .down()
    .up()
    .perform();
};

describe("Website skyline window", () => {
  useDesktop();

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
    // The skyline opens behind the resume.
    expect(await frontWindowApp()).toBe("Resume");
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
    // The skyline's scene shows to the right of the other windows.
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
    // The resume window has focus. Arrows rotate the skyline and + zooms it,
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
});
