import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";

import { AsciiDisplay, columnsFor, writtenPart } from "./display";
import type { AsciiArt } from "./render";

test("sizes the art at about seven pixels a column, within limits", () => {
  expect(columnsFor(700)).toBe(100);
  expect(columnsFor(320)).toBe(96);
  expect(columnsFor(1440)).toBe(200);
  expect(columnsFor(3000)).toBe(200);
});

test("shows a run's characters only above their columns' depths", () => {
  const run = { layer: "face" as const, text: "abcd", row: 2, column: 1 };
  expect(writtenPart(run, [0, 3, 2, 5, 3])).toBe("a cd");
  expect(writtenPart(run, [9, 0, 0, 0, 0])).toBe("    ");
});

describe("AsciiDisplay", () => {
  beforeAll(() => GlobalRegistrator.register());
  afterAll(() => GlobalRegistrator.unregister());

  const art: AsciiArt = {
    ratio: 0.5,
    lines: [[{ layer: "face", text: "a2f0" }]],
  };

  // A display whose render finishes when the test says so.
  const deferred = () => {
    const pre = document.createElement("pre");
    const rendered = mock(() => undefined);
    let finish: (value: AsciiArt) => void = () => undefined;
    const display = new AsciiDisplay(
      pre,
      () => 700,
      rendered,
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    return { display, pre, rendered, finish: () => finish(art) };
  };

  test("writes a render once it finishes", async () => {
    const { display, pre, rendered, finish } = deferred();
    const drawing = display.draw();
    finish();
    await drawing;
    expect(pre.textContent).toBe("a2f0\n");
    expect(pre.querySelector(".face")?.textContent).toBe("a2f0");
    expect(rendered).toHaveBeenCalledTimes(1);
    expect(display.ready).toBe(true);
  });

  test("drops a render abandoned while under way", async () => {
    const { display, pre, rendered, finish } = deferred();
    const drawing = display.draw();
    display.abandon();
    finish();
    await drawing;
    expect(pre.childNodes).toHaveLength(0);
    expect(rendered).not.toHaveBeenCalled();
    expect(display.ready).toBe(false);
    expect(display.requested).toBe(false);
  });
});
