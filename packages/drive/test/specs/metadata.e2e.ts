import { browser, expect } from "@wdio/globals";

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
    expect(html).not.toMatch(/<meta name="robots"/);
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
