import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

/** What the indexing check reads from a target's asset tree. */
export interface IndexingEvidence {
  /** Every HTML file's text, by its path in the tree. */
  pages: ReadonlyMap<string, string>;
  /** `_headers`, which Workers static assets apply to matching responses. */
  headers: string | undefined;
  robots: string | undefined;
  sitemap: boolean;
}

async function readOptional(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export async function readIndexingEvidence(
  directory: string,
): Promise<IndexingEvidence> {
  const pages = new Map<string, string>();
  async function visit(path: string, relative: string) {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(resolve(path, entry.name), name);
      else if (entry.isFile() && /\.html?$/i.test(entry.name))
        pages.set(name, await readFile(resolve(path, entry.name), "utf8"));
    }
  }
  await visit(directory, "");
  return {
    pages,
    headers: await readOptional(resolve(directory, "_headers")),
    robots: await readOptional(resolve(directory, "robots.txt")),
    sitemap:
      (await readOptional(resolve(directory, "sitemap.xml"))) !== undefined,
  };
}

// The content of each robots meta tag, including crawler-specific ones.
function robotsMeta(page: string) {
  return [...page.matchAll(/<meta\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .filter((tag) =>
      /\bname\s*=\s*["']?(robots|googlebot|bingbot)["'\s/>]/i.test(tag),
    )
    .map((tag) => /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "");
}

// `_headers` rules: an unindented URL pattern, then its indented headers.
function headerRules(text: string) {
  const rules = new Map<string, string[]>();
  let current: string[] | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) {
      current?.push(line.trim());
    } else {
      current = rules.get(line.trim()) ?? [];
      rules.set(line.trim(), current);
    }
  }
  return rules;
}

const robotsHeader = (header: string) =>
  /^x-robots-tag\s*:(.*)$/i.exec(header)?.[1] ?? "";
const normalized = (directives: string) =>
  directives.replace(/\s+/g, "").toLowerCase();
const STAGING_DIRECTIVES = "noindex,nofollow";
const EXCLUDES_PAGE = /\b(noindex|none)\b/i;

/**
 * Staging must keep every response out of search results without blocking
 * crawlers, which would hide the rule from them, and must not advertise a
 * sitemap. Production must never carry that rule: no `_headers` rule may send
 * it, and no page the site exports at its root may ask for it. Pages that
 * builds copy in from packages, such as the website's skyline/ studies, sit
 * in subdirectories and keep the robots rules their packages give them.
 */
export function checkIndexing(
  tier: "production" | "staging",
  { pages, headers, robots, sitemap }: IndexingEvidence,
) {
  if (!pages.size) throw new Error("The asset tree has no HTML pages");
  const rules = headerRules(headers ?? "");
  if (tier === "staging") {
    for (const [path, page] of pages) {
      if (
        !robotsMeta(page).some(
          (content) => normalized(content) === STAGING_DIRECTIVES,
        )
      )
        throw new Error(`Staging page ${path} lacks the robots meta tag`);
    }
    if (
      !(rules.get("/*") ?? []).some(
        (header) => normalized(robotsHeader(header)) === STAGING_DIRECTIVES,
      )
    )
      throw new Error(
        "Staging _headers must send X-Robots-Tag: noindex, nofollow for /*",
      );
    if (sitemap || /^\s*sitemap\s*:/im.test(robots ?? ""))
      throw new Error("Staging must not advertise a sitemap");
    return;
  }
  const rootPages = [...pages].filter(([path]) => !path.includes("/"));
  if (!rootPages.length) throw new Error("The asset tree has no root page");
  for (const [path, page] of rootPages) {
    if (robotsMeta(page).some((content) => EXCLUDES_PAGE.test(content)))
      throw new Error(`Production page ${path} asks to be left out of search`);
  }
  for (const values of rules.values()) {
    if (values.some((header) => EXCLUDES_PAGE.test(robotsHeader(header))))
      throw new Error(
        "Production _headers ask to leave responses out of search",
      );
  }
}
