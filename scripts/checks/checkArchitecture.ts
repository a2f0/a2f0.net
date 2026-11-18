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

const gitEnvironment = { ...process.env };
const SOURCE_FILE = /\.[cm]?[jt]sx?$/;
const MANIFEST = /^packages\/([^/]+)\/package\.json$/;

// Files git tracks, or would track once added, so build output and copied
// assets, which it ignores, stay out. Files deleted but not yet staged are
// skipped.
const sourceFiles = (...paths: string[]): string[] => {
  const git = spawnSync(
    [
      "git",
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--",
      ...paths,
    ],
    { env: gitEnvironment },
  );
  if (!git.success) throw new Error(git.stderr.toString());
  return git.stdout
    .toString()
    .split("\0")
    .filter((path) => path && existsSync(path));
};

const readManifests = (): Map<string, WorkspaceManifest> => {
  const manifests = new Map<string, WorkspaceManifest>();
  for (const path of sourceFiles("packages")) {
    const name = MANIFEST.exec(path)?.[1];
    if (name) manifests.set(name, JSON.parse(readFileSync(path, "utf8")));
  }
  return manifests;
};

const checkArchitecture = async (): Promise<boolean> => {
  const files = sourceFiles("packages", "scripts").filter((path) =>
    SOURCE_FILE.test(path),
  );
  const { output: graph } = await cruise(files, CRUISE_OPTIONS);
  if (typeof graph === "string") {
    throw new Error("dependency-cruiser returned a report, not a graph");
  }
  const report = await format(graph, { outputType: "err" });
  const graphViolations = findGraphViolations(graph.modules, readManifests());
  if (typeof report.output === "string") console.log(report.output.trim());
  for (const violation of graphViolations) {
    console.error(`error architecture-graph: ${violation}`);
  }
  return report.exitCode === 0 && graphViolations.length === 0;
};

if (import.meta.main) {
  // Both Git and dependency-cruiser report paths relative to this checkout.
  // A caller running in a Git hook can also export its own index and worktree.
  for (const name of execFileSync("git", ["rev-parse", "--local-env-vars"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")) {
    delete gitEnvironment[name];
  }
  process.chdir(resolve(import.meta.dirname, "../.."));
  if (!(await checkArchitecture())) process.exitCode = 1;
}
