import { $, browser, expect } from "@wdio/globals";

const toggle = () => $(".view-toggle");
const graffiti = () => $(".graffiti");
const ascii = () => $(".ascii");

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

describe("ASCII graffiti view", () => {
  beforeEach(async () => {
    // A hash-only navigation would reuse the page, so start each test fresh.
    await browser.url("about:blank");
  });

  it("starts on the SVG with the toggle unpressed", async () => {
    await browser.url("/");
    await expect(toggle()).toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
    await expect(graffiti()).toBeDisplayed();
    await expect(ascii()).not.toBeDisplayed();
  });

  it("renders the artwork as ASCII and toggles back", async () => {
    await browser.url("/");
    await toggle().click();
    await expect(ascii()).toBeDisplayed();
    await expect(graffiti()).not.toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect(await browser.getUrl()).toMatch(/#ascii$/);

    const art = await renderedArt();
    expect(art.columns).toBe(200);
    expect(art.widths).toEqual([art.columns]);
    expect(art.rows).toBeGreaterThan(40);
    expect(art.ink).toBeGreaterThan(2000);
    expect(art.faces).toBeGreaterThan(0);
    expect(art.sides).toBe(true);
    expect(art.overflow).toBe(false);

    await toggle().click();
    await expect(graffiti()).toBeDisplayed();
    await expect(ascii()).not.toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(await browser.getUrl()).not.toContain("#");
  });

  it("opens in ASCII from the #ascii link", async () => {
    await browser.url("/#ascii");
    await expect(ascii()).toBeDisplayed();
    await expect(graffiti()).not.toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");
    expect((await renderedArt()).ink).toBeGreaterThan(2000);
  });

  it("follows #ascii navigation within the page", async () => {
    await browser.url("/");
    await browser.execute(() => {
      window.location.hash = "ascii";
    });
    await expect(ascii()).toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "true");

    await browser.execute(() => {
      window.location.hash = "";
    });
    await expect(graffiti()).toBeDisplayed();
    await expect(ascii()).not.toBeDisplayed();
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("stays on the SVG when the artwork cannot load", async () => {
    await browser.url("/");
    await browser.execute(() => {
      window.fetch = () => Promise.reject(new Error("offline"));
    });
    await toggle().click();
    await expect(toggle()).toHaveAttribute("aria-pressed", "false");
    await expect(graffiti()).toBeDisplayed();
    await expect(ascii()).not.toBeDisplayed();
    expect(await browser.getUrl()).not.toContain("#");
  });
});
