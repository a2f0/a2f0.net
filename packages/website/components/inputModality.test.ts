import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

import { trackInputModality } from "./inputModality";

let stop: () => void;

const input = () => document.documentElement.dataset.input;

const press = (key: string, modifiers: KeyboardEventInit = {}) =>
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, key, ...modifiers }),
  );

const pointerDown = () =>
  document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));

beforeAll(() => GlobalRegistrator.register());

afterAll(() => GlobalRegistrator.unregister());

beforeEach(() => {
  stop = trackInputModality(document);
});

afterEach(() => stop());

test("a key marks keyboard input and a press marks pointer input", () => {
  expect(input()).toBeUndefined();
  press("Enter");
  expect(input()).toBe("keyboard");
  pointerDown();
  expect(input()).toBe("pointer");
});

test("a modifier alone leaves pointer input in place", () => {
  pointerDown();
  for (const key of ["Shift", "Control", "Alt", "Meta", "CapsLock"]) {
    press(key, { shiftKey: key === "Shift" });
    expect(input()).toBe("pointer");
  }
});

test("shortcuts do not count as keyboard input, but Shift+Tab does", () => {
  pointerDown();
  press("c", { metaKey: true });
  press("c", { ctrlKey: true });
  press("ArrowLeft", { altKey: true });
  expect(input()).toBe("pointer");
  press("Tab", { shiftKey: true });
  expect(input()).toBe("keyboard");
});

test("stopping removes the record and the listeners", () => {
  press("Enter");
  stop();
  expect(input()).toBeUndefined();
  press("Enter");
  expect(input()).toBeUndefined();
  stop = trackInputModality(document);
});
