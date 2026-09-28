import { $, browser, expect } from "@wdio/globals";

const play = () => $(".play-toggle");
const stage = () => $(".stage");

// Reports how far the etching has got: how much of the first outline is
// traced, how much of the artwork is revealed, and how hot the outlines are.
const progress = () =>
  browser.execute(() => {
    const path = document.querySelector<SVGPathElement>(".etch-lines path");
    const lines = document.querySelector<SVGSVGElement>(".etch-lines");
    const clip =
      document.querySelector<HTMLElement>(".graffiti")?.style.clipPath;
    const hidden = /inset\(0(?:px)? 0(?:px)? ([\d.]+)%/.exec(clip ?? "");
    return {
      traced: path
        ? path.getTotalLength() - Number.parseFloat(path.style.strokeDashoffset)
        : null,
      revealed: hidden ? 100 - Number.parseFloat(hidden[1]) : null,
      heat: lines ? Number.parseFloat(lines.style.opacity || "1") : null,
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

  it("traces the outlines, then reveals the artwork from the top", async () => {
    await browser.url("/");
    await play().click();
    await expect(stage()).toHaveAttribute("data-etching");
    await expect(play()).toHaveAttribute(
      "aria-label",
      "Stop etching animation",
    );

    // The vector pass traces the outlines over a still-hidden artwork.
    await browser.waitUntil(async () => {
      const { traced, revealed } = await progress();
      return (traced ?? 0) > 0 && revealed === 0;
    });
    // The raster pass reveals the artwork while the outlines cool.
    await browser.waitUntil(async () => {
      const { revealed, heat } = await progress();
      return (revealed ?? 0) > 0 && (revealed ?? 0) < 100 && (heat ?? 1) < 1;
    });
    await browser.waitUntil(
      async () => !(await $(".etch-lines").isExisting()),
      { timeout: 8000, timeoutMsg: "the etching never finished" },
    );
    await settled();
    await expect(stage()).toHaveAttribute("data-view", "svg");
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
