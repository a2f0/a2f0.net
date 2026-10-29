import { $, $$, browser, expect } from "@wdio/globals";

// The search metadata every app's exported pages carry, checked the same way
// by each app's metadata spec. Each spec keeps what only its app does.

/** Fetches a path from the site under test, without a browser. */
export const fetchPath = (path: string, init?: RequestInit) =>
  fetch(new URL(path, browser.options.baseUrl), init);

/** Each robots meta tag's rule in the page's HTML, in order. */
export const robotsMeta = (html: string) =>
  [...html.matchAll(/<meta name="robots" content="([^"]*)"/g)].map(
    ([, content]) => content,
  );

/**
 * Checks a page names `url` as its canonical URL and leaves search engines
 * free to index it.
 */
export const expectIndexedAt = (html: string, url: string) => {
  expect(html).toContain(`<link rel="canonical" href="${url}"`);
  expect(html).toContain(`<meta property="og:url" content="${url}"`);
  expect(html).not.toMatch(/<meta name="robots"/);
};

/** Checks a page's link previews show the site's rendered preview image. */
export const expectLinkPreviews = (html: string, site: string) => {
  expect(html).toContain(
    `<meta property="og:image" content="${new URL("og-image.png", site).href}"`,
  );
  expect(html).toContain(
    '<meta name="twitter:card" content="summary_large_image"',
  );
};

/**
 * Checks the error page's exported HTML: one robots rule keeps it out of
 * search, and it names no URL of its own.
 */
export const expectErrorPage = (html: string, rule = "noindex") => {
  expect(html).toContain("This page could not be found");
  expect(robotsMeta(html)).toEqual([rule]);
  expect(html).not.toMatch(/rel="canonical"|property="og:url"/);
};

/** Checks the error page keeps those tags once it hydrates at `path`. */
export const expectHydratedErrorPage = async (
  path: string,
  rule = "noindex",
) => {
  await browser.url(path);
  await expect($("h1")).toHaveText("404");
  await expect($$('meta[name="robots"]')).toBeElementsArrayOfSize(1);
  await expect($('meta[name="robots"]')).toHaveAttribute("content", rule);
  await expect($('link[rel="canonical"]')).not.toBeExisting();
  await expect($('meta[property="og:url"]')).not.toBeExisting();
};

/** Fetches robots.txt, checks it is served as text, and returns its rules. */
export const fetchRobotsTxt = async () => {
  const response = await fetchPath("/robots.txt");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/plain");
  return response.text();
};

/** Registers a test that the site serves its link-preview image. */
export const itServesLinkPreviewImage = () =>
  it("serves the link-preview image", async () => {
    const response = await fetchPath("/og-image.png");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
