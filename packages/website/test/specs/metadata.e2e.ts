import { $, browser, expect } from "@wdio/globals";

const fetchPath = (path: string) =>
  fetch(new URL(path, browser.options.baseUrl));

describe("Search metadata", () => {
  // The routed shell's app routes serve the same page, so all name the root.
  for (const path of ["/", "/app/resume"]) {
    it(`exports ${path} with its metadata before any script runs`, async () => {
      const response = await fetchPath(path);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toMatch(
        /<title[^>]*>Resume, Graffiti, Skyline, and Drum and Bass – a2f0\.net<\/title>/,
      );
      expect(html).toMatch(/<meta name="description" content="Dan Sullivan/);
      expect(html).toContain('<link rel="canonical" href="https://a2f0.net/"');
      expect(html).toContain(
        '<meta property="og:url" content="https://a2f0.net/"',
      );
      expect(html).toContain(
        '<meta property="og:image" content="https://a2f0.net/og-image.png"',
      );
      expect(html).toContain(
        '<meta name="twitter:card" content="summary_large_image"',
      );
      expect(html).toContain('<meta name="theme-color" content="#000000"');
      expect(html).not.toMatch(/<meta name="robots"/);
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
    const response = await fetchPath("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://a2f0.net/sitemap.xml\n",
    );
  });

  it("serves the link-preview image", async () => {
    const response = await fetchPath("/og-image.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("lists the root in the sitemap", async () => {
    const response = await fetchPath("/sitemap.xml");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    expect(await response.text()).toContain("<loc>https://a2f0.net/</loc>");
  });
});
