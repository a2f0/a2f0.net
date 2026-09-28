import { $, browser, expect } from "@wdio/globals";

const play = () => $(".play-toggle");
const stage = () => $(".stage");

// Reports how far the etching has got: how many strokes the laser has
// started tracing, which units the fat laser has begun to fill, and how
// many etched lines have given way to paint.
const progress = () =>
  browser.execute(() => {
    const strokes = [
      ...document.querySelectorAll<SVGGeometryElement>(".etch-stroke"),
    ];
    const units = [
      ...document.querySelectorAll<SVGGElement>(".etch-fills g[data-fill]"),
    ];
    return {
      traced: strokes.filter(
        (stroke) =>
          Number.parseFloat(stroke.style.strokeDashoffset) <
          stroke.getTotalLength(),
      ).length,
      filling: units
        .filter((unit) => {
          const reveal = document.querySelector(
            `#etch-reveal-${unit.dataset.fill} rect`,
          );
          return Number(reveal?.getAttribute("height")) > 0;
        })
        .map((unit) => unit.hasAttribute("data-letter")),
      faded: document.querySelectorAll(".etch-stroke.filled").length,
    };
  });

const settled = async () => {
  await expect($(".etch-lines")).not.toBeExisting();
  await expect($(".etch-fills")).not.toBeExisting();
  await expect($(".etch-glow")).not.toBeExisting();
  await expect(stage()).not.toHaveAttribute("data-etching");
  await expect(play()).toHaveAttribute("aria-label", "Play etching animation");
  await expect(play()).not.toHaveAttribute("data-playing");
  expect(
    await browser.execute(
      () => document.querySelector<HTMLElement>(".graffiti")?.style.visibility,
    ),
  ).toBe("");
};

// Drives the animation clock by hand, so any moment can be drawn on demand
// and drawn again.
const freezeClock = () =>
  browser.addInitScript(() => {
    let now = 0;
    let queue: FrameRequestCallback[] = [];
    performance.now = () => now;
    window.requestAnimationFrame = (callback) => queue.push(callback);
    window.cancelAnimationFrame = () => undefined;
    Object.assign(window, {
      drawAt: (time: number) => {
        now = time;
        const callbacks = queue;
        queue = [];
        for (const callback of callbacks) callback(time);
      },
    });
  });

// Starts the etching and waits until every unit's paint is profiled; until
// then a unit burns across its whole width.
const playProfiled = async () => {
  await browser.url("/");
  await play().click();
  await expect($(".etch-fills[data-profiled]")).toBeExisting();
};

// Draws a moment with the frozen clock and totals the glow canvas.
const glowTotal = (time: number) =>
  browser.execute((at: number) => {
    (window as unknown as { drawAt: (t: number) => void }).drawAt(at);
    const canvas = document.querySelector<HTMLCanvasElement>(".etch-glow");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return 0;
    let total = 0;
    for (const value of ctx.getImageData(0, 0, canvas.width, canvas.height)
      .data) {
      total += value;
    }
    return total;
  }, time);

// Counts the separate pieces of the fat laser's white-hot core at a moment:
// the core is far brighter than the fan and halo around it.
const burningSegments = (time: number) =>
  browser.execute((at: number) => {
    (window as unknown as { drawAt: (t: number) => void }).drawAt(at);
    const canvas = document.querySelector<HTMLCanvasElement>(".etch-glow");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return 0;
    const { width, height } = canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    const core = (i: number) => data[i * 4 + 3] > 240;
    const seen = new Uint8Array(width * height);
    let segments = 0;
    for (let start = 0; start < width * height; start++) {
      if (seen[start] || !core(start)) continue;
      let size = 0;
      const stack = [start];
      seen[start] = 1;
      while (stack.length > 0) {
        const i = stack.pop() ?? 0;
        size++;
        const [x, y] = [i % width, Math.floor(i / width)];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const [nx, ny] = [x + dx, y + dy];
            const n = ny * width + nx;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (seen[n] || !core(n)) continue;
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
      if (size > 10) segments++;
    }
    return segments;
  }, time);

describe("Laser etching", () => {
  beforeEach(async () => {
    await browser.url("about:blank");
  });

  it("loads the finished artwork without etching", async () => {
    await browser.url("/");
    await expect(play()).toBeDisplayed();
    await settled();
  });

  it("traces the strokes, then fills each unit with its paint", async () => {
    await browser.url("/");
    await play().click();
    await expect(stage()).toHaveAttribute("data-etching");
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Stop etching animation",
    );

    // The vector pass traces strokes before anything is painted.
    await browser.waitUntil(async () => {
      const { traced, filling } = await progress();
      return traced > 0 && filling.length === 0;
    });
    // The fat laser then fills units, and their etched lines give way.
    await browser.waitUntil(
      async () => {
        const { filling, faded } = await progress();
        return filling.length > 0 && faded > 0;
      },
      { timeout: 12000 },
    );
    await browser.waitUntil(
      async () => !(await $(".etch-fills").isExisting()),
      { timeout: 15000, timeoutMsg: "the etching never finished" },
    );
    await settled();
    await expect(stage()).toHaveAttribute("data-view", "svg");
  });

  it("draws a visible beam and everything in grayscale", async () => {
    await browser.url("/");
    await play().click();
    // Reads the glow canvas during the vector pass: every lit pixel must be
    // gray, and the beam must reach up into the top of the canvas.
    const glow = () =>
      browser.execute(() => {
        const canvas = document.querySelector<HTMLCanvasElement>(".etch-glow");
        const ctx = canvas?.getContext("2d");
        const path = document.querySelector(".etch-stroke");
        if (!canvas?.width || !ctx || !path) return null;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const band = canvas.width * Math.floor(canvas.height * 0.05);
        let lit = 0;
        let colored = 0;
        let top = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue;
          lit++;
          const channels = [data[i], data[i + 1], data[i + 2]];
          if (Math.max(...channels) - Math.min(...channels) > 2) colored++;
          if (i / 4 < band) top++;
        }
        return { lit, colored, top, stroke: getComputedStyle(path).stroke };
      });
    await browser.waitUntil(async () => ((await glow())?.lit ?? 0) > 0);
    const { colored, top, stroke } = (await glow()) ?? {};
    expect(colored).toBe(0);
    expect(top).toBeGreaterThan(0);
    const [r, g, b] = (stroke ?? "").match(/\d+/g)?.map(Number) ?? [];
    expect(r).toBe(g);
    expect(g).toBe(b);

    // The fat laser's fan and burning line are gray too.
    await browser.waitUntil(async () => (await progress()).filling.length > 0, {
      timeout: 12000,
    });
    expect((await glow())?.colored).toBe(0);
  });

  it("traces every stroke in the artwork", async () => {
    await browser.url("/");
    await play().click();
    await expect($(".etch-lines")).toBeExisting();
    const layer = await browser.execute(() => {
      const strokes = [
        ...document.querySelectorAll<SVGGeometryElement>(".etch-stroke"),
      ];
      const shapes = document.querySelectorAll(
        ".etch-lines :is(path, line, polyline, polygon, rect, circle, ellipse)",
      );
      return {
        strokes: strokes.length,
        clipped: strokes.filter((stroke) => stroke.closest("[clip-path]"))
          .length,
        unstroked: [...shapes].filter(
          (shape) =>
            !shape.closest("defs") && !shape.classList.contains("etch-stroke"),
        ).length,
        copies: document.querySelectorAll(
          ".etch-lines [data-copy='#etch-lines-word']",
        ).length,
      };
    });
    // Every contour of the brushwork, extrusion edges, faces, and details;
    // only the extrusion's hidden middle copies are left out.
    expect(layer.strokes).toBeGreaterThan(200);
    expect(layer.clipped).toBeGreaterThan(0);
    expect(layer.unstroked).toBe(0);
    expect(layer.copies).toBe(6);

    // Finished strokes cool from white to gray as later ones are traced.
    await browser.waitUntil(
      async () =>
        (await browser.execute(
          () => document.querySelectorAll(".etch-stroke.cooled").length,
        )) > 50,
    );
  });

  it("keeps the fat laser steady from frame to frame", async () => {
    const clock = await freezeClock();
    try {
      await playProfiled();
      const first = await glowTotal(8200);
      expect(first).toBeGreaterThan(0);
      expect(await glowTotal(8200)).toBe(first);
    } finally {
      await clock.remove();
    }
  });

  it("burns only where the unit under the laser has paint", async () => {
    const clock = await freezeClock();
    try {
      await playProfiled();
      // Early in the fill pass the laser crosses the extrusion, whose rows
      // break between the letters. Burning a unit's whole width would draw
      // one unbroken line instead.
      const segments = [];
      for (const time of [6150, 6400, 6700, 7000]) {
        segments.push(await burningSegments(time));
      }
      expect(Math.max(...segments)).toBeGreaterThan(1);
    } finally {
      await clock.remove();
    }
  });

  it("etches and fills the lettering first", async () => {
    await browser.url("/");
    await play().click();
    // The first strokes to finish are all on the letters.
    const cooled = () =>
      browser.execute(() =>
        [...document.querySelectorAll(".etch-stroke.cooled")].map((stroke) =>
          stroke.hasAttribute("data-letter"),
        ),
      );
    await browser.waitUntil(async () => (await cooled()).length > 20);
    expect((await cooled()).every(Boolean)).toBe(true);
    // So are the first units the fat laser fills.
    await browser.waitUntil(async () => (await progress()).filling.length > 0, {
      timeout: 12000,
    });
    expect((await progress()).filling.every(Boolean)).toBe(true);
    // Brushwork and ornaments follow the lettering in both passes.
    expect(
      await browser.execute(
        () =>
          document.querySelectorAll(".etch-stroke:not([data-letter])").length,
      ),
    ).toBeGreaterThan(0);
  });

  it("stops at once when stop is pressed", async () => {
    await browser.url("/");
    await play().click();
    await expect($(".etch-lines")).toBeExisting();
    await play().click();
    await settled();
  });

  it("stops at once while the artwork is still loading", async () => {
    const slow = await browser.addInitScript(() => {
      const load = window.fetch.bind(window);
      window.fetch = ((...request: Parameters<typeof fetch>) =>
        new Promise((resolve) => setTimeout(resolve, 3000)).then(() =>
          load(...request),
        )) as typeof fetch;
    });
    try {
      await browser.url("/");
      await play().click();
      await expect(play()).toHaveAttribute(
        "aria-label",
        "Stop etching animation",
      );
      await play().click();
      await browser.waitUntil(
        async () =>
          (await play().getAttribute("aria-label")) ===
          "Play etching animation",
        { timeout: 1000, timeoutMsg: "stop waited for the artwork to load" },
      );
      await settled();
    } finally {
      await slow.remove();
    }
  });

  it("switches from the ASCII view to the SVG before etching", async () => {
    await browser.url("/");
    await $(".view-toggle").click();
    await expect(stage()).toHaveAttribute("data-view", "ascii");
    await play().click();
    await expect(stage()).toHaveAttribute("data-view", "svg");
    await expect(stage()).toHaveAttribute("data-etching");
  });

  it("keeps the lens shut and ignores clicks on the art while etching", async () => {
    await browser.url("/");
    await play().click();
    await stage().moveTo({ xOffset: -300, yOffset: -40 });
    await stage().click({ x: -300, y: -40 });
    await expect(stage()).toHaveAttribute("data-etching");
    await expect(stage()).toHaveAttribute("data-view", "svg");
    expect(
      await browser.execute(() =>
        window
          .getComputedStyle(document.querySelector(".stage") as Element)
          .getPropertyValue("--lens"),
      ),
    ).toBe("0px");
  });

  it("stops etching when the ASCII view is chosen", async () => {
    await browser.url("/");
    await play().click();
    await expect(stage()).toHaveAttribute("data-etching");
    await $(".view-toggle").click();
    await settled();
    await expect(stage()).toHaveAttribute("data-view", "ascii");
  });
});
