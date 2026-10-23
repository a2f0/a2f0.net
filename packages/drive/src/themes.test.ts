import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  DEFAULT_DRIVE_THEME,
  DRIVE_THEME_COLORS,
  DRIVE_THEMES,
  driveThemeColor,
} from "./themes";

const stylesheet = readFileSync(
  new URL("./drive.css", import.meta.url),
  "utf8",
);

// drive.css styles the dark scheme by default and the light one under the
// scheme the theme provider stamps.
const SELECTORS = {
  dark: ".drive-dialog {",
  light:
    ':root[data-theme-scheme="light"] :is(.drive-page, .drive-app, .drive-dialog) {',
};

/** A scheme's page color, `--drive-paper`, in drive.css. */
function paperOf(scheme: keyof typeof SELECTORS) {
  const start = stylesheet.indexOf(SELECTORS[scheme]);
  if (start === -1) return "";
  const block = stylesheet.slice(start, stylesheet.indexOf("}", start));
  return /--drive-paper:\s*(#[0-9a-f]{6});/i.exec(block)?.[1] ?? "";
}

test("each theme colors the browser's chrome with its page", () => {
  expect(Object.keys(DRIVE_THEME_COLORS).sort()).toEqual(
    DRIVE_THEMES.map((theme) => theme.id).sort(),
  );
  for (const { id, scheme } of DRIVE_THEMES) {
    expect({ id, color: DRIVE_THEME_COLORS[id] }).toEqual({
      id,
      color: paperOf(scheme),
    });
  }
});

test("a theme Drive does not offer gets the default theme's color", () => {
  expect(driveThemeColor("paper")).toBe(DRIVE_THEME_COLORS.paper);
  expect(driveThemeColor("skyline")).toBe(
    DRIVE_THEME_COLORS[DEFAULT_DRIVE_THEME],
  );
  expect(driveThemeColor("toString")).toBe(
    DRIVE_THEME_COLORS[DEFAULT_DRIVE_THEME],
  );
});
