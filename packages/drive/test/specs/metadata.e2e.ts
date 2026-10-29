import {
  expectErrorPage,
  expectHydratedErrorPage,
  expectIndexedAt,
  expectLinkPreviews,
  fetchPath,
  fetchRobotsTxt,
  itServesLinkPreviewImage,
} from "@a2f0/testing/searchMetadata";
import { expect } from "@wdio/globals";

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
    expectIndexedAt(html, "https://drive.a2f0.net/");
    expectLinkPreviews(html, "https://drive.a2f0.net/");
    expect(html).toContain('<meta name="theme-color" content="#161616"');
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
      expectErrorPage(await response.text());
    });
  }

  it("keeps the error page's tags once it hydrates", () =>
    expectHydratedErrorPage("/does-not-exist"));

  itServesLinkPreviewImage();

  it("serves robots.txt as text that allows crawling", async () => {
    expect(await fetchRobotsTxt()).toBe("User-agent: *\nAllow: /\n");
  });
});
