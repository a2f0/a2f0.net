import { $, browser, expect } from "@wdio/globals";

// The suite serves the default build, which is production's; the deploy
// guard checks the staging build's robots rules before it is published.
const page = async (path: string) => {
  const response = await fetch(new URL(path, browser.options.baseUrl));
  expect(response.status).toBe(200);
  return response.text();
};

const jsonLd = (html: string) =>
  [
    ...html.matchAll(
      /<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/g,
    ),
  ].map(([, json]) => JSON.parse(json));

describe("Search metadata", () => {
  for (const path of ["/", "/pdf"]) {
    it(`exports ${path} with its metadata and the home page as canonical`, async () => {
      const html = await page(path);
      expect(html).toContain(
        '<link rel="canonical" href="https://resume.a2f0.net/"',
      );
      expect(html).toContain(
        '<meta property="og:url" content="https://resume.a2f0.net/"',
      );
      expect(html).toMatch(/<meta name="description" content="Dan Sullivan/);
      expect(html).toContain('<meta name="twitter:card" content="summary"');
      expect(html).not.toMatch(/<meta name="robots"/);
      expect(jsonLd(html)).toMatchObject([
        { "@type": "Person", name: "Dan Sullivan" },
      ]);
    });
  }

  it("keeps the metadata once the page hydrates", async () => {
    await browser.url("/");
    await $("#svgResume").waitForExist();
    await expect($('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://resume.a2f0.net/",
    );
    await expect($('meta[name="robots"]')).not.toBeExisting();
  });

  it("serves robots.txt as text with the sitemap", async () => {
    const response = await fetch(
      new URL("/robots.txt", browser.options.baseUrl),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const robots = await response.text();
    expect(robots).toContain("User-agent: ia_archiver\nDisallow: /\n");
    expect(robots).toContain("User-agent: *\nAllow: /\n");
    expect(robots).toContain("Sitemap: https://resume.a2f0.net/sitemap.xml");
  });

  it("lists the home page in the sitemap", async () => {
    const response = await fetch(
      new URL("/sitemap.xml", browser.options.baseUrl),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    expect(await response.text()).toContain(
      "<loc>https://resume.a2f0.net/</loc>",
    );
  });
});
