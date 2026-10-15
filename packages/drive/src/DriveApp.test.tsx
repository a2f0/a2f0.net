import { afterAll, beforeAll, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";

let calls = 0;
let finishBoot: (value: { close(): Promise<void> } | null) => void;
mock.module("./host", () => ({
  openDrive() {
    calls += 1;
    return new Promise((resolve) => {
      finishBoot = resolve;
    });
  },
}));
const { default: DriveApp } = await import("./DriveApp");

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
