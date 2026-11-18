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
  const project = join(caller, "checkouts/site ");
  const scripts = join(project, "scripts/checks");
  try {
    await mkdir(scripts, { recursive: true });
    await mkdir(join(project, "packages/blog"), { recursive: true });
    await writeFile(
      join(project, "packages/blog/package.json"),
      '{"name":"@site/blog"}',
    );
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
    execFileSync("git", ["init", "-q", caller], { env });
    const options = {
      cwd: caller,
      env: {
        ...env,
        GIT_DIR: join(caller, ".git"),
        GIT_WORK_TREE: caller,
        GIT_INDEX_FILE: join(caller, ".git/index"),
      },
      encoding: "utf8",
    } as const;
    const architecture = spawnSync(
      process.execPath,
      [relative(caller, join(scripts, "checkArchitecture.ts"))],
      options,
    );
    expect(architecture.status).toBe(1);
    expect(architecture.stderr).toContain(
      "packages/blog is missing from WORKSPACE_LAYERS",
    );
    // The same checkout's hook may force-add an ignored manifest in its own index.
    await writeFile(
      join(project, ".gitignore"),
      "node_modules\npackages/blog/\n",
    );
    const hookEnv = { ...env, GIT_INDEX_FILE: ".git/hook-index" };
    execFileSync("git", ["add", "-f", "packages/blog/package.json"], {
      cwd: project,
      env: hookEnv,
    });
    const localHook = spawnSync(
      process.execPath,
      ["scripts/checks/checkArchitecture.ts"],
      { cwd: project, env: hookEnv, encoding: "utf8" },
    );
    expect(localHook.stderr).toContain(
      "packages/blog is missing from WORKSPACE_LAYERS",
    );
    // A foreign Git directory can explicitly point its worktree at this project.
    const foreignIndex = spawnSync(
      process.execPath,
      [relative(caller, join(scripts, "checkArchitecture.ts"))],
      {
        ...options,
        env: {
          ...options.env,
          GIT_WORK_TREE: project,
          GIT_INDEX_FILE: join(project, ".git/hook-index"),
        },
      },
    );
    expect(foreignIndex.status).toBe(1);
    expect(foreignIndex.stderr).toContain(
      "WORKSPACE_LAYERS names packages/shared, which is gone",
    );
    expect(foreignIndex.stderr).not.toContain("packages/blog");
    const dependencies = spawnSync(
      relative(caller, join(scripts, "checkPinnedDependencies.ts")),
      [],
      options,
    );
    expect(dependencies.status).toBe(1);
    expect(dependencies.stderr).toContain(
      "package.json > dependencies > example: ^1.0.0",
    );
  } finally {
    await rm(caller, { recursive: true, force: true });
  }
}, 30_000);
