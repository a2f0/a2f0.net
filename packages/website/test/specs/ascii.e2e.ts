import { $, browser, expect } from "@wdio/globals";

const toggle = () => $(".view-toggle");
const music = () => $(".music-toggle");
const play = () => $(".play-toggle");
const stage = () => $(".stage");
const graffiti = () => $(".graffiti");
const ascii = () => $(".ascii");

// The view on top is the one on show; the other waits underneath the lens.
const expectView = async (view: "svg" | "ascii") => {
  const [shown, hidden] =
    view === "svg" ? [graffiti(), ascii()] : [ascii(), graffiti()];
  await expect(stage()).toHaveAttribute("data-view", view);
  await expect(shown).not.toHaveAttribute("aria-hidden");
  await expect(hidden).toHaveAttribute("aria-hidden", "true");
};

const renderedArt = () =>
  browser.execute(() => {
    const pre = document.querySelector<HTMLElement>(".ascii");
    const lines = (pre?.textContent ?? "").split("\n").filter(Boolean);
    return {
      columns: Number(pre?.style.getPropertyValue("--columns")),
      widths: [...new Set(lines.map((line) => line.length))],
      rows: lines.length,
      ink: lines.join("").replaceAll(" ", "").length,
      faces: pre?.querySelectorAll(".face").length ?? 0,
      sides: [...(pre?.querySelectorAll(".side") ?? [])].some((side) =>
        side.textContent?.includes("\\"),
      ),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

// Reports the lens radius and which layer is hit at its centre and just
// beyond its edge.
const lens = () =>
  browser.execute(() => {
    const stage = document.querySelector<HTMLElement>(".stage");
    if (!stage) throw new Error("Missing stage");
    const box = stage.getBoundingClientRect();
    const style = window.getComputedStyle(stage);
    const [radius, x, y] = ["--lens", "--x", "--y"].map((name) =>
      Number.parseFloat(style.getPropertyValue(name)),
    );
    const layerAt = (dx: number) =>
      document
        .elementFromPoint(box.left + x + dx, box.top + y)
        ?.closest(".ascii, .graffiti")?.className;
    return { radius, inside: layerAt(0), outside: layerAt(radius + 40) };
  });

const lensSettles = (radius: number) =>
  browser.waitUntil(async () => (await lens()).radius === radius, {
    timeoutMsg: `lens never settled at ${radius}px`,
  });

// Whether the SVG is painted, wherever it sits in the stack.
const svgVisible = () =>
  browser.execute(() => {
    const svg = document.querySelector(".graffiti");
    if (!svg) throw new Error("Missing .graffiti");
    return window.getComputedStyle(svg).visibility === "visible";
  });

// Holds back every fetch the page makes, and so the ASCII render.
const slowFetch = (ms: number) =>
  browser.addInitScript((delay: number) => {
    const load = window.fetch.bind(window);
    window.fetch = ((...request: Parameters<typeof fetch>) =>
      new Promise((resolve) => setTimeout(resolve, delay)).then(() =>
        load(...request),
      )) as typeof fetch;
  }, ms);

// Loads the page and waits for it to open on the ASCII.
const opened = async () => {
  await browser.url("/");
  await expectView("ascii");
};

describe("ASCII graffiti view", () => {
  beforeEach(async () => {
    // Start every test from a fresh page load.
    await browser.url("about:blank");
  });

  it("opens on the ASCII with the toggle pressed", async () => {
    await browser.url("/");
    await expect(toggle()).toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
    await expectView("ascii");
    await expect(ascii()).toBeDisplayed();
    expect((await lens()).radius).toBe(0);
    // The SVG underneath is ready for the lens.
    expect(await svgVisible()).toBe(true);
  });

  it("keeps the SVG hidden until the ASCII renders", async () => {
    const slow = await slowFetch(1000);
    try {
      await browser.url("/");
      await expect(toggle()).toHaveAttribute("aria-pressed", "true");
      await expect(stage()).toHaveAttribute("data-view", "svg");
      expect(await svgVisible()).toBe(false);
      await expectView("ascii");
      expect(await svgVisible()).toBe(true);
    } finally {
      await slow.remove();
    }
  });

  it("shows the SVG anyway when the ASCII is slow to render", async () => {
    // The SVG shows after a few seconds whether or not anything settles the
    // view, as when the script never runs.
    const slow = await slowFetch(10000);
    try {
      await browser.url("/");
      expect(await svgVisible()).toBe(false);
      await browser.waitUntil(svgVisible, {
        timeout: 5000,
        timeoutMsg: "the SVG never showed",
      });
      await expect(stage()).toHaveAttribute("data-view", "svg");
      await expect(stage()).not.toHaveAttribute("data-ready");
    } finally {
      await slow.remove();
    }
  });

  it("shows the SVG at once when chosen while the ASCII renders", async () => {
    const slow = await slowFetch(10000);
    try {
      await browser.url("/");
      expect(await svgVisible()).toBe(false);
      await toggle().click();
      await expect(toggle()).toHaveAttribute("aria-pressed", "false");
      await expectView("svg");
      expect(await svgVisible()).toBe(true);
    } finally {
      await slow.remove();
    }
  });

  it("renders the artwork as ASCII and toggles back", async () => {
    await opened();
    expect(await browser.getUrl()).not.toContain("#");

    const art = await renderedArt();
    expect(art.columns).toBe(200);
    expect(art.widths).toEqual([art.columns]);
    expect(art.rows).toBeGreaterThan(40);
    expect(art.ink).toBeGreaterThan(2000);
    expect(art.faces).toBeGreaterThan(0);
    expect(art.sides).toBe(true);
    expect(art.overflow).toBe(false);

    await toggle().click();
    await expectView("svg");
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(await browser.getUrl()).not.toContain("#");

    await toggle().click();
    await expectView("ascii");
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(await browser.getUrl()).not.toContain("#");
  });

  it("redraws the ASCII for its container's width", async () => {
    await opened();
    expect((await renderedArt()).columns).toBe(200);
    // The site follows its container rather than the viewport, so it can be
    // shown in a window.
    await browser.execute(() => {
      const main = document.querySelector("main");
      if (main) main.style.width = "700px";
    });
    await browser.waitUntil(async () => (await renderedArt()).columns === 100, {
      timeoutMsg: "The ASCII never redrew for its narrower container",
    });
    const art = await renderedArt();
    expect(art.widths).toEqual([100]);
    expect(art.overflow).toBe(false);
  });

  it("keeps the view out of the URL", async () => {
    await browser.url("/#svg");
    await expectView("ascii");
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("styles the ASCII toggle like a link, with no pressed look", async () => {
    const look = () =>
      browser.execute(() => {
        const button = document.querySelector(".view-toggle");
        if (!button) throw new Error("Missing .view-toggle");
        const style = window.getComputedStyle(button);
        return { color: style.color, border: style.borderTopWidth };
      });
    await opened();
    // Earlier tests can leave the pointer where the toggle sits.
    await browser.action("pointer").move({ x: 1, y: 1 }).perform();
    const resting = await look();
    expect(resting).toEqual({ color: "rgb(138, 138, 138)", border: "0px" });

    await toggle().moveTo();
    expect((await look()).color).toBe("rgb(255, 255, 255)");

    await toggle().click();
    await expectView("svg");
    await browser.action("pointer").move({ x: 1, y: 1 }).perform();
    expect(await look()).toEqual(resting);
  });

  it("puts square tools in the canvas's top-right corner", async () => {
    await browser.url("/");
    await expect($(".play-toggle")).toBeDisplayed();
    await expect(music()).toBeDisplayed();
    await expect(toggle()).toBeDisplayed();
    await expect($(".window-toggle")).toBeDisplayed();
    const layout = await browser.execute(() => {
      const rect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element.getBoundingClientRect();
      };
      const canvas = rect(".canvas");
      const stage = rect(".stage");
      const tools = [
        ".play-toggle",
        ".music-toggle",
        ".view-toggle",
        ".window-toggle",
      ].map(rect);
      const last = tools[tools.length - 1];
      return {
        canvas: [canvas.width, canvas.height],
        stage: [stage.width, stage.height],
        top: tools[0].top - canvas.top,
        right: canvas.right - last.right,
        inOrder: tools.every(
          (tool, i) => i === 0 || tools[i - 1].right <= tool.left,
        ),
        aligned: tools.every((tool) => tool.top === tools[0].top),
        squares: tools.every(
          ({ width, height }) => width === height && width <= 32,
        ),
      };
    });
    expect(layout.canvas).toEqual(layout.stage);
    expect(layout.top).toBeGreaterThan(0);
    expect(layout.top).toBeLessThanOrEqual(16);
    expect(layout.right).toBeGreaterThan(0);
    expect(layout.right).toBeLessThanOrEqual(16);
    expect(layout).toMatchObject({
      inOrder: true,
      aligned: true,
      squares: true,
    });
  });

  it("leaves the music player as a placeholder", async () => {
    await opened();
    await expect(music()).toHaveAttribute("aria-disabled", "true");
    await music().click();
    await expectView("ascii");
    expect(await browser.getUrl()).not.toContain("#");
  });

  it("peeks at the SVG through a lens under the pointer", async () => {
    await opened();
    await stage().moveTo({ xOffset: -300, yOffset: -40 });
    await lensSettles(46);
    expect(await lens()).toMatchObject({
      inside: "graffiti",
      outside: "ascii",
    });

    await browser.action("pointer").move({ x: 1, y: 1 }).perform();
    await lensSettles(0);
    await expectView("ascii");

    // The toolbar sits over the canvas but is not part of the artwork.
    await stage().moveTo({ xOffset: -300, yOffset: -40 });
    await lensSettles(46);
    await toggle().moveTo();
    await lensSettles(0);
  });

  it("peeks with a mouse on a touch-first device", async () => {
    const touchFirst = await browser.addInitScript(() => {
      const match = window.matchMedia.bind(window);
      window.matchMedia = (query: string) =>
        query === "(hover: hover)"
          ? ({ matches: false } as MediaQueryList)
          : match(query);
    });
    try {
      await opened();
      await stage().moveTo({ xOffset: -300, yOffset: -40 });
      await stage().moveTo({ xOffset: -290, yOffset: -40 });
      await lensSettles(46);
      expect((await lens()).inside).toBe("graffiti");
    } finally {
      await touchFirst.remove();
    }
  });

  it("flips the view when the artwork is clicked", async () => {
    await opened();
    await stage().click({ x: 120, y: 30 });
    await expectView("svg");
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(await browser.getUrl()).not.toContain("#");

    // The lens reopens onto the ASCII that is now underneath.
    await lensSettles(46);
    expect(await lens()).toMatchObject({
      inside: "ascii",
      outside: "graffiti",
    });

    await stage().click({ x: -300, y: -40 });
    await expectView("ascii");
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(await browser.getUrl()).not.toContain("#");
    await lensSettles(46);
    expect((await lens()).inside).toBe("graffiti");
  });

  it("settles on the ASCII when clicked twice while it renders", async () => {
    const slow = await slowFetch(1000);
    try {
      await browser.url("/");
      await stage().click({ x: -300, y: -40 });
      await stage().click({ x: 120, y: 30 });
      await expectView("ascii");
      await expect(toggle()).toHaveAttribute("aria-pressed", "true");
      expect(await browser.getUrl()).not.toContain("#");
      await lensSettles(46);
    } finally {
      await slow.remove();
    }
  });

  it("falls back to the SVG when the artwork cannot load", async () => {
    const offline = await browser.addInitScript(() => {
      window.fetch = ((..._request: Parameters<typeof fetch>) =>
        Promise.reject(new Error("offline"))) as typeof fetch;
    });
    try {
      await browser.url("/");
      await expect(toggle()).toHaveAttribute("aria-pressed", "false");
      await expectView("svg");
      expect(await svgVisible()).toBe(true);
      await expect(play()).toHaveAttribute(
        "aria-label",
        "Play etching animation",
      );

      await toggle().click();
      await expect(toggle()).toHaveAttribute("aria-pressed", "false");
      await expectView("svg");
      expect(await browser.getUrl()).not.toContain("#");

      await stage().click();
      await expect(toggle()).toHaveAttribute("aria-pressed", "false");
      await expectView("svg");
      expect((await lens()).radius).toBe(0);
    } finally {
      await offline.remove();
    }
  });
});
