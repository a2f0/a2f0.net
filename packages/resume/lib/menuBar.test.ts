import { expect, test } from "bun:test";
import {
  closedMenuBar,
  type MenuBarEvent,
  type MenuBarState,
  openMenu,
  transition,
} from "./menuBar";

const file: MenuBarState = { status: "open", menu: "File" };
const view: MenuBarState = { status: "open", menu: "View" };

test.each<[MenuBarState, MenuBarEvent, MenuBarState]>([
  [closedMenuBar, { type: "toggle", menu: "File" }, file],
  [file, { type: "toggle", menu: "File" }, closedMenuBar],
  [file, { type: "toggle", menu: "View" }, view],
  [file, { type: "hover", menu: "View" }, view],
  [file, { type: "dismiss", menu: "File" }, closedMenuBar],
])("%o + %o", (state, event, next) => {
  expect(transition(state, event)).toEqual(next);
});

test.each<[MenuBarState, MenuBarEvent]>([
  // Pointing at a menu opens it only while the bar is already open.
  [closedMenuBar, { type: "hover", menu: "File" }],
  [file, { type: "hover", menu: "File" }],
  // Only the open menu can be dismissed.
  [closedMenuBar, { type: "dismiss", menu: "File" }],
  [view, { type: "dismiss", menu: "File" }],
])("ignores %o + %o", (state, event) => {
  expect(transition(state, event)).toBe(state);
});

test("pressing another menu's button keeps it open when the old menu sees the click outside it", () => {
  const events: MenuBarEvent[] = [
    { type: "toggle", menu: "File" },
    { type: "toggle", menu: "View" },
    { type: "dismiss", menu: "File" },
  ];
  expect(events.reduce(transition, closedMenuBar)).toEqual(view);
});

test("names the open menu", () => {
  expect(openMenu(closedMenuBar)).toBeNull();
  expect(openMenu(file)).toBe("File");
});
