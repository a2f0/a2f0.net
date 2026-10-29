import {
  expectErrorPage,
  expectHydratedErrorPage,
  expectIndexedAt,
  expectLinkPreviews,
  fetchPath,
  fetchRobotsTxt,
  itServesLinkPreviewImage,
} from "@a2f0/testing/searchMetadata";
import { $, browser, expect } from "@wdio/globals";

describe("Search metadata", () => {
  // The routed shell's app routes serve the same page, so all name the root.
  for (const path of ["/", "/app/resume"]) {
    it(`exports ${path} with its metadata before any script runs`, async () => {
      const response = await fetchPath(path);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toMatch(/<title[^>]*>a2f0\.net<\/title>/);
      expect(html).toMatch(/<meta name="description" content="Dan Sullivan/);
      expectIndexedAt(html, "https://a2f0.net/");
      expectLinkPreviews(html, "https://a2f0.net/");
      expect(html).toContain('<meta name="theme-color" content="#000000"');
      const [, json] =
        /<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/.exec(
          html,
        ) ?? [];
      expect(JSON.parse(json ?? "null")).toMatchObject({
        "@type": "WebSite",
        url: "https://a2f0.net/",
      });
    });
  }

  // Workers serves the error page at its own path with a 200; the routed
  // shell's fallback answers every other missing path. It is the one page of
  // the site's own kept out of search, and it names no URL of its own.
  it("keeps the error page at /404 out of search", async () => {
    const response = await fetchPath("/404");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBeNull();
    expectErrorPage(await response.text());
    await expectHydratedErrorPage("/404");
  });

  // The dnbm package's pages, copied under /dnbm/, name the dnbm site as
  // canonical, so search engines treat these copies as its duplicates.
  for (const [path, canonical] of [
    ["/dnbm/", "https://dnbm.a2f0.net/"],
    ["/dnbm/player/", "https://dnbm.a2f0.net/player/"],
  ]) {
    it(`points the copy at ${path} to ${canonical}`, async () => {
      const response = await fetchPath(path);
      expect(response.status).toBe(200);
      expect(response.redirected).toBe(false);
      const html = await response.text();
      expect(html).toContain(`<link rel="canonical" href="${canonical}"`);
      expect(html).toContain(`<meta property="og:url" content="${canonical}"`);
    });
  }

  // The skyline viewer's copies stay out of search: its pages carry the
  // package's robots meta tag, and _headers covers every response under the
  // copy, assets and redirects included, exactly once. The site's own pages
  // and the dnbm copies send no X-Robots-Tag.
  for (const [path, status] of [
    ["/skyline", 307],
    ["/skyline/", 200],
    ["/skyline/skyline-3d", 200],
    ["/skyline/skyline-3d.html", 307],
    ["/skyline/skyline-animated.svg", 200],
    ["/skyline/skyline-viewer.js", 200],
    ["/skyline/viewer.css", 200],
  ] as const) {
    it(`keeps ${path} out of search`, async () => {
      const response = await fetchPath(path, { redirect: "manual" });
      expect(response.status).toBe(status);
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    });
  }

  for (const path of [
    "/",
    "/app/resume",
    "/dnbm/",
    "/dnbm/player/",
    "/a2f0.svg",
  ]) {
    it(`leaves ${path} indexable`, async () => {
      const response = await fetchPath(path, { redirect: "manual" });
      expect(response.status).toBe(200);
      expect(response.headers.get("x-robots-tag")).toBeNull();
    });
  }

  it("colors the browser's chrome with the theme's desk", async () => {
    const themeColors = () =>
      browser.execute(() =>
        [...document.querySelectorAll('meta[name="theme-color"]')].map((tag) =>
          tag.getAttribute("content"),
        ),
      );
    // One tag, so the browser cannot pick a stale one.
    const showsColor = (color: string) =>
      browser.waitUntil(
        async () =>
          JSON.stringify(await themeColors()) === JSON.stringify([color]),
        { timeoutMsg: `the theme color did not become ${color}` },
      );
    const themeSwitch = () => $(".desktop-taskbar-end > button:last-child");
    await browser.url("/");
    try {
      await expect(themeSwitch()).toHaveAttribute(
        "aria-label",
        "Switch to Paper theme",
      );
      await showsColor("#000000");
      await themeSwitch().click();
      await expect($("html")).toHaveAttribute("data-theme", "paper");
      await showsColor("#c8c8c8");
      // A saved choice recolors the chrome as the page loads.
      await browser.refresh();
      await expect($("html")).toHaveAttribute("data-theme", "paper");
      await showsColor("#c8c8c8");
    } finally {
      await browser.execute(() => localStorage.removeItem("website.theme"));
    }
  });

  it("serves robots.txt as text, not the page", async () => {
    expect(await fetchRobotsTxt()).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://a2f0.net/sitemap.xml\n",
    );
  });

  itServesLinkPreviewImage();

  it("lists the root in the sitemap", async () => {
    const response = await fetchPath("/sitemap.xml");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    expect(await response.text()).toContain("<loc>https://a2f0.net/</loc>");
  });
});
