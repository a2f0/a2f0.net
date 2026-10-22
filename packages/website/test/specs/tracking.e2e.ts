import { $, $$, browser, expect } from "@wdio/globals";

const apps = ["resume", "ascii-art", "skyline", "dnbm", "dnbm-player"];

describe("click tracking boundaries", () => {
  it("attributes desktop content and chrome without changing the geometry surface", async () => {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.url("/");
    await browser.execute(() => localStorage.clear());
    await browser.refresh();
    await browser.waitUntil(
      async () => (await $$("section.window")).length === 5,
    );

    const result = await browser.execute(() => {
      const surface = document.querySelector(".desktop-surface");
      if (!surface) throw new Error("Missing desktop");
      return [...document.querySelectorAll<HTMLElement>("section.window")].map(
        (frame) => ({
          app: frame.closest("[data-ct-app]")?.getAttribute("data-ct-app"),
          chromeApp: frame
            .querySelector("button")
            ?.closest("[data-ct-app]")
            ?.getAttribute("data-ct-app"),
          width: frame.parentElement?.clientWidth,
          height: frame.parentElement?.clientHeight,
          surfaceWidth: surface.clientWidth,
          surfaceHeight: surface.clientHeight,
          acceptsClicks: getComputedStyle(frame).pointerEvents,
        }),
      );
    });
    expect(result.map((frame) => frame.app).sort()).toEqual([...apps].sort());
    for (const frame of result) {
      expect(frame.chromeApp).toBe(frame.app);
      expect(frame.width).toBe(frame.surfaceWidth);
      expect(frame.height).toBe(frame.surfaceHeight);
      expect(frame.acceptsClicks).toBe("auto");
    }
    expect(
      await browser.execute(() =>
        document.querySelector(".desktop-taskbar")?.closest("[data-ct-app]"),
      ),
    ).toBeNull();

    // The copied published Skyline asset supplies the descriptive click label.
    await browser.waitUntil(
      () =>
        browser.execute(
          () =>
            document
              .querySelector(".skyline-window [role=region]")
              ?.shadowRoot?.querySelector("#wireframe")
              ?.getAttribute("data-ct") === "skyline.wireframe",
        ),
      { timeout: 30000 },
    );
  });

  it("attributes each routed app while shared chrome keeps the website fallback", async () => {
    await browser.setViewport({ width: 700, height: 900 });
    for (const app of apps) {
      await browser.url(`/app/${app}`);
      const content = $(`.routed-pane-main .${app}-window`);
      await expect(content).toBeExisting();
      expect(
        await browser.execute((id) => {
          const content = document.querySelector(`.${id}-window`);
          return {
            app: content?.closest("[data-ct-app]")?.getAttribute("data-ct-app"),
            parentIsPane:
              content?.parentElement?.classList.contains("routed-pane-main"),
            sharedChromeHasApp: Boolean(
              document
                .querySelector(".routed-pane-appbar")
                ?.closest("[data-ct-app]"),
            ),
          };
        }, app),
      ).toEqual({ app, parentIsPane: true, sharedChromeHasApp: false });
    }
  });

  it("keeps the local production preview inactive even without the WebDriver signal", async () => {
    await browser.setViewport({ width: 700, height: 900 });
    const attempts: string[] = [];
    const script = await browser.addInitScript<string>((emit) => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      const originalFetch = window.fetch;
      Object.defineProperty(window, "fetch", {
        value(input: RequestInfo | URL, options?: RequestInit) {
          const url = input instanceof Request ? input.url : String(input);
          if (url.startsWith("https://ct.a2f0.net/")) {
            emit(url);
            return Promise.resolve(new Response(null, { status: 202 }));
          }
          return originalFetch(input, options);
        },
      });
    });
    script.on("data", (url) => attempts.push(url));
    try {
      await browser.url("/");
      await expect($(".routed-pane-appbar")).toBeExisting();
      await $(".routed-pane-taskbar button[aria-label='Menu']").click();
      await browser.execute(() => window.dispatchEvent(new Event("pagehide")));
      // A positive control proves interception and waits for the asynchronous
      // browser-to-runner channel to deliver earlier attempts before asserting.
      const probe = "https://ct.a2f0.net/__interception_probe__";
      await browser.execute(async (url) => {
        await fetch(url, { method: "POST" });
      }, probe);
      await browser.waitUntil(() => attempts.includes(probe));
      expect(attempts).toEqual([probe]);
    } finally {
      await script.remove();
    }
  });
});
