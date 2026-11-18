// Checks the imports of the source files in the workspaces and the root scripts
// against the rules in architecturePolicy.ts.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "bun";
import { cruise, format } from "dependency-cruiser";

import {
  CRUISE_OPTIONS,
  findGraphViolations,
  type WorkspaceManifest,
} from "./architecturePolicy";

const root = resolve(import.meta.dirname, "../..");
const SOURCE_FILE = /\.[cm]?[jt]sx?$/;
const MANIFEST = /^packages\/([^/]+)\/package\.json$/;

// A hook can supply its own index and ignore configuration. Keep the caller's
// Git environment and cwd together only if they identify this exact worktree.
function gitOptions() {
  const env = { ...process.env };
  for (const name of execFileSync("git", ["rev-parse", "--local-env-vars"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")) {
    delete env[name];
  }
  const identity = [
    "git",
    "rev-parse",
    "--path-format=absolute",
    "--show-toplevel",
    "--absolute-git-dir",
    "--git-common-dir",
  ];
  const target = spawnSync(identity, { cwd: root, env });
  const caller = spawnSync(identity);
  if (target.success && caller.success && target.stdout.equals(caller.stdout)) {
    return { cwd: process.cwd(), env: process.env };
  }
  return { cwd: root, env };
}

// Files git tracks, or would track once added, so build output and copied
// assets, which it ignores, stay out. Files deleted but not yet staged are
// skipped.
const sourceFiles = (): string[] => {
  const git = spawnSync(
    [
      "git",
      "ls-files",
      "-z",
      "--full-name",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      resolve(root, "packages"),
      resolve(root, "scripts"),
    ],
    gitOptions(),
  );
  if (!git.success) throw new Error(git.stderr.toString());
  return git.stdout
    .toString()
    .split("\0")
    .filter((path) => path && existsSync(resolve(root, path)));
};

const readManifests = (paths: string[]): Map<string, WorkspaceManifest> => {
  const manifests = new Map<string, WorkspaceManifest>();
  for (const path of paths) {
    const name = MANIFEST.exec(path)?.[1];
    if (name) manifests.set(name, JSON.parse(readFileSync(path, "utf8")));
  }
  return manifests;
};

const checkArchitecture = async (): Promise<boolean> => {
  const paths = sourceFiles();
  process.chdir(root);
  const files = paths.filter((path) => SOURCE_FILE.test(path));
  const { output: graph } = await cruise(files, CRUISE_OPTIONS);
  if (typeof graph === "string") {
    throw new Error("dependency-cruiser returned a report, not a graph");
  }
  const report = await format(graph, { outputType: "err" });
  const graphViolations = findGraphViolations(
    graph.modules,
    readManifests(paths),
  );
  if (typeof report.output === "string") console.log(report.output.trim());
  for (const violation of graphViolations) {
    console.error(`error architecture-graph: ${violation}`);
  }
  return report.exitCode === 0 && graphViolations.length === 0;
};

if (import.meta.main && !(await checkArchitecture())) process.exitCode = 1;
