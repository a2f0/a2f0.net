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

type StartClickTracking = () => (() => void) | undefined;

/** A standalone app and the tracking entrypoint its browser bundle calls. */
export interface StandaloneApp {
  /** The CT app dimension, also the subdomain of a2f0.net it serves. */
  app: string;
  /**
   * Imports the tracking module, as `() => import("./clickTracking")`. The
   * suite imports it once the first test has set up a production build's
   * page that allows tracking, so tracking the import itself started fails
   * the inert-import test, which runs first.
   */
  load: () => Promise<{ startClickTracking: StartClickTracking }>;
}

/**
 * Registers the privacy suite every standalone app's click tracking must pass:
 * inert imports, the exact production origin, fixed dimensions without
 * private content, honoured opt-outs, excluded fields, and clean remounts.
 */
export const testStandaloneClickTracking = ({ app, load }: StandaloneApp) => {
  const host = `${app}.a2f0.net`;
  const originalEnvironment = process.env.NODE_ENV;
  let startClickTracking: StartClickTracking | undefined;
  const start = () => {
    if (!startClickTracking)
      throw new Error("The tracking module is not loaded");
    return startClickTracking();
  };

  beforeAll(() => GlobalRegistrator.register({ url: `https://${host}/` }));
  afterAll(() => GlobalRegistrator.unregister());
  let send: Mock<typeof fetch>;

  let stop: (() => void) | undefined;

  beforeEach(async () => {
    Object.assign(process.env, { NODE_ENV: "production" });
    window.location.href = `https://${host}/private?secret=value#private`;
    send = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    document.body.innerHTML =
      '<a href="/private-file?token=secret" aria-label="Download private file" title="private file title" id="private-file-id" name="private-file-name">Private file</a><button aria-label="Rename private folder" title="private folder title" id="private-folder-id" name="private-folder-name">Private title</button><input value="recovery words"><textarea>Secret note</textarea><select><option>Private folder</option></select><div contenteditable="true">Secret note</div><div data-ct-ignore><button>Hidden action</button></div>';
    document.documentElement.removeAttribute("data-ct-disabled");
    localStorage.clear();
    for (const [name, value] of [
      ["webdriver", false],
      ["doNotTrack", "0"],
      ["globalPrivacyControl", true],
    ] as const) {
      Object.defineProperty(navigator, name, { configurable: true, value });
    }
    startClickTracking ??= (await load()).startClickTracking;
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    send.mockRestore();
    if (originalEnvironment === undefined)
      Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: originalEnvironment });
  });

  function click(selector: string) {
    const target = document.querySelector(selector);
    if (!target) throw new Error(`Missing test control: ${selector}`);
    // Test DOMs supply a composed path; only this isolated event is trusted.
    const event = new MouseEvent("click", {
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    Object.defineProperty(event, "isTrusted", { value: true });
    event.preventDefault();
    target.dispatchEvent(event);
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
    click("button");
    await flush();
    expect(send).not.toHaveBeenCalled();
    stop = start();
    click("button");
    await flush();
    expect(batch().events).toHaveLength(1);
  });

  test("only a production build on the exact standalone HTTPS origin starts", async () => {
    for (const environment of ["test", "development"]) {
      Object.assign(process.env, { NODE_ENV: environment });
      expect(start()).toBeUndefined();
    }
    Object.assign(process.env, { NODE_ENV: "production" });
    for (const origin of [
      "http://localhost:4000",
      "https://a2f0.net",
      "https://staging.a2f0.net",
      `http://${host}`,
      `https://${host}:444`,
      `https://${host}.example.com`,
    ]) {
      window.location.href = origin;
      expect(start()).toBeUndefined();
    }
    click("button");
    await flush();
    expect(send).not.toHaveBeenCalled();
  });

  test("GPC override captures real controls with fixed dimensions and no private content", async () => {
    stop = start();
    click("a");
    click("button");
    await flush();
    const sent = batch();
    expect(sent).toMatchObject({ site: "a2f0-net", environment: "production" });
    expect(sent.events).toHaveLength(2);
    for (const [index, target] of ["a", "button"].entries()) {
      expect(sent.events[index]).toMatchObject({
        app,
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
      stop = start();
      click("button");
      await flush();
      expect(send).not.toHaveBeenCalled();
    },
  );

  test("editable fields, ignored descendants, and synthetic clicks are excluded", async () => {
    stop = start();
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
    stop = start();
    click("button");
    stop?.();
    stop = start();
    click("button");
    await flush();
    expect(batch().events).toHaveLength(1);
    stop?.();
    click("button");
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
  });
};
