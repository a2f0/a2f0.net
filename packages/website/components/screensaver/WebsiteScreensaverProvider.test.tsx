import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { type ScreensaverControls, useScreensaver } from "@tearleads/windowing";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  SCREENSAVER_STORAGE_KEY,
  type ScreensaverPreference,
  useScreensaverPreference,
  WebsiteScreensaverProvider,
} from "./WebsiteScreensaverProvider";

let root: Root | undefined;
let container: HTMLDivElement;
let preference: ScreensaverPreference;
let controls: ScreensaverControls;

function Probe() {
  preference = useScreensaverPreference();
  controls = useScreensaver();
  return <span>{preference.choice}</span>;
}

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterAll(() => GlobalRegistrator.unregister());

beforeEach(() => {
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  // Selection tests exercise the real provider without starting canvas work.
  spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container.remove();
  mock.restore();
  localStorage.clear();
});

async function mount() {
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <WebsiteScreensaverProvider>
        <Probe />
      </WebsiteScreensaverProvider>,
    );
  });
}

test.each([null, "removed-screensaver", "", "lasers"])(
  "defaults to Lasers for saved preference %s without writing a choice",
  async (saved) => {
    if (saved !== null) localStorage.setItem(SCREENSAVER_STORAGE_KEY, saved);
    await mount();
    expect(preference.choice).toBe("lasers");
    expect(localStorage.getItem(SCREENSAVER_STORAGE_KEY)).toBe(saved);
  },
);

test("persists Galaxy and restores it when the desktop remounts", async () => {
  await mount();
  await act(async () => preference.setChoice("galaxy"));
  expect(localStorage.getItem(SCREENSAVER_STORAGE_KEY)).toBe("galaxy");
  await act(async () => root?.unmount());
  await mount();
  expect(preference.choice).toBe("galaxy");
  await act(async () => preference.setChoice("lasers"));
  expect(localStorage.getItem(SCREENSAVER_STORAGE_KEY)).toBe("lasers");
});

test("reset forgets even an explicitly saved default", async () => {
  localStorage.setItem(SCREENSAVER_STORAGE_KEY, "galaxy");
  await mount();
  await act(async () => preference.resetChoice());
  expect(preference.choice).toBe("lasers");
  expect(localStorage.getItem(SCREENSAVER_STORAGE_KEY)).toBeNull();
  await act(async () => preference.setChoice("lasers"));
  await act(async () => preference.resetChoice());
  expect(localStorage.getItem(SCREENSAVER_STORAGE_KEY)).toBeNull();
});

test("blocked storage does not prevent choosing or resetting a screensaver", async () => {
  const unavailable = () => {
    throw new DOMException("Storage blocked", "SecurityError");
  };
  spyOn(Storage.prototype, "getItem").mockImplementation(unavailable);
  spyOn(Storage.prototype, "setItem").mockImplementation(unavailable);
  spyOn(Storage.prototype, "removeItem").mockImplementation(unavailable);
  await mount();
  expect(preference.choice).toBe("lasers");
  await act(async () => preference.setChoice("galaxy"));
  expect(preference.choice).toBe("galaxy");
  await act(async () => preference.resetChoice());
  expect(preference.choice).toBe("lasers");
});

test("both choices mount only on start and leave through the shared provider", async () => {
  await mount();
  for (const choice of ["lasers", "galaxy"] as const) {
    await act(async () => preference.setChoice(choice));
    expect(document.querySelector("canvas")).toBeNull();
    await act(async () => controls.start());
    const selector =
      choice === "lasers" ? ".laser-screensaver" : ".galaxy-screensaver";
    expect(document.querySelector(selector)).not.toBeNull();
    await act(async () => controls.stop());
    expect(document.querySelector("canvas")).toBeNull();
  }
});
