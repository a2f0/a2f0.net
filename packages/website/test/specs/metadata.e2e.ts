import { browser, expect } from "@wdio/globals";

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
      expect(html).toContain('<meta name="twitter:card" content="summary"');
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

  it("serves robots.txt as text, not the page", async () => {
    const response = await fetchPath("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://a2f0.net/sitemap.xml\n",
    );
  });

  it("lists the root in the sitemap", async () => {
    const response = await fetchPath("/sitemap.xml");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    expect(await response.text()).toContain("<loc>https://a2f0.net/</loc>");
  });
});
