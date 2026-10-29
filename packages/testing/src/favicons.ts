import { browser, expect } from "@wdio/globals";

// Each build renders these from assets/brand/ into its output (see
// agent-tool.json).
const ICONS = ["/favicon.ico", "/favicon.svg", "/apple-touch-icon.png"];

/**
 * Registers a browser spec checking that each path links the rendered icons
 * and that the site serves every one of them as a non-empty image.
 */
export const describeFavicons = (paths: readonly string[]) =>
  describe("Favicons", () => {
    for (const path of paths) {
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
