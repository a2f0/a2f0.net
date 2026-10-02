import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  type Mock,
  spyOn,
  test,
} from "bun:test";

import { TerminalWindow } from "./terminal";

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

// Every animation runs until it is cancelled, like a zoom caught midway.
let held: Mock<typeof Element.prototype.animate>;
beforeEach(() => {
  held = spyOn(Element.prototype, "animate").mockImplementation(() => {
    let fail: (reason: unknown) => void = () => undefined;
    const finished = new Promise<Animation>((_, reject) => {
      fail = reject;
    });
    finished.catch(() => undefined);
    const cancel = () => fail(new DOMException("Cancelled", "AbortError"));
    return { cancel, finished } as unknown as Animation;
  });
});
afterEach(() => held.mockRestore());

const setup = () => {
  document.body.innerHTML =
    '<div class="canvas"><div class="window"></div><button></button></div>';
  const find = (selector: string) => {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    return element;
  };
  const canvas = find(".canvas");
  const terminal = new TerminalWindow(
    canvas,
    find(".window"),
    window.matchMedia("(prefers-reduced-motion: reduce)"),
  );
  return { canvas, square: find("button"), terminal };
};

test("closes a window cancelled while it closes", async () => {
  const { canvas, square, terminal } = setup();
  canvas.dataset.window = "";
  const closing = terminal.close(square);
  terminal.cancel();
  expect(await closing).toBe(false);
  expect(canvas.dataset.window).toBeUndefined();
  expect(canvas.querySelector(".zoom-line")).toBeNull();
});

test("keeps a window open when cancelled while it opens", async () => {
  const { canvas, square, terminal } = setup();
  const opening = terminal.open(square);
  terminal.cancel();
  expect(await opening).toBe(false);
  expect(canvas.dataset.window).toBe("");
  expect(canvas.querySelector(".zoom-line")).toBeNull();
});
