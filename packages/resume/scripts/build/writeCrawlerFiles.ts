import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { crawlerFiles } from "../../lib/crawlerFiles";
import { parseDeployTier } from "../../lib/deployTier";

// Runs after `next build`, which replaces out/ with the static export.
const tier = parseDeployTier(process.env.RESUME_DEPLOY_TIER);
const robots = await readFile(resolve("public/robots.txt"), "utf8");
for (const [path, contents] of Object.entries(crawlerFiles(tier, robots))) {
  await writeFile(resolve("out", path), contents);
}
console.log(`Wrote the ${tier} crawler files to out/`);
