import { expect, test } from "bun:test";
import {
  DEFAULT_WEBSITE_WALLPAPER,
  WALLPAPER_STORAGE_KEY,
  WEBSITE_WALLPAPERS,
} from "./wallpapers";

test("offers the designed collection first with Flux as the new-visitor default", () => {
  expect(WEBSITE_WALLPAPERS.map(({ id, label }) => [id, label])).toEqual([
    ["flux", "Flux"],
    ["aperture", "Aperture"],
    ["isochrome", "Isochrome"],
    ["bricks", "Bricks"],
    ["honeycomb", "Honeycomb"],
    ["harlequin", "Harlequin"],
    ["chevron", "Chevron"],
    ["plain", "None"],
  ]);
  expect(DEFAULT_WEBSITE_WALLPAPER).toBe("flux");
  expect(WALLPAPER_STORAGE_KEY).toBe("website.wallpaper");
});

test("each designed wallpaper is a distinct, self-contained, theme-colored large tile", () => {
  const designed = WEBSITE_WALLPAPERS.slice(0, 3);
  expect(new Set(designed.map(({ tile }) => tile?.svg)).size).toBe(3);
  for (const { tile, base, ink } of designed) {
    expect(base).toContain("var(--color-light)");
    expect(ink).toContain("var(--color-light)");
    expect(tile?.width).toBeGreaterThanOrEqual(128);
    expect(tile?.width).toBeLessThanOrEqual(256);
    expect(tile?.height).toBeGreaterThanOrEqual(128);
    expect(tile?.height).toBeLessThanOrEqual(256);
    expect(tile?.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(tile?.svg).toContain(`viewBox="0 0 ${tile?.width} ${tile?.height}"`);
    expect(tile?.svg).toContain("opacity=");
    expect(tile?.svg).not.toMatch(
      /<(?:script|image|foreignObject|animate)|(?:href|style)=/i,
    );
  }
});
