import { $, browser, expect } from "@wdio/globals";

const play = () => $(".play-toggle");
const stage = () => $(".stage");

// Reports how far the etching has got: how much of the first stroke is
// traced, how much of the artwork is revealed, and how much of the traced
// strokes the raster pass has already replaced.
const progress = () =>
  browser.execute(() => {
    const stroke = document.querySelector<SVGGeometryElement>(".etch-stroke");
    const lines = document.querySelector<SVGSVGElement>(".etch-lines");
    const clip =
      document.querySelector<HTMLElement>(".graffiti")?.style.clipPath;
    const hidden = /inset\(0(?:px)? 0(?:px)? ([\d.]+)%/.exec(clip ?? "");
    const replaced = /inset\(([\d.]+)%/.exec(lines?.style.clipPath ?? "");
    return {
      traced: stroke
        ? stroke.getTotalLength() -
          Number.parseFloat(stroke.style.strokeDashoffset)
        : null,
      revealed: hidden ? 100 - Number.parseFloat(hidden[1]) : null,
      replaced: replaced ? Number.parseFloat(replaced[1]) : 0,
    };
  });

const settled = async () => {
  await expect($(".etch-lines")).not.toBeExisting();
  await expect($(".etch-glow")).not.toBeExisting();
  await expect(stage()).not.toHaveAttribute("data-etching");
  await expect(play()).toHaveAttribute("aria-label", "Play etching animation");
  await expect(play()).not.toHaveAttribute("data-playing");
  expect(
    await browser.execute(
      () => document.querySelector<HTMLElement>(".graffiti")?.style.clipPath,
    ),
  ).toBe("");
};

describe("Laser etching", () => {
  beforeEach(async () => {
    await browser.url("about:blank");
  });

  it("loads the finished artwork without etching", async () => {
    await browser.url("/");
    await expect(play()).toBeDisplayed();
    await settled();
  });

  it("traces the strokes, then reveals the artwork from the top", async () => {
    await browser.url("/");
    await play().click();
    await expect(stage()).toHaveAttribute("data-etching");
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Stop etching animation",
    );

    // The vector pass traces the strokes over a still-hidden artwork.
    await browser.waitUntil(async () => {
      const { traced, revealed } = await progress();
      return (traced ?? 0) > 0 && revealed === 0;
    });
    // The raster pass swaps the traced strokes for the finished artwork.
    await browser.waitUntil(
      async () => {
        const { revealed, replaced } = await progress();
        return (
          (revealed ?? 0) > 0 &&
          (revealed ?? 0) < 100 &&
          Math.abs((revealed ?? 0) - replaced) < 1
        );
      },
      { timeout: 12000 },
    );
    await browser.waitUntil(
      async () => !(await $(".etch-lines").isExisting()),
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
        copies: document.querySelectorAll(".etch-lines [data-copy='#word']")
          .length,
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
