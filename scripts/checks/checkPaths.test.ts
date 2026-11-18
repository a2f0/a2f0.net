import { expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

test("repository checks diagnose the nested checkout when run from its parent", async () => {
  const caller = await mkdtemp(join(tmpdir(), "script checks "));
  const project = join(caller, "checkouts/site");
  const scripts = join(project, "scripts/checks");
  try {
    await mkdir(scripts, { recursive: true });
    for (const script of [
      "checkArchitecture",
      "architecturePolicy",
      "checkPinnedDependencies",
    ]) {
      await copyFile(
        join(import.meta.dirname, `${script}.ts`),
        join(scripts, `${script}.ts`),
      );
    }
    await symlink(
      resolve(import.meta.dirname, "../../node_modules"),
      join(project, "node_modules"),
      "dir",
    );
    await writeFile(join(project, ".gitignore"), "node_modules\n");
    await writeFile(
      join(project, "package.json"),
      '{"dependencies":{"example":"^1.0.0"}}',
    );
    // Keep Git hooks in the calling checkout from redirecting Git to their index.
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_")),
    );
    execFileSync("git", ["init", "-q", project], { env });
    for (const [script, diagnostic] of [
      [
        "checkArchitecture",
        "WORKSPACE_LAYERS names packages/shared, which is gone",
      ],
      [
        "checkPinnedDependencies",
        "package.json > dependencies > example: ^1.0.0",
      ],
    ]) {
      const result = spawnSync(
        process.execPath,
        [relative(caller, join(scripts, `${script}.ts`))],
        { cwd: caller, env, encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(diagnostic);
    }
  } finally {
    await rm(caller, { recursive: true, force: true });
  }
}, 30_000);
