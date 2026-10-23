import { afterEach, beforeEach, expect, test, vi } from "vitest";

let startClickTracking: typeof import("../../lib/clickTracking").startClickTracking;

const originalWindow = window;
let currentOrigin = "https://resume.a2f0.net";
const send = vi.fn<typeof fetch>();
const clickListeners = new Set<EventListener>();

const originalEnvironment = process.env.NODE_ENV;
let stop: (() => void) | undefined;

beforeEach(async () => {
  Object.assign(process.env, { NODE_ENV: "production" });
  vi.stubGlobal(
    "window",
    new Proxy(originalWindow, {
      get(target, key) {
        return key === "location"
          ? new URL(currentOrigin)
          : Reflect.get(target, key, target);
      },
    }),
  );
  currentOrigin = "https://resume.a2f0.net/private?secret=value#private";
  send.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", send);
  const addListener = document.addEventListener.bind(document);
  const removeListener = document.removeEventListener.bind(document);
  vi.spyOn(document, "addEventListener").mockImplementation(
    (type, listener, options) => {
      if (type === "click" && typeof listener === "function")
        clickListeners.add(listener);
      addListener(type, listener, options);
    },
  );
  vi.spyOn(document, "removeEventListener").mockImplementation(
    (type, listener, options) => {
      if (type === "click" && typeof listener === "function")
        clickListeners.delete(listener);
      removeListener(type, listener, options);
    },
  );
  document.body.innerHTML =
    '<a href="/private-file?token=secret">Private file</a><button>Private title</button><input value="recovery words"><textarea>Secret note</textarea><select><option>Private folder</option></select><div contenteditable="true">Secret note</div><div data-ct-ignore><button>Hidden action</button></div>';
  document.documentElement.removeAttribute("data-ct-disabled");
  localStorage.clear();
  for (const [name, value] of [
    ["webdriver", false],
    ["doNotTrack", "0"],
    ["globalPrivacyControl", true],
  ] as const) {
    Object.defineProperty(navigator, name, { configurable: true, value });
  }
  vi.resetModules();
  ({ startClickTracking } = await import("../../lib/clickTracking"));
});

afterEach(() => {
  stop?.();
  stop = undefined;
  clickListeners.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  send.mockReset();
  if (originalEnvironment === undefined)
    Reflect.deleteProperty(process.env, "NODE_ENV");
  else Object.assign(process.env, { NODE_ENV: originalEnvironment });
});

function click(selector: string) {
  const target = document.querySelector(selector);
  if (!target) throw new Error(`Missing test control: ${selector}`);
  const path: EventTarget[] = [];
  for (
    let element: Element | null = target;
    element;
    element = element.parentElement
  )
    path.push(element);
  // jsdom cannot create trusted events. Exercise the real installed listener.
  const event = new Proxy(new MouseEvent("click"), {
    get(original, property) {
      if (property === "isTrusted") return true;
      if (property === "composedPath") return () => path;
      return Reflect.get(original, property, original);
    },
  });
  for (const listener of clickListeners) listener(event);
}

async function flush() {
  window.dispatchEvent(new Event("pagehide"));
  await Promise.resolve();
}

function batch() {
  expect(send).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[0]?.[0]).toBe("https://ct.a2f0.net/v1/clicks");
  expect(send.mock.calls[0]?.[1]?.credentials).toBe("omit");
  return JSON.parse(String(send.mock.calls[0]?.[1]?.body));
}

test("imports stay inert until explicit standalone initialization", async () => {
  expect(clickListeners.size).toBe(0);
  click("button");
  await flush();
  expect(send).not.toHaveBeenCalled();
  stop = startClickTracking();
  click("button");
  await flush();
  expect(batch().events).toHaveLength(1);
});

test("only a production build on the exact standalone HTTPS origin starts", async () => {
  for (const environment of ["test", "development"]) {
    Object.assign(process.env, { NODE_ENV: environment });
    expect(startClickTracking()).toBeUndefined();
  }
  Object.assign(process.env, { NODE_ENV: "production" });
  for (const origin of [
    "http://localhost:4000",
    "https://a2f0.net",
    "https://staging.a2f0.net",
    "http://resume.a2f0.net",
    "https://resume.a2f0.net:444",
    "https://resume.a2f0.net.example.com",
  ]) {
    currentOrigin = origin;
    expect(startClickTracking()).toBeUndefined();
  }
  click("button");
  await flush();
  expect(send).not.toHaveBeenCalled();
});

test("GPC override captures real controls with fixed dimensions and no private content", async () => {
  stop = startClickTracking();
  click("a");
  click("button");
  await flush();
  const sent = batch();
  expect(sent).toMatchObject({ site: "a2f0-net", environment: "production" });
  expect(sent.events).toHaveLength(2);
  for (const [index, target] of ["a", "button"].entries()) {
    expect(sent.events[index]).toMatchObject({
      app: "resume",
      page: "/",
      target,
      label: null,
    });
    expect(Object.keys(sent.events[index]).sort()).toEqual([
      "app",
      "id",
      "label",
      "page",
      "target",
      "timestamp",
    ]);
  }
  expect(JSON.stringify(sent)).not.toMatch(
    /private|secret|recovery|token|file/i,
  );
});

test.each(["webdriver", "doNotTrack", "extension", "local"])(
  "%s still prevents collection",
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
    click("button");
    await flush();
    expect(send).not.toHaveBeenCalled();
  },
);

test("editable fields, ignored descendants, and synthetic clicks are excluded", async () => {
  stop = startClickTracking();
  for (const selector of [
    "input",
    "textarea",
    "select",
    "[contenteditable]",
    "[data-ct-ignore] button",
  ])
    click(selector);
  document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flush();
  expect(send).not.toHaveBeenCalled();
  click("button");
  await flush();
  expect(batch().events).toHaveLength(1);
});

test("cleanup drops pending clicks and remounting installs one listener", async () => {
  stop = startClickTracking();
  click("button");
  stop?.();
  stop = startClickTracking();
  click("button");
  await flush();
  expect(batch().events).toHaveLength(1);
  stop?.();
  click("button");
  await flush();
  expect(send).toHaveBeenCalledTimes(1);
});
