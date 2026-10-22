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
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import {
  useWindowActions,
  useWindowStateData,
  WindowStateProvider,
} from "@tearleads/windowing";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { MiniAppWindow } from "./MiniAppWindow";

const ignore = () => undefined;

let resumeFails = true;

function FlakyResume() {
  if (resumeFails) throw new Error("The resume failed to render");
  return <p>resume content</p>;
}

function Counter() {
  const [clicks, setClicks] = useState(0);
  return (
    <button type="button" onClick={() => setClicks((count) => count + 1)}>
      clicked {clicks}
    </button>
  );
}

function Desktop() {
  const { windows } = useWindowStateData();
  const { create } = useWindowActions();
  return (
    <>
      <button
        type="button"
        onClick={() => create("Resume", 0, 0, FlakyResume, { appId: "resume" })}
      >
        Open resume
      </button>
      <button
        type="button"
        onClick={() =>
          create("a2f0.net", 0, 0, Counter, { appId: "ascii-art" })
        }
      >
        Open artwork
      </button>
      {windows.map((entry) => (
        <MiniAppWindow key={entry.id} windowId={entry.id} />
      ))}
    </>
  );
}

let root: Root;
let container: HTMLElement;
let consoleError: Mock<typeof console.error>;

const button = (name: string, scope: ParentNode = document) => {
  const match = [...scope.querySelectorAll("button")].find(
    (candidate) =>
      candidate.textContent?.trim() === name ||
      candidate.getAttribute("aria-label") === name,
  );
  if (!match) throw new Error(`No button named ${name}`);
  return match;
};

const click = (target: HTMLElement) => act(() => target.click());

const windowTitled = (title: string) =>
  [...document.querySelectorAll<HTMLElement>("section.window")].find(
    (section) =>
      section.querySelector(".window-titlebar-title")?.textContent === title,
  );

beforeAll(() => {
  GlobalRegistrator.register();
  // happy-dom has no ResizeObserver; the window layer observes its surface.
  globalThis.ResizeObserver ??= class {
    disconnect = ignore;
    observe = ignore;
    unobserve = ignore;
  };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterAll(() => GlobalRegistrator.unregister());

beforeEach(async () => {
  resumeFails = true;
  // React reports the error the boundary catches.
  consoleError = spyOn(console, "error").mockImplementation(ignore);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(() =>
    root.render(
      <WindowStateProvider>
        <Desktop />
      </WindowStateProvider>,
    ),
  );
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  consoleError.mockRestore();
});

test("a mini-app that throws fails inside its own window", async () => {
  await click(button("Open resume"));
  await click(button("Open artwork"));

  const resume = windowTitled("Resume");
  expect(resume?.querySelector("[role='alert']")?.textContent).toBe(
    "Resume stopped working. Close the window and open it again from the taskbar.",
  );

  // The other mini-app keeps working.
  const artwork = windowTitled("a2f0.net");
  if (!artwork) throw new Error("The artwork window did not open");
  await click(button("clicked 0", artwork));
  expect(button("clicked 1", artwork)).toBeTruthy();
});

test("reopening a failed mini-app gives it a fresh boundary", async () => {
  await click(button("Open resume"));
  const failed = windowTitled("Resume");
  if (!failed) throw new Error("The resume window did not open");

  await click(button("Close window", failed));
  expect(windowTitled("Resume")).toBeUndefined();

  resumeFails = false;
  await click(button("Open resume"));

  const reopened = windowTitled("Resume");
  expect(reopened?.querySelector("[role='alert']")).toBeNull();
  expect(reopened?.textContent).toContain("resume content");
});
