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

import { parseDeployTier } from "../../lib/deployTier";

// `ci-headless` serves the production export; `ci-headless:staging` builds
// staging's and runs this spec against it with the same tier.
const staging = parseDeployTier(process.env.RESUME_DEPLOY_TIER) === "staging";
const STAGING_RULE = "noindex, nofollow";

const jsonLd = (html: string) =>
  [
    ...html.matchAll(
      /<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/g,
    ),
  ].map(([, json]) => JSON.parse(json));

// Every kind of response: pages, the 404 page, crawler files, and assets.
const RESPONSES = [
  ["/", 200],
  ["/pdf", 200],
  ["/404", 200],
  ["/does-not-exist", 404],
  ["/robots.txt", 200],
  ["/favicon.svg", 200],
  ["/og-image.png", 200],
] as const;

describe(`Search metadata (${staging ? "staging" : "production"})`, () => {
  for (const path of ["/", "/pdf"]) {
    it(`exports ${path} with its description, previews, and JSON-LD`, async () => {
      const response = await fetchPath(path);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toMatch(/<meta name="description" content="Dan Sullivan/);
      expectLinkPreviews(html, "https://resume.a2f0.net/");
      expect(jsonLd(html)).toMatchObject([
        { "@type": "Person", name: "Dan Sullivan" },
      ]);
      if (staging) {
        expect(html).toContain(
          `<meta name="robots" content="${STAGING_RULE}"/>`,
        );
        expect(html).not.toMatch(/rel="canonical"|property="og:url"/);
      } else {
        expectIndexedAt(html, "https://resume.a2f0.net/");
      }
    });
  }

  // Workers serves the error page for every missing path, with a 404, and at
  // its own path with a 200. Production keeps it out of search too, and it
  // names no URL of its own.
  for (const [path, status] of [
    ["/404", 200],
    ["/does-not-exist", 404],
    ["/nested/does-not-exist", 404],
  ] as const) {
    it(`keeps the error page at ${path} out of search`, async () => {
      const response = await fetchPath(path);
      expect(response.status).toBe(status);
      expectErrorPage(
        await response.text(),
        staging ? STAGING_RULE : "noindex",
      );
    });
  }

  it(`${staging ? "asks" : "never asks"} search engines to drop a response`, async () => {
    for (const [path, status] of RESPONSES) {
      const response = await fetchPath(path);
      expect(response.status).toBe(status);
      expect(response.headers.get("x-robots-tag")).toBe(
        staging ? STAGING_RULE : null,
      );
    }
  });

  it("keeps the tier's metadata once the page hydrates", async () => {
    await browser.url("/");
    await $("#svgResume").waitForExist();
    if (staging) {
      await expect($('meta[name="robots"]')).toHaveAttribute(
        "content",
        STAGING_RULE,
      );
      await expect($('link[rel="canonical"]')).not.toBeExisting();
    } else {
      await expect($('link[rel="canonical"]')).toHaveAttribute(
        "href",
        "https://resume.a2f0.net/",
      );
      await expect($('meta[name="robots"]')).not.toBeExisting();
    }
    await expectHydratedErrorPage(
      "/does-not-exist",
      staging ? STAGING_RULE : "noindex",
    );
  });

  it("serves robots.txt as text that allows crawling", async () => {
    const robots = await fetchRobotsTxt();
    expect(robots).toContain("User-agent: ia_archiver\nDisallow: /\n");
    expect(robots).toContain("User-agent: *\nAllow: /\n");
    if (staging) expect(robots).not.toMatch(/sitemap/i);
    else
      expect(robots).toContain("Sitemap: https://resume.a2f0.net/sitemap.xml");
  });

  it(`${staging ? "has no" : "lists the home page in its"} sitemap`, async () => {
    const response = await fetchPath("/sitemap.xml");
    if (staging) {
      expect(response.status).toBe(404);
      return;
    }
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("xml");
    expect(await response.text()).toContain(
      "<loc>https://resume.a2f0.net/</loc>",
    );
  });

  itServesLinkPreviewImage();
});
