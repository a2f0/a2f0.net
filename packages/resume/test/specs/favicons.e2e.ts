import { browser, expect } from "@wdio/globals";

// The build renders these from assets/brand/ into public/ (see agent-tool.json).
const ICONS = ["/favicon.ico", "/favicon.svg", "/apple-touch-icon.png"];

describe("Favicons", () => {
  for (const path of ["/", "/pdf", "/does-not-exist"]) {
    it(`links and serves the rendered icons on ${path}`, async () => {
      await browser.url(path);
      const links = await browser.execute(() =>
        Array.from(
          document.querySelectorAll<HTMLLinkElement>(
            'link[rel="icon"], link[rel="apple-touch-icon"]',
          ),
          (link) => new URL(link.href).pathname,
        ),
      );
      expect(links).toEqual(ICONS);

      for (const icon of ICONS) {
        const response = await fetch(new URL(icon, browser.options.baseUrl));
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toMatch(/^image\//);
        expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
      }
    });
  }
});
