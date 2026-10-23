import { $, browser, expect } from "@wdio/globals";

import { parseDeployTier } from "../../lib/deployTier";

// `ci-headless` serves the production export; `ci-headless:staging` builds
// staging's and runs this spec against it with the same tier.
const staging = parseDeployTier(process.env.RESUME_DEPLOY_TIER) === "staging";
const STAGING_RULE = "noindex, nofollow";

const fetchPath = (path: string) =>
  fetch(new URL(path, browser.options.baseUrl));

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
      expect(html).toContain(
        '<meta property="og:image" content="https://resume.a2f0.net/og-image.png"',
      );
      expect(html).toContain(
        '<meta name="twitter:card" content="summary_large_image"',
      );
      expect(jsonLd(html)).toMatchObject([
        { "@type": "Person", name: "Dan Sullivan" },
      ]);
      if (staging) {
        expect(html).toContain(
          `<meta name="robots" content="${STAGING_RULE}"/>`,
        );
        expect(html).not.toMatch(/rel="canonical"|property="og:url"/);
      } else {
        expect(html).toContain(
          '<link rel="canonical" href="https://resume.a2f0.net/"',
        );
        expect(html).toContain(
          '<meta property="og:url" content="https://resume.a2f0.net/"',
        );
        expect(html).not.toMatch(/<meta name="robots"/);
      }
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
    const missing = await (await fetchPath("/does-not-exist")).text();
    expect(
      missing.includes(`<meta name="robots" content="${STAGING_RULE}"`),
    ).toBe(staging);
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
  });

  it("serves robots.txt as text that allows crawling", async () => {
    const response = await fetchPath("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const robots = await response.text();
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

  it("serves the link-preview image", async () => {
    const response = await fetchPath("/og-image.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
