import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import resume from "@a2f0/shared/resume.json";
import { describe, expect, it } from "vitest";

import { crawlerFiles } from "../../lib/crawlerFiles";
import { parseDeployTier } from "../../lib/deployTier";
import {
  RESUME_DESCRIPTION,
  RESUME_PERSON,
  RESUME_URL,
} from "../../lib/metadata";

const robots = () => readFile(resolve("public/robots.txt"), "utf8");

describe("parseDeployTier", () => {
  it("defaults to production and accepts staging", () => {
    expect(parseDeployTier(undefined)).toBe("production");
    expect(parseDeployTier("")).toBe("production");
    expect(parseDeployTier("production")).toBe("production");
    expect(parseDeployTier("staging")).toBe("staging");
  });

  it("refuses any other tier", () => {
    for (const tier of ["prod", "Staging", "preview"]) {
      expect(() => parseDeployTier(tier)).toThrow("production or staging");
    }
  });
});

describe("crawlerFiles", () => {
  it("adds the sitemap to production's robots.txt", async () => {
    const files = crawlerFiles("production", await robots());
    expect(Object.keys(files).sort()).toEqual(["robots.txt", "sitemap.xml"]);
    expect(files["robots.txt"]).toBe(
      "User-agent: ia_archiver\nDisallow: /\n\nUser-agent: *\nAllow: /\n\n" +
        "Sitemap: https://resume.a2f0.net/sitemap.xml\n",
    );
    expect(files["sitemap.xml"]).toContain(
      "<url><loc>https://resume.a2f0.net/</loc></url>",
    );
  });

  it("keeps staging crawlable but out of search results", async () => {
    const files = crawlerFiles("staging", await robots());
    expect(Object.keys(files).sort()).toEqual(["_headers", "robots.txt"]);
    expect(files._headers).toBe("/*\n  X-Robots-Tag: noindex, nofollow\n");
    expect(files["robots.txt"]).toBe(await robots());
    expect(files["robots.txt"]).not.toMatch(/sitemap/i);
    expect(files["robots.txt"]).toMatch(/User-agent: \*\nAllow: \/\n/);
  });
});

describe("resume metadata", () => {
  it("summarizes the resume within a search snippet", () => {
    expect(RESUME_DESCRIPTION).toMatch(/^Dan Sullivan's resume: /);
    expect(RESUME_DESCRIPTION).not.toMatch(/[[\]()]/);
    expect(RESUME_DESCRIPTION.length).toBeLessThanOrEqual(160);
  });

  it("describes the person with the resume's own facts", () => {
    expect(JSON.parse(JSON.stringify(RESUME_PERSON))).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Dan Sullivan",
      url: RESUME_URL,
      homeLocation: { "@type": "Place", name: "Tennessee, USA" },
      sameAs: ["https://github.com/a2f0", "https://linkedin.com/in/a2f0"],
    });
    expect(RESUME_PERSON.alumniOf.map(({ name }) => name)).toEqual(
      resume.education.map(({ institution }) => institution),
    );
  });
});
