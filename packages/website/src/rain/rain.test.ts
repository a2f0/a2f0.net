import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";

import { AsciiDisplay } from "../ascii/display";
import { Rain } from "./rain";

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

// happy-dom has no 2D canvas; this one accepts every call and draws nothing.
const blankContext = () =>
  new Proxy({} as Record<string | symbol, unknown>, {
    get: (target, key) => (key in target ? target[key] : () => ({ width: 0 })),
    set: (target, key, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

test("leaves the art whole the moment it is stopped", async () => {
  const context = spyOn(
    HTMLCanvasElement.prototype,
    "getContext",
  ).mockReturnValue(blankContext() as never);
  try {
    const stage = document.createElement("div");
    const pre = document.createElement("pre");
    stage.append(pre);
    document.body.replaceChildren(stage);
    const row = [{ layer: "face" as const, text: "a2f0a2f0" }];
    const display = new AsciiDisplay(
      pre,
      () => 700,
      () => undefined,
      async () => ({ ratio: 0.5, lines: Array.from({ length: 5 }, () => row) }),
    );
    await display.draw();
    const finished = pre.textContent;

    const rain = new Rain(stage, pre, display);
    const raining = rain.play();
    expect(rain.playing).toBe(true);
    expect(stage.querySelector(".rain")).not.toBeNull();

    rain.stop();
    expect(rain.playing).toBe(false);
    expect(stage.dataset.raining).toBeUndefined();
    expect(stage.querySelector(".rain")).toBeNull();
    expect(pre.textContent).toBe(finished);
    await raining;
  } finally {
    context.mockRestore();
  }
});
