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

import { Etcher, type Prepared } from "./etcher";

beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());

// happy-dom has no 2D canvas, and its SVG geometry measures nothing. This
// context answers every property and call with itself, and the geometry gives
// each shape a length, so an etching can run.
const blank: unknown = new Proxy(() => undefined, {
  get: (_, key) => {
    if (key === Symbol.toPrimitive) return () => 0;
    return key === "width" || key === "height" ? 0 : blank;
  },
  apply: () => blank,
  set: () => true,
});

let stubs: Mock<(...args: never[]) => unknown>[] = [];
beforeEach(() => {
  const geometry = Object.getPrototypeOf(
    Object.getPrototypeOf(
      document.createElementNS("http://www.w3.org/2000/svg", "path"),
    ),
  );
  stubs = [
    spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      blank as never,
    ),
    spyOn(geometry, "getTotalLength").mockReturnValue(100),
    spyOn(geometry, "getPointAtLength").mockImplementation(
      () => new DOMPoint(0, 0),
    ),
  ] as Mock<(...args: never[]) => unknown>[];
});
afterEach(() => {
  for (const stub of stubs) stub.mockRestore();
});

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

const setup = () => {
  const stage = document.createElement("div");
  const art = document.createElement("img");
  stage.append(art);
  document.body.replaceChildren(stage);
  const artwork: Prepared = {
    svg: new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<path d="M0 0 L100 0 L100 100" stroke="#fff" fill="none"/></svg>',
      "image/svg+xml",
    ),
    onLetters: () => false,
  };
  const etcher = new Etcher(stage, art, () => Promise.resolve(artwork));
  return { art, etcher, stage };
};

test("restores the artwork the moment it is stopped", async () => {
  const { art, etcher, stage } = setup();
  const playing = etcher.play();
  await tick();
  expect(stage.dataset.etching).toBe("");
  expect(art.style.visibility).toBe("hidden");

  etcher.stop();
  expect(etcher.playing).toBe(false);
  expect(stage.dataset.etching).toBeUndefined();
  expect(stage.children).toHaveLength(1);
  expect(art.style.visibility).toBe("");
  await playing;
});

test("stays stopped when stopped as it starts with the artwork loaded", async () => {
  const { art, etcher, stage } = setup();
  // The first play loads the artwork; stopping wins while it loads.
  const loading = etcher.play();
  etcher.stop();
  await loading;
  // The second finds it loaded already, and must still honour the stop.
  const playing = etcher.play();
  etcher.stop();
  await playing;

  expect(etcher.playing).toBe(false);
  expect(stage.dataset.etching).toBeUndefined();
  expect(stage.children).toHaveLength(1);
  expect(art.style.visibility).toBe("");
});

test("can stop an etching started again before the last one settles", async () => {
  const { etcher, stage } = setup();
  const first = etcher.play();
  await tick();
  etcher.stop();
  const second = etcher.play();
  // The first etching settles now; the second must stay stoppable.
  await Promise.resolve();
  expect(etcher.playing).toBe(true);
  await tick();
  expect(stage.dataset.etching).toBe("");
  etcher.stop();
  expect(etcher.playing).toBe(false);
  expect(stage.dataset.etching).toBeUndefined();
  await Promise.all([first, second]);
});
