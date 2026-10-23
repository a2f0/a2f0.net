import type { DeployTier } from "./deployTier";
import { RESUME_URL } from "./metadata";

/**
 * The crawler files a tier's export adds beside public/'s, keyed by their path
 * in out/. Both tiers serve public/robots.txt's rules; neither blocks crawling,
 * which would hide staging's headers from search engines. Production adds a
 * sitemap of its one indexable page, and staging a `_headers` rule that keeps
 * every response, assets and the 404 page included, out of search results.
 */
export function crawlerFiles(
  tier: DeployTier,
  robots: string,
): Record<string, string> {
  if (tier === "staging") {
    return {
      _headers: "/*\n  X-Robots-Tag: noindex, nofollow\n",
      "robots.txt": robots,
    };
  }
  const sitemap = new URL("sitemap.xml", RESUME_URL).href;
  return {
    "robots.txt": `${robots.trimEnd()}\n\nSitemap: ${sitemap}\n`,
    "sitemap.xml": [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      `  <url><loc>${RESUME_URL}</loc></url>`,
      "</urlset>",
      "",
    ].join("\n"),
  };
}
