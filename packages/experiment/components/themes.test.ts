import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { DEFAULT_EXPERIMENT_THEME, EXPERIMENT_THEMES } from "./themes";

const stylesheet = readFileSync(
  new URL("../styles/themes.css", import.meta.url),
  "utf8",
);

/** The custom properties a rule in themes.css sets, by its selector. */
function tokensOf(selector: string) {
  const start = stylesheet.indexOf(`${selector} {`);
  if (start === -1) return null;
  const block = stylesheet.slice(start, stylesheet.indexOf("}", start));
  return [...block.matchAll(/(--[\w-]+):/g)].map((match) => match[1]).sort();
}

test("the default theme is offered and styles the base :root", () => {
  expect(EXPERIMENT_THEMES.map((theme) => theme.id)).toContain(
    DEFAULT_EXPERIMENT_THEME,
  );
  expect(tokensOf(":root")).not.toBeNull();
});

test("every other theme sets each token the default sets", () => {
  const base = tokensOf(":root");
  for (const { id } of EXPERIMENT_THEMES) {
    if (id === DEFAULT_EXPERIMENT_THEME) continue;
    expect({ id, tokens: tokensOf(`:root[data-theme="${id}"]`) }).toEqual({
      id,
      tokens: base,
    });
  }
});
