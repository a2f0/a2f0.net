import { expect, test } from "bun:test";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "bun";

test("pre-push checks the pushed commits even when HEAD is different", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-pre-push-"));
  const root = resolve(import.meta.dir, "../..");
  const cli = resolve(root, "node_modules/.bin/agent-tool");
  const zero = "0".repeat(40);
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_")) delete env[key];
  }
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_TERMINAL_PROMPT = "0";
  const command = (args: string[], stdin?: string) =>
    spawnSync(args, {
      cwd: directory,
      stdin: stdin === undefined ? "ignore" : new TextEncoder().encode(stdin),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...env, PATH: `${directory}/bin:${process.env.PATH}` },
    });
  const git = (...args: string[]) => {
    const result = command(["git", ...args]);
    if (result.exitCode !== 0) throw new Error(result.stderr.toString());
    return result.stdout.toString().trim();
  };
  try {
    git("init", "-b", "main");
    git("config", "user.name", "Hook fixture");
    git("config", "user.email", "fixture@example.invalid");
    git("config", "commit.gpgSign", "false");
    git("config", "log.showSignature", "true");
    git("config", "core.hooksPath", resolve(directory, ".git/hooks"));
    git("commit", "--allow-empty", "-m", "chore: fixture base");
    const base = git("rev-parse", "HEAD");
    git("remote", "add", "origin", resolve(directory, "unused-remote"));
    git("update-ref", "refs/remotes/origin/main", base);
    git("switch", "--no-track", "-c", "feat/forbidden");
    git(
      "commit",
      "--allow-empty",
      "-m",
      "feat: forbidden attribution\n\nCo-authored-by: Fixture <fixture@example.invalid>",
    );
    const forbidden = git("rev-parse", "HEAD");
    git("switch", "main");
    git("switch", "--no-track", "-c", "feat/invalid-subject");
    git("commit", "--allow-empty", "-m", "Invalid subject");
    const invalidSubject = git("rev-parse", "HEAD");
    git("switch", "main");
    git("commit", "--allow-empty", "-m", "feat: valid current head");
    const head = git("rev-parse", "HEAD");
    const source = "scripts/git/hooks/pre-push";
    await mkdir(resolve(directory, "scripts/git/hooks"), { recursive: true });
    await writeFile(
      resolve(directory, source),
      await readFile(resolve(root, source)),
    );
    await writeFile(
      resolve(directory, "agent-tool.json"),
      JSON.stringify({
        schemaVersion: 1,
        branch: { types: ["feat"], exempt: ["main"], maxLength: null },
        commits: { signatures: "none", rejectCoauthors: true },
        hooks: { files: [{ source, target: "pre-push", executable: true }] },
      }),
    );
    await writeFile(
      resolve(directory, "package.json"),
      JSON.stringify({
        scripts: {
          "agent-tool": JSON.stringify(cli),
          "check:architecture": "true",
          "check:dependencies": "true",
          "agents:check": "true",
        },
      }),
    );
    await mkdir(resolve(directory, "bin"));
    // Isolate the ref adapter from unrelated static checks; commitlint is real.
    const bunx = resolve(directory, "bin/bunx");
    await writeFile(
      bunx,
      [
        "#!/bin/sh",
        "set -eu",
        '[ "$1" = "--no-install" ] && shift',
        '[ "$1" = "knip" ] && exit 0',
        '[ "$1" = "commitlint" ] || exit 2',
        "shift",
        `cd '${root.replaceAll("'", "'\\''")}'`,
        `exec '${resolve(root, "node_modules/.bin/commitlint").replaceAll("'", "'\\''")}' "$@"`,
        "",
      ].join("\n"),
    );
    await chmod(bunx, 0o755);
    git("add", ".");
    expect(command([cli, "hooks", "install", "--apply"]).exitCode).toBe(0);
    const hook = resolve(directory, ".git/hooks/pre-push");
    for (const rejectedCommit of [forbidden, invalidSubject]) {
      for (const destination of [zero, base]) {
        const rejected = command(
          ["sh", hook, "origin"],
          `refs/heads/feat/forbidden ${rejectedCommit} refs/heads/feat/forbidden ${destination}\n`,
        );
        expect(rejected.exitCode).not.toBe(0);
        expect(
          rejected.stdout.toString() + rejected.stderr.toString(),
        ).toContain(
          rejectedCommit === forbidden ? "Co-authored-by" : "subject-empty",
        );
      }
    }
    const multiple = command(
      ["sh", hook, "origin"],
      `refs/heads/main ${head} refs/heads/feat/valid ${zero}\n` +
        `refs/heads/feat/forbidden ${forbidden} refs/heads/feat/forbidden ${zero}\n`,
    );
    expect(multiple.exitCode).not.toBe(0);
    expect(multiple.stdout.toString() + multiple.stderr.toString()).toContain(
      "Co-authored-by",
    );
    const accepted = command(
      ["sh", hook, "origin"],
      `refs/heads/main ${head} refs/heads/feat/valid ${zero}\n`,
    );
    expect(
      accepted.exitCode,
      accepted.stdout.toString() + accepted.stderr.toString(),
    ).toBe(0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
