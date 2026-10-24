import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DEPLOYMENTS } from "./deployPolicy";
import {
  checkIndexing,
  type IndexingEvidence,
  readIndexingEvidence,
} from "./indexingPolicy";

const STAGING_META = '<meta name="robots" content="noindex, nofollow"/>';
const page = (head = "") => `<html><head>${head}</head><body></body></html>`;
const STAGING_HEADERS = "/*\n  X-Robots-Tag: noindex, nofollow\n";

const staging = (
  changes: Partial<IndexingEvidence> = {},
): IndexingEvidence => ({
  pages: new Map([
    ["index.html", page(STAGING_META)],
    ["404.html", page(STAGING_META)],
  ]),
  headers: STAGING_HEADERS,
  robots: "User-agent: *\nAllow: /\n",
  sitemap: false,
  ...changes,
});

const production = (
  changes: Partial<IndexingEvidence> = {},
): IndexingEvidence => ({
  pages: new Map([["index.html", page('<link rel="canonical" href="/"/>')]]),
  headers: "/*\n  X-Content-Type-Options: nosniff\n",
  robots: "User-agent: *\nAllow: /\n\nSitemap: https://a2f0.net/sitemap.xml\n",
  sitemap: true,
  ...changes,
});

test("only the resume's staging Worker is a staging target", () => {
  expect(
    Object.entries(DEPLOYMENTS)
      .filter(([, target]) => target.tier === "staging")
      .map(([name]) => name),
  ).toEqual(["resume-staging"]);
});

test("only the website's skyline copy may be kept out of production search", () => {
  expect(
    Object.fromEntries(
      Object.entries(DEPLOYMENTS)
        .filter(([, target]) => target.noindexPatterns.length)
        .map(([name, target]) => [name, target.noindexPatterns]),
    ),
  ).toEqual({ website: ["/skyline", "/skyline/*"] });
});

test("staging must ask search engines to drop every page and response", () => {
  expect(() => checkIndexing("staging", staging())).not.toThrow();
  // Attribute order, quoting and spacing do not matter.
  expect(() =>
    checkIndexing(
      "staging",
      staging({
        pages: new Map([
          ["index.html", page("<meta content='noindex,nofollow' name=robots>")],
        ]),
        headers: "/*\n\tx-robots-tag:noindex,  nofollow\n",
      }),
    ),
  ).not.toThrow();
  expect(() =>
    checkIndexing(
      "staging",
      staging({
        pages: new Map([
          ["index.html", page(STAGING_META)],
          ["pdf.html", page()],
        ]),
      }),
    ),
  ).toThrow("Staging page pdf.html lacks the robots meta tag");
  expect(() =>
    checkIndexing(
      "staging",
      staging({
        pages: new Map([
          ["index.html", page('<meta name="robots" content="noindex"/>')],
        ]),
      }),
    ),
  ).toThrow("lacks the robots meta tag");
  for (const headers of [
    undefined,
    "",
    "/pdf\n  X-Robots-Tag: noindex, nofollow\n",
    "/*\n  X-Content-Type-Options: nosniff\n",
    "/*\n# X-Robots-Tag: noindex, nofollow\n",
  ]) {
    expect(() => checkIndexing("staging", staging({ headers }))).toThrow(
      "Staging _headers",
    );
  }
  expect(() => checkIndexing("staging", staging({ sitemap: true }))).toThrow(
    "sitemap",
  );
  expect(() =>
    checkIndexing(
      "staging",
      staging({ robots: "User-agent: *\nSitemap: https://x/sitemap.xml\n" }),
    ),
  ).toThrow("sitemap");
  expect(() => checkIndexing("staging", staging({ pages: new Map() }))).toThrow(
    "no HTML pages",
  );
});

test("production must never ask to be left out of search", () => {
  expect(() => checkIndexing("production", production())).not.toThrow();
  expect(() =>
    checkIndexing(
      "production",
      production({ headers: undefined, robots: undefined, sitemap: false }),
    ),
  ).not.toThrow();
  // Other robots directives are allowed.
  expect(() =>
    checkIndexing(
      "production",
      production({
        pages: new Map([
          [
            "index.html",
            page('<meta name="robots" content="max-image-preview:large"/>'),
          ],
        ]),
      }),
    ),
  ).not.toThrow();
  for (const meta of [
    STAGING_META,
    '<meta name="robots" content="noindex"/>',
    "<meta content='none' name='robots'>",
    '<meta name="googlebot" content="noindex"/>',
  ]) {
    expect(() =>
      checkIndexing(
        "production",
        production({
          pages: new Map([
            ["index.html", page()],
            ["404.html", page(meta)],
          ]),
        }),
      ),
    ).toThrow("Production page 404.html");
  }
  // Pages copied in from packages keep their own rules.
  expect(() =>
    checkIndexing(
      "production",
      production({
        pages: new Map([
          ["index.html", page()],
          [
            "skyline/study.html",
            page('<meta name="robots" content="noindex" />'),
          ],
        ]),
      }),
    ),
  ).not.toThrow();
  expect(() =>
    checkIndexing(
      "production",
      production({ pages: new Map([["skyline/index.html", page()]]) }),
    ),
  ).toThrow("no root page");
  for (const headers of [
    STAGING_HEADERS,
    "/assets/*\n  X-Robots-Tag: noindex\n",
    "/*\n  x-robots-tag: none\n",
  ]) {
    expect(() => checkIndexing("production", production({ headers }))).toThrow(
      "Production _headers",
    );
  }
});

test("production may keep only its named _headers patterns out of search", () => {
  const allowed = DEPLOYMENTS.website.noindexPatterns;
  const skyline =
    "/skyline\n  X-Robots-Tag: noindex, nofollow\n" +
    "/skyline/*\n  X-Robots-Tag: noindex, nofollow\n";
  expect(() =>
    checkIndexing("production", production({ headers: skyline }), allowed),
  ).not.toThrow();
  // Without the allowance, the same rules are refused.
  expect(() =>
    checkIndexing("production", production({ headers: skyline })),
  ).toThrow("Production _headers ask to leave responses to /skyline out");
  // The allowance names exact patterns. The whole site, its own pages, the
  // dnbm copies, which must stay indexable, and other spellings of the skyline
  // patterns are still refused.
  for (const pattern of [
    "/*",
    "/",
    "/index.html",
    "/app/*",
    "/dnbm/*",
    "/dnbm/player/*",
    "/sky*",
    "/skyline*",
    "/skyline/",
    "https://a2f0.net/skyline/*",
  ]) {
    expect(() =>
      checkIndexing(
        "production",
        production({
          headers: `${skyline}${pattern}\n  X-Robots-Tag: noindex\n`,
        }),
        allowed,
      ),
    ).toThrow(`Production _headers ask to leave responses to ${pattern} out`);
  }
  // The allowance covers headers, never the site's own pages.
  expect(() =>
    checkIndexing(
      "production",
      production({
        headers: skyline,
        pages: new Map([["index.html", page(STAGING_META)]]),
      }),
      allowed,
    ),
  ).toThrow("Production page index.html");
});

test("the website's _headers keep exactly its skyline copy out of search", async () => {
  const headers = await readFile(
    new URL("../../packages/website/public/_headers", import.meta.url),
    "utf8",
  );
  expect(() =>
    checkIndexing(
      "production",
      production({ headers }),
      DEPLOYMENTS.website.noindexPatterns,
    ),
  ).not.toThrow();
  for (const pattern of DEPLOYMENTS.website.noindexPatterns) {
    expect(() =>
      checkIndexing(
        "production",
        production({ headers }),
        DEPLOYMENTS.website.noindexPatterns.filter((item) => item !== pattern),
      ),
    ).toThrow(`Production _headers ask to leave responses to ${pattern} out`);
  }
});

test("reads every HTML page and the crawler files from an asset tree", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-indexing-test-"));
  try {
    await mkdir(resolve(directory, "app/resume"), { recursive: true });
    await writeFile(resolve(directory, "index.html"), "home");
    await writeFile(resolve(directory, "app/resume/index.html"), "resume");
    await writeFile(resolve(directory, "app/script.js"), "code");
    expect(await readIndexingEvidence(directory)).toEqual({
      pages: new Map([
        ["app/resume/index.html", "resume"],
        ["index.html", "home"],
      ]),
      headers: undefined,
      robots: undefined,
      sitemap: false,
    });
    await writeFile(resolve(directory, "_headers"), STAGING_HEADERS);
    await writeFile(resolve(directory, "robots.txt"), "User-agent: *\n");
    await writeFile(resolve(directory, "sitemap.xml"), "<urlset/>");
    expect(await readIndexingEvidence(directory)).toMatchObject({
      headers: STAGING_HEADERS,
      robots: "User-agent: *\n",
      sitemap: true,
    });
  } finally {
    await rm(directory, { recursive: true });
  }
});
