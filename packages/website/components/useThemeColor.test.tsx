import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { WEBSITE_THEME_COLORS } from "./themes";
import { useThemeColor } from "./useThemeColor";

let colors: string[] = [];

function Probe() {
  const color = useThemeColor();
  colors.push(color);
  return null;
}

let root: Root | undefined;

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterAll(() => GlobalRegistrator.unregister());

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  colors = [];
  document.documentElement.removeAttribute("data-theme");
});

const stamp = (id: string) =>
  act(async () => {
    document.documentElement.setAttribute("data-theme", id);
    // The observer reports attribute changes in a microtask.
    await Promise.resolve();
  });

test("the exported page shows the default theme's color", () => {
  document.documentElement.setAttribute("data-theme", "paper");
  renderToString(<Probe />);
  expect(colors).toEqual([WEBSITE_THEME_COLORS.graphite]);
});

test("the color follows the theme stamped on <html>", async () => {
  root = createRoot(document.createElement("div"));
  await act(async () => root?.render(<Probe />));
  expect(colors.at(-1)).toBe(WEBSITE_THEME_COLORS.graphite);
  await stamp("paper");
  expect(colors.at(-1)).toBe(WEBSITE_THEME_COLORS.paper);
  await stamp("graphite");
  expect(colors.at(-1)).toBe(WEBSITE_THEME_COLORS.graphite);
});

test("a theme the site does not offer shows the default's color", async () => {
  document.documentElement.setAttribute("data-theme", "paper");
  root = createRoot(document.createElement("div"));
  await act(async () => root?.render(<Probe />));
  expect(colors.at(-1)).toBe(WEBSITE_THEME_COLORS.paper);
  await stamp("skyline");
  expect(colors.at(-1)).toBe(WEBSITE_THEME_COLORS.graphite);
});
