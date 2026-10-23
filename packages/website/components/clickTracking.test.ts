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

import { startClickTracking, trackingPage } from "./clickTracking";

const originalEnvironment = process.env.NODE_ENV;
let stop: (() => void) | undefined;
let send: Mock<typeof fetch>;

beforeAll(() => GlobalRegistrator.register({ url: "https://a2f0.net/" }));
afterAll(() => GlobalRegistrator.unregister());

beforeEach(() => {
  Object.assign(process.env, { NODE_ENV: "production" });
  window.location.href = "https://a2f0.net/";
  document.body.replaceChildren();
  document.documentElement.removeAttribute("data-ct-disabled");
  localStorage.clear();
  for (const [name, value] of [
    ["webdriver", false],
    ["doNotTrack", "0"],
    ["globalPrivacyControl", true],
  ] as const) {
    Object.defineProperty(navigator, name, { configurable: true, value });
  }
  send = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(null, { status: 202 }),
  );
});

afterEach(() => {
  stop?.();
  stop = undefined;
  send.mockRestore();
  if (originalEnvironment === undefined)
    Reflect.deleteProperty(process.env, "NODE_ENV");
  else Object.assign(process.env, { NODE_ENV: originalEnvironment });
});

// Happy DOM supplies a real composed path. Only this isolated test event is
// marked trusted; the production SDK still rejects synthetic browser clicks.
function click(target: Element) {
  const event = new MouseEvent("click", { bubbles: true, composed: true });
  Object.defineProperty(event, "isTrusted", { value: true });
  target.dispatchEvent(event);
}

async function flush() {
  window.dispatchEvent(new Event("pagehide"));
  await Promise.resolve();
}

function batch() {
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0]?.[0]).toBe("https://ct.a2f0.net/v1/clicks");
  const request = send.mock.calls[0]?.[1];
  expect(request?.credentials).toBe("omit");
  return JSON.parse(String(request?.body));
}

test("only the production build on the exact apex origin starts tracking", async () => {
  for (const environment of ["test", "development"]) {
    Object.assign(process.env, { NODE_ENV: environment });
    expect(startClickTracking()).toBeUndefined();
  }
  Object.assign(process.env, { NODE_ENV: "production" });
  for (const origin of [
    "http://localhost:4003",
    "http://a2f0.net",
    "https://staging.a2f0.net",
    "https://resume.a2f0.net",
    "https://a2f0.net:444",
    "https://a2f0.net.example.com",
  ]) {
    window.location.href = origin;
    expect(startClickTracking()).toBeUndefined();
  }
  click(document.body);
  await flush();
  expect(send).not.toHaveBeenCalled();
});

test("production overrides GPC and sends fixed site, environment, and safe routes", async () => {
  window.location.href = "https://a2f0.net/app/skyline?secret=value#private";
  stop = startClickTracking();
  click(document.body);
  await flush();
  expect(batch()).toMatchObject({
    site: "a2f0-net",
    environment: "production",
    events: [{ app: "website", page: "/app/skyline", target: "body" }],
  });
  expect(String(send.mock.calls[0]?.[1]?.body)).not.toContain("secret");
});

test("shadow controls and unlabelled canvases inherit their nearest app boundary", async () => {
  const frame = document.createElement("div");
  frame.dataset.ctApp = "skyline";
  const host = document.createElement("div");
  frame.append(host);
  document.body.append(frame);
  const shadow = host.attachShadow({ mode: "open" });
  const control = document.createElement("button");
  control.dataset.ct = "skyline.wireframe";
  const canvas = document.createElement("canvas");
  shadow.append(control, canvas);

  stop = startClickTracking();
  click(control);
  click(canvas);
  click(document.body);
  await flush();
  expect(batch().events).toMatchObject([
    { app: "skyline", label: "skyline.wireframe", target: "button" },
    { app: "skyline", label: null, target: "canvas" },
    { app: "website", label: null, target: "body" },
  ]);
});

test.each(["webdriver", "doNotTrack", "extension", "local"])(
  "%s opt-out still blocks tracking with the GPC override",
  async (signal) => {
    if (signal === "webdriver" || signal === "doNotTrack") {
      Object.defineProperty(navigator, signal, {
        configurable: true,
        value: signal === "webdriver" ? true : "1",
      });
    } else if (signal === "extension") {
      document.documentElement.setAttribute("data-ct-disabled", "");
    } else {
      localStorage.setItem("ct:opt-out", "1");
    }
    stop = startClickTracking();
    click(document.body);
    await flush();
    expect(send).not.toHaveBeenCalled();
  },
);

test("form fields, explicit exclusions, and synthetic clicks stay excluded", async () => {
  const input = document.createElement("input");
  input.value = "private";
  const ignored = document.createElement("button");
  ignored.dataset.ctIgnore = "";
  document.body.append(input, ignored);
  stop = startClickTracking();
  click(input);
  click(ignored);
  document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flush();
  expect(send).not.toHaveBeenCalled();
});

test("a remount destroys old listeners and cleanup drops pending clicks", async () => {
  stop = startClickTracking();
  click(document.body);
  stop?.();
  stop = startClickTracking();
  click(document.body);
  await flush();
  expect(batch().events).toHaveLength(1);
  stop?.();
  click(document.body);
  await flush();
  expect(send).toHaveBeenCalledTimes(1);
});

test("the page dimension allowlists static mini-app paths", () => {
  for (const app of ["resume", "ascii-art", "skyline", "dnbm", "dnbm-player"]) {
    expect(trackingPage(`/app/${app}`)).toBe(`/app/${app}`);
    expect(trackingPage(`/app/${app}/`)).toBe(`/app/${app}`);
  }
  for (const path of ["/", "/private", "/app/unknown", "/app/dnbm/my-song"]) {
    expect(trackingPage(path)).toBe("/");
  }
});
