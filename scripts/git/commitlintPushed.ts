// Lints every commit a push adds against the full commitlint configuration,
// which is stricter than agent-tool's shared commit checks. agent-tool's push
// gate runs it as a declared step (pushGate in agent-tool.json) and names the
// pushed commits in the JSON file that AGENT_TOOL_PUSH_GATE points to.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "bun";

interface PushedRef {
  remoteRef: string;
  deleted: boolean;
  commits: string[];
}

/** The commits a push adds, each once, from agent-tool's push data. */
export const pushedCommits = (source: string): string[] => {
  const data = JSON.parse(source) as {
    schemaVersion?: unknown;
    refs?: unknown;
  };
  if (data.schemaVersion !== 1 || !Array.isArray(data.refs)) {
    throw new Error("Expected agent-tool push data with schemaVersion 1.");
  }
  const commits = new Set<string>();
  for (const ref of data.refs as PushedRef[]) {
    if (ref.deleted) continue;
    if (!Array.isArray(ref.commits)) {
      throw new Error(`The push data lists no commits for ${ref.remoteRef}.`);
    }
    for (const commit of ref.commits) commits.add(commit);
  }
  return [...commits];
};

// commitlint and its configuration are this checkout's; Git reads the commits
// from the repository being pushed, the working directory.
const root = resolve(import.meta.dir, "../..");
const commitlint = resolve(root, "node_modules/.bin/commitlint");

const passes = (commit: string): boolean => {
  const message = spawnSync([
    "git",
    "-c",
    "log.showSignature=false",
    "show",
    "--no-patch",
    "--format=%B",
    commit,
  ]);
  if (!message.success) throw new Error(message.stderr.toString());
  return spawnSync([commitlint], {
    cwd: root,
    stdin: message.stdout,
    stdout: "inherit",
    stderr: "inherit",
  }).success;
};

if (import.meta.main) {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: The push gate runs this directly and never through cached Turbo tasks.
  const file = process.env.AGENT_TOOL_PUSH_GATE;
  if (!file) {
    console.error(
      "AGENT_TOOL_PUSH_GATE is not set; this runs as a push-gate step during git push.",
    );
    process.exit(1);
  }
  const commits = pushedCommits(readFileSync(file, "utf8"));
  const failed = commits.filter((commit) => !passes(commit));
  if (failed.length) {
    console.error(`commitlint rejected ${failed.join(", ")}.`);
    process.exit(1);
  }
  console.log(`commitlint passed ${commits.length} pushed commit(s).`);
}
