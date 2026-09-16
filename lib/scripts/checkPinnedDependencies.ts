#!/usr/bin/env -S npx tsx
// Fails when any dependency in package.json uses a range instead of an
// exact version. Replaces @a2f0/check-for-unpinned-dependencies, which
// reads package-lock.json and cannot run against this pnpm workspace.
import { globSync, readFileSync } from "node:fs";

const EXACT_VERSION = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
const GROUPS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

const unpinned: string[] = [];
for (const manifest of globSync(["package.json", "packages/*/package.json"])) {
  const packageJson: Record<string, Record<string, string>> = JSON.parse(
    readFileSync(manifest, "utf8"),
  );
  for (const group of GROUPS) {
    for (const [name, version] of Object.entries(packageJson[group] ?? {})) {
      if (!EXACT_VERSION.test(version)) {
        unpinned.push(`${manifest} > ${group} > ${name}: ${version}`);
      }
    }
  }
}

if (unpinned.length > 0) {
  console.error("Unpinned dependencies found:");
  for (const entry of unpinned) {
    console.error(`  ${entry}`);
  }
  process.exit(1);
}
console.info("All dependencies are pinned.");
