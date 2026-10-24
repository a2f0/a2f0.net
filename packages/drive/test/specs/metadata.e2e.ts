import { $, $$, browser, expect } from "@wdio/globals";

const fetchPath = (path: string) =>
  fetch(new URL(path, browser.options.baseUrl));

describe("Search metadata", () => {
  it("exports the page with its metadata before any script runs", async () => {
    const response = await fetchPath("/");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toMatch(
      /<title[^>]*>Drive – Encrypted Notes and Files · a2f0<\/title>/,
    );
    expect(html).toMatch(
      /<meta name="description" content="A little space for your files/,
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://drive.a2f0.net/"',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://drive.a2f0.net/"',
    );
    expect(html).toContain(
      '<meta property="og:image" content="https://drive.a2f0.net/og-image.png"',
    );
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image"',
    );
    expect(html).toContain('<meta name="theme-color" content="#161616"');
    expect(html).not.toMatch(/<meta name="robots"/);
  });

  // Workers serves the error page for every missing path, with a 404, and at
  // its own path with a 200. It is the one page kept out of search, and it
  // names no URL of its own.
  for (const [path, status] of [
    ["/404", 200],
    ["/does-not-exist", 404],
    ["/nested/does-not-exist", 404],
  ] as const) {
    it(`keeps the error page at ${path} out of search`, async () => {
      const response = await fetchPath(path);
      expect(response.status).toBe(status);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(response.headers.get("x-robots-tag")).toBeNull();
      const html = await response.text();
      expect(html).toContain("This page could not be found");
      expect(
        [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map(
          ([, content]) => content,
        ),
      ).toEqual(["noindex"]);
      expect(html).not.toMatch(/rel="canonical"|property="og:url"/);
    });
  }

  it("keeps the error page's tags once it hydrates", async () => {
    await browser.url("/does-not-exist");
    await expect($("h1")).toHaveText("404");
    await expect($$('meta[name="robots"]')).toBeElementsArrayOfSize(1);
    await expect($('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );
    await expect($('link[rel="canonical"]')).not.toBeExisting();
    await expect($('meta[property="og:url"]')).not.toBeExisting();
  });

  it("serves the link-preview image", async () => {
    const response = await fetchPath("/og-image.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("serves robots.txt as text that allows crawling", async () => {
    const response = await fetchPath("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("User-agent: *\nAllow: /\n");
  });
});
