import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  DEFAULT_WEBSITE_THEME,
  WEBSITE_THEME_COLORS,
  WEBSITE_THEMES,
} from "./themes";

const stylesheet = readFileSync(
  new URL("../styles/themes.css", import.meta.url),
  "utf8",
);

/** The text of the rule in themes.css with this selector. */
function blockOf(selector: string) {
  const start = stylesheet.indexOf(`${selector} {`);
  if (start === -1) return null;
  return stylesheet.slice(start, stylesheet.indexOf("}", start));
}

/** The custom properties a rule in themes.css sets, by its selector. */
function tokensOf(selector: string) {
  const block = blockOf(selector);
  if (block === null) return null;
  return [...block.matchAll(/(--[\w-]+):/g)].map((match) => match[1]).sort();
}

/** A theme's rule: the base :root for the default, else its data-theme. */
const selectorOf = (id: string) =>
  id === DEFAULT_WEBSITE_THEME ? ":root" : `:root[data-theme="${id}"]`;

/** A hex color in its six-digit lowercase form. */
const sixDigits = (hex: string) =>
  hex.length === 4
    ? `#${[...hex.slice(1)].map((digit) => digit + digit).join("")}`.toLowerCase()
    : hex.toLowerCase();

test("the default theme is offered and styles the base :root", () => {
  expect(WEBSITE_THEMES.map((theme) => theme.id)).toContain(
    DEFAULT_WEBSITE_THEME,
  );
  expect(tokensOf(":root")).not.toBeNull();
});

test("every other theme sets each token the default sets", () => {
  const base = tokensOf(":root");
  for (const { id } of WEBSITE_THEMES) {
    if (id === DEFAULT_WEBSITE_THEME) continue;
    expect({ id, tokens: tokensOf(`:root[data-theme="${id}"]`) }).toEqual({
      id,
      tokens: base,
    });
  }
});

test("each theme colors the browser's chrome with its desk", () => {
  expect(Object.keys(WEBSITE_THEME_COLORS).sort()).toEqual(
    WEBSITE_THEMES.map((theme) => theme.id).sort(),
  );
  for (const { id } of WEBSITE_THEMES) {
    const desk = /--desktop-background:\s*(#[0-9a-f]+);/i.exec(
      blockOf(selectorOf(id)) ?? "",
    )?.[1];
    expect({ id, color: WEBSITE_THEME_COLORS[id] }).toEqual({
      id,
      color: sixDigits(desk ?? ""),
    });
  }
});
