import { expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "bun";
import { pushedCommits } from "./commitlintPushed";

const root = resolve(import.meta.dir, "../..");
const hookSource = "scripts/git/hooks/pre-push";

test("the push gate runs commitlint on the pushed commits", async () => {
  const config = JSON.parse(
    await readFile(resolve(root, "agent-tool.json"), "utf8"),
  );
  const manifest = JSON.parse(
    await readFile(resolve(root, "package.json"), "utf8"),
  );
  expect(config.pushGate.steps).toContainEqual({
    label: "commitlint",
    command: ["bun", "run", "check:pushed-commits"],
  });
  expect(manifest.scripts["check:pushed-commits"]).toBe(
    "bun scripts/git/commitlintPushed.ts",
  );
});

test("pushedCommits lists each added commit once and skips deletions", () => {
  const data = (refs: unknown, schemaVersion = 1) =>
    JSON.stringify({ schemaVersion, refs });
  expect(
    pushedCommits(
      data([
        { remoteRef: "refs/heads/a", deleted: false, commits: ["c2", "c1"] },
        { remoteRef: "refs/heads/b", deleted: false, commits: ["c1", "c3"] },
        { remoteRef: "refs/heads/old", deleted: true, commits: [] },
      ]),
    ),
  ).toEqual(["c2", "c1", "c3"]);
  expect(() => pushedCommits(data([], 2))).toThrow("schemaVersion 1");
  expect(() =>
    pushedCommits(data([{ remoteRef: "refs/heads/a", deleted: false }])),
  ).toThrow("refs/heads/a");
});

test("a push is rejected for a commit message it adds, even off HEAD", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-pre-push-"));
  const work = resolve(directory, "work");
  const remote = resolve(directory, "remote.git");
  const cli = resolve(root, "node_modules/.bin/agent-tool");
  const env: Record<string, string | undefined> = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith("GIT_")) delete env[key];
  }
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_TERMINAL_PROMPT = "0";
  // Step logs and run records stay inside the fixture.
  env.TMPDIR = resolve(directory, "tmp");
  const run = (args: string[]) => {
    const result = spawnSync(args, {
      cwd: work,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    });
    return {
      exitCode: result.exitCode,
      output: result.stdout.toString() + result.stderr.toString(),
    };
  };
  const git = (...args: string[]) => {
    const result = run(["git", ...args]);
    if (result.exitCode !== 0) throw new Error(result.output);
    return result.output.trim();
  };
  const commit = (message: string) => {
    git("commit", "--allow-empty", "-m", message);
    return git("rev-parse", "HEAD");
  };
  const push = (...refspecs: string[]) =>
    run(["git", "push", "--porcelain", "origin", ...refspecs]);
  try {
    await mkdir(resolve(work, "scripts/git/hooks"), { recursive: true });
    await mkdir(env.TMPDIR, { recursive: true });
    expect(
      spawnSync(["git", "init", "--bare", "-b", "main", remote], { env })
        .exitCode,
    ).toBe(0);
    git("init", "-b", "main");
    git("config", "user.name", "Hook fixture");
    git("config", "user.email", "fixture@example.invalid");
    git("config", "commit.gpgSign", "false");
    git("config", "log.showSignature", "true");
    git("remote", "add", "origin", remote);
    // The canonical hook runs the agent-tool this checkout installed.
    await symlink(resolve(root, "node_modules"), resolve(work, "node_modules"));
    await writeFile(resolve(work, ".gitignore"), "node_modules\n");
    await writeFile(
      resolve(work, hookSource),
      await readFile(resolve(root, hookSource)),
      { mode: 0o755 },
    );
    await writeFile(
      resolve(work, "agent-tool.json"),
      JSON.stringify({
        schemaVersion: 1,
        branch: { types: ["feat"], exempt: ["main"], maxLength: null },
        commits: { signatures: "none", rejectCoauthors: true },
        hooks: {
          files: [{ source: hookSource, target: "pre-push", executable: true }],
        },
        pushGate: {
          steps: [
            {
              label: "commitlint",
              command: [
                "bun",
                resolve(root, "scripts/git/commitlintPushed.ts"),
              ],
            },
          ],
        },
      }),
    );
    git("add", ".");
    commit("chore: fixture base");
    expect(run([cli, "hooks", "install", "--apply"]).exitCode).toBe(0);

    const base = push("main");
    expect(base.exitCode, base.output).toBe(0);
    expect(base.output).toContain("commitlint");

    git("switch", "--no-track", "-c", "feat/invalid");
    commit("Invalid subject");
    git("switch", "main");
    const offHead = push("feat/invalid");
    expect(offHead.exitCode).not.toBe(0);
    expect(offHead.output).toContain("subject-empty");

    // Commits the remote already has passed its policy when they arrived, so
    // integrating them is not new work, whatever their messages say.
    git("switch", "--no-track", "-c", "feat/valid");
    commit("feat: valid change");
    const valid = push("feat/valid");
    expect(valid.exitCode, valid.output).toBe(0);
    git("switch", "main");
    commit("Remote subject");
    expect(run(["git", "push", "--no-verify", "origin", "main"]).exitCode).toBe(
      0,
    );
    git("switch", "feat/valid");
    git("merge", "--no-ff", "main", "-m", "chore: integrate updated main");
    const integrated = push("feat/valid");
    expect(integrated.exitCode, integrated.output).toBe(0);
    commit("Invalid new subject");
    const invalid = push("feat/valid");
    expect(invalid.exitCode).not.toBe(0);
    expect(invalid.output).toContain("subject-empty");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
