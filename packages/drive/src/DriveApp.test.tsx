import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { ThemeProvider } from "@tearleads/windowing";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";

let calls = 0;
let finishBoot: (value: { close(): Promise<void> } | null) => void;
let failBoot: (cause: Error) => void;
mock.module("./host", () => ({
  openDrive() {
    calls += 1;
    return new Promise((resolve, reject) => {
      finishBoot = resolve;
      failBoot = reject;
    });
  },
}));
const { default: DriveApp } = await import("./DriveApp");
const { DEFAULT_DRIVE_THEME, DRIVE_THEMES, THEME_STORAGE_KEY } = await import(
  "./themes"
);

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterAll(() => GlobalRegistrator.unregister());

test("Strict Mode starts one identity host and shows onboarding after a clean boot", async () => {
  calls = 0;
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => {
    root.render(
      <StrictMode>
        <DriveApp />
      </StrictMode>,
    );
  });
  expect(calls).toBe(1);
  await act(async () => {
    finishBoot(null);
  });
  expect(element.textContent).toContain("Create a drive");
  // An embedding host may mount no theme provider; the switch then hides.
  expect(element.querySelector(".drive-theme-switch")).toBeNull();
  await act(async () => root.unmount());
});

test("offers the theme switch under a theme provider", async () => {
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => {
    root.render(
      <ThemeProvider
        defaultTheme={DEFAULT_DRIVE_THEME}
        storageKey={THEME_STORAGE_KEY}
        themes={DRIVE_THEMES}
      >
        <DriveApp />
      </ThemeProvider>,
    );
  });
  await act(async () => {
    finishBoot(null);
  });
  expect(
    element.querySelector(".drive-theme-switch")?.getAttribute("aria-label"),
  ).toBe("Switch to Paper theme");
  await act(async () => root.unmount());
});

test("closing the app during SQLite startup closes the late host without rendering it", async () => {
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => {
    root.render(<DriveApp />);
  });
  await act(async () => root.unmount());
  let closes = 0;
  await act(async () => {
    finishBoot({
      async close() {
        closes += 1;
      },
    });
  });
  expect(closes).toBe(1);
  expect(element.textContent).toBe("");
});

const button = (element: HTMLElement, name: string) => {
  const found = [...element.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes(name),
  );
  if (!found) throw new Error(`No ${name} button`);
  return found;
};

test("retrying a failed boot starts a new boot that can finish", async () => {
  calls = 0;
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => root.render(<DriveApp />));
  await act(async () => failBoot(new Error("locked")));
  expect(element.textContent).toContain("Let’s try again.");
  expect(element.textContent).toContain("locked");
  await act(async () => button(element, "Retry opening Drive").click());
  expect(calls).toBe(2);
  expect(element.textContent).not.toContain("locked");
  expect(button(element, "Creating…").disabled).toBe(true);
  await act(async () => finishBoot(null));
  expect(button(element, "Create a drive").disabled).toBe(false);
  await act(async () => root.unmount());
});

test("a failed start returns to onboarding with its error", async () => {
  calls = 0;
  const element = document.createElement("div");
  const root = createRoot(element);
  await act(async () => root.render(<DriveApp />));
  await act(async () => finishBoot(null));
  await act(async () => button(element, "Create a drive").click());
  expect(calls).toBe(2);
  expect(button(element, "Creating…").disabled).toBe(true);
  await act(async () => failBoot(new Error("no storage")));
  expect(element.textContent).toContain("no storage");
  expect(button(element, "Create a drive").disabled).toBe(false);
  await act(async () => root.unmount());
});
