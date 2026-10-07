import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import {
  checkToolVersions,
  digestAssets,
  fingerprintFile,
} from "./deploySnapshot";

test("declared runtime/tool versions must match the actual deployment path", () => {
  const pins = { bun: "bun@1.4.2", node: "=24.21.0", wrangler: "4.132.0" };
  const actual = { bun: "1.4.2", node: "24.21.0", wrangler: "4.132.0" };
  expect(() => checkToolVersions(pins, actual)).not.toThrow();
  for (const change of [
    { bun: "1.3.11" },
    { node: "26.11.0" },
    { wrangler: "4.148.0" },
  ]) {
    expect(() => checkToolVersions(pins, { ...actual, ...change })).toThrow();
  }
});

test("asset snapshots detect changed bytes, names and special routing files", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-assets-test-"));
  try {
    await expect(digestAssets(directory)).rejects.toThrow("empty");
    await mkdir(resolve(directory, "empty-child"));
    await writeFile(resolve(directory, "index.html"), "page");
    const executable = await fingerprintFile(resolve(directory, "index.html"));
    const initial = await digestAssets(directory);
    expect(await digestAssets(directory)).toBe(initial);
    await writeFile(resolve(directory, "index.html"), "changed");
    expect(await fingerprintFile(resolve(directory, "index.html"))).not.toBe(
      executable,
    );
    expect(await digestAssets(directory)).not.toBe(initial);
    await writeFile(resolve(directory, "index.html"), "page");
    expect(await digestAssets(directory)).toBe(initial);
    await writeFile(resolve(directory, "_redirects"), "/old /new 301");
    expect(await digestAssets(directory)).not.toBe(initial);
    await symlink(resolve(directory, "index.html"), resolve(directory, "link"));
    await expect(digestAssets(directory)).rejects.toThrow("symlinks");
  } finally {
    await rm(directory, { recursive: true });
  }
});
