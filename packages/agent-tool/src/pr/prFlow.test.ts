import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const rootDir = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
let fixture: string;

beforeEach(() => {
  fixture = mkdtempSync(path.join(tmpdir(), "agent-tool-pr-flow-"));
  execFileSync("git", ["init", "-q", "-b", "feature"], { cwd: fixture });
  copyFileSync(
    path.join(rootDir, "commitlint.config.mjs"),
    path.join(fixture, "commitlint.config.mjs"),
  );
  symlinkSync(
    path.join(rootDir, "node_modules"),
    path.join(fixture, "node_modules"),
  );
  writeFileSync(path.join(fixture, "package.json"), '{"type":"module"}');
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "--allow-empty",
      "-qm",
      "feat: example",
    ],
    { cwd: fixture },
  );
  // Only this stub can be called: it never contacts GitHub or modifies a PR.
  writeFileSync(
    path.join(fixture, "gh"),
    `#!${process.execPath}
import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const scenario = process.env.PR_SCENARIO;
const reply = value => console.log(JSON.stringify(value));
if (args[0] === "repo" && args[1] === "view") {
  reply({nameWithOwner:"owner/repo", defaultBranchRef:{name:"production"}});
} else if (args[0] === "pr" && args[1] === "list") {
  reply([]);
} else if (args[0] === "pr" && args[1] === "create") {
  writeFileSync("created.json", JSON.stringify({args, body:readFileSync(0,"utf8")}));
  console.log("https://github.com/owner/repo/pull/12");
} else if (args[0] === "pr" && args[1] === "view") {
  if (scenario === "missing") {
    console.error('no pull requests found for branch "feature"');
    process.exitCode = 1;
  } else if (args.includes("state")) {
    reply({state: scenario === "unmerged" ? "OPEN" : "MERGED"});
  } else {
    reply({number:12, state:"OPEN", title:"feat: example", baseRefName:"production", url:"https://github.com/owner/repo/pull/12"});
  }
} else if (args[0] === "api" && args[1] === "graphql") {
  if (args.some(arg => arg.includes("mutation("))) {
    writeFileSync("mutation.json", JSON.stringify(args));
    reply({data:{mergePullRequest:{pullRequest:{state:"MERGED"}}}});
  } else {
    reply({data:{repository:{pullRequest:{id:"PR_test", headRefOid:"abc123", baseRefName:scenario === "retargeted" ? "staging" : "production", state:"OPEN", autoMergeRequest:null, isInMergeQueue:false}}}});
  }
} else {
  console.error("Unexpected gh invocation", args);
  process.exitCode = 1;
}
`,
  );
  chmodSync(path.join(fixture, "gh"), 0o755);
});

afterEach(() => rmSync(fixture, { recursive: true, force: true }));

function invoke(scenario: string, args: string[], body = "") {
  return spawnSync(
    process.execPath,
    [
      "--import",
      import.meta.resolve("tsx"),
      path.join(rootDir, "packages/agent-tool/src/index.ts"),
      ...args,
    ],
    {
      cwd: fixture,
      env: {
        ...process.env,
        PATH: `${fixture}${path.delimiter}${process.env.PATH}`,
        PR_SCENARIO: scenario,
      },
      input: body,
      encoding: "utf8",
    },
  );
}

describe("PR CLI flows", () => {
  test("merges with the reviewed SHA, an empty body, and the PR suffix", () => {
    const result = invoke("merged", [
      "squashMerge",
      "",
      "reviewed123",
      "production",
    ]);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    const mutation = JSON.parse(
      readFileSync(path.join(fixture, "mutation.json"), "utf8"),
    );
    expect(mutation).toContain("expectedHeadOid=reviewed123");
    expect(mutation).toContain("commitBody=");
    expect(mutation).toContain("commitHeadline=feat: example (#12)");
  });

  test.each(["missing", "retargeted"])(
    "refuses a %s PR before sending a merge",
    (scenario) => {
      const result = invoke(scenario, [
        "squashMerge",
        "",
        "reviewed123",
        "production",
      ]);
      expect(result.status).toBe(1);
      expect(existsSync(path.join(fixture, "mutation.json"))).toBe(false);
    },
  );

  test("does not report success if GitHub still reports OPEN after mutation", () => {
    const result = invoke("unmerged", [
      "squashMerge",
      "",
      "reviewed123",
      "production",
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("is not merged");
  });

  test("creates a PR with literal multiline stdin and an explicit base", () => {
    const body = "First line\n\nLiteral `code` and $(no-shell-expansion).\n";
    const result = invoke("missing", ["openPr", "feat: example"], body);
    expect(result.status).toBe(0);
    const created = JSON.parse(
      readFileSync(path.join(fixture, "created.json"), "utf8"),
    );
    expect(created.body).toBe(body);
    expect(created.args).toContain("--body-file");
    expect(created.args).toContain("production");
  });
});
