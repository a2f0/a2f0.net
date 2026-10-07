import { expect, test } from "bun:test";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "bun";

// These are command fixtures, never production backend/plan evidence. The
// injected Terraform records calls and the real read-only Bun guard validates
// fixture JSON, so an unsafe plan cannot reach even the injected apply.
test("Terraform entrypoint previews before applying the exact saved plan and fails closed", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-terraform-test-"));
  const folder = resolve(directory, "terraform");
  const binaries = resolve(directory, "bin");
  const log = resolve(directory, "calls");
  const guard = resolve(import.meta.dir, "terraformPlan.ts");
  const realBun = process.execPath;
  await mkdir(folder);
  await mkdir(binaries);
  await copyFile(
    new URL("../terraform/apply.sh", import.meta.url),
    resolve(folder, "apply.sh"),
  );
  await writeFile(resolve(folder, "main.tf"), "# fixture only\n");
  const state = {
    version: 4,
    serial: 1,
    lineage: "00000000-0000-0000-0000-000000000001",
    resources: ["website", "resume", "staging", "experiment", "nc", "dnbm"].map(
      (name) => ({
        mode: "managed",
        type: "cloudflare_workers_custom_domain",
        name,
        instances: [
          {
            attributes: {
              id: `fixture-${name}`,
              account_id: "a".repeat(32),
              hostname: name === "website" ? "a2f0.net" : `${name}.a2f0.net`,
              service:
                name === "website"
                  ? "resume-redirect"
                  : name === "resume"
                    ? "resume-prod"
                    : name === "staging"
                      ? "resume-staging"
                      : name,
            },
          },
        ],
      }),
    ),
  };
  await writeFile(resolve(directory, "state.json"), JSON.stringify(state));
  await writeFile(
    resolve(folder, "main.tfvars.json"),
    JSON.stringify({ cloudflare_account_id: "a".repeat(32) }),
  );
  const bun = resolve(binaries, "bun");
  await writeFile(bun, '#!/bin/sh\nshift\nexec "$REAL_BUN" "$GUARD" "$@"\n');
  await chmod(bun, 0o755);
  const terraform = resolve(binaries, "terraform");
  await writeFile(
    terraform,
    `#!/bin/sh
set -eu
printf '%s\\n' "$*" >> "$CALLS"
case "$1" in
  workspace) echo default ;;
  version) echo '{"terraform_version":"1.16.2"}' ;;
  state) cat "$FIXTURE/state.json" ;;
  plan) for argument in "$@"; do case "$argument" in -out=*) printf fixture > "\${argument#-out=}" ;; esac; done ;;
  show) cat "$FIXTURE/plan.json" ;;
  apply) [ -f "$3" ] ;;
  *) exit 9 ;;
esac
`,
  );
  await chmod(terraform, 0o755);
  await mkdir(resolve(folder, ".terraform"));
  await writeFile(
    resolve(folder, ".terraform/terraform.tfstate"),
    JSON.stringify({
      backend: {
        type: "s3",
        config: {
          bucket: "resume-terraform",
          key: "resume/terraform.tfstate",
          region: "us-east-1",
        },
      },
    }),
  );
  async function run(
    actions: string[],
    preview: boolean,
    extraEnvironment: Record<string, string> = {},
  ) {
    await writeFile(log, "");
    await writeFile(
      resolve(directory, "plan.json"),
      JSON.stringify({
        format_version: "1.2",
        complete: true,
        errored: false,
        resource_changes: [{ change: { actions } }],
      }),
    );
    const child = spawn(
      ["sh", resolve(folder, "apply.sh"), ...(preview ? ["--dry-run"] : [])],
      {
        cwd: directory,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          PATH: `${binaries}:${process.env.PATH}`,
          TMPDIR: directory,
          REAL_BUN: realBun,
          GUARD: guard,
          CALLS: log,
          FIXTURE: directory,
          ...extraEnvironment,
        },
      },
    );
    const [stdout, stderr, status] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return {
      status,
      output: stdout + stderr,
      calls: (await readFile(log, "utf8")).trim().split("\n"),
    };
  }
  try {
    const preview = await run(["update"], true);
    expect(preview.status).toBe(0);
    expect(preview.calls.some((call) => call.startsWith("apply"))).toBe(false);
    expect(
      preview.calls.some(
        (call) => call.startsWith("plan ") && call.includes("-refresh=true"),
      ),
    ).toBe(true);
    const inheritedArguments: Record<string, string>[] = [
      { TF_CLI_ARGS_plan: "-refresh=false" },
      { TF_CLI_ARGS: "-refresh=false" },
    ];
    for (const inherited of inheritedArguments) {
      const refused = await run(["update"], false, inherited);
      expect(refused.status).not.toBe(0);
      expect(refused.calls).toEqual([""]);
    }
    const mutation = await run(["update"], false);
    expect(mutation.status).toBe(0);
    const saved = mutation.calls
      .find((call) => call.startsWith("plan "))
      ?.split("-out=")[1];
    expect(saved).toBeDefined();
    expect(mutation.calls.at(-1)).toBe(`apply -input=false ${saved}`);
    expect(mutation.calls.filter((call) => call === "state pull")).toHaveLength(
      2,
    );
    for (const actions of [["delete"], ["delete", "create"]]) {
      const unsafe = await run(actions, false);
      expect(unsafe.status).not.toBe(0);
      expect(unsafe.calls.some((call) => call.startsWith("apply"))).toBe(false);
    }
    await writeFile(
      resolve(directory, "state.json"),
      JSON.stringify({ ...state, resources: [] }),
    );
    const empty = await run(["create"], false);
    expect(empty.status).not.toBe(0);
    expect(empty.calls.some((call) => call.startsWith("plan"))).toBe(false);
    await writeFile(resolve(directory, "state.json"), JSON.stringify(state));
    const unsafeSources: [string, string][] = [
      [
        "override.tf",
        'resource "null_resource" "unsafe" { provisioner "local-exec" { command = "true" } }',
      ],
      [
        "ignored.tf.json",
        JSON.stringify({
          data: { external: { unsafe: { program: ["true"] } } },
        }),
      ],
    ];
    for (const [name, source] of unsafeSources) {
      const sourcePath = resolve(folder, name);
      await writeFile(sourcePath, source);
      const unsafe = await run(["no-op"], false);
      expect(unsafe.status).not.toBe(0);
      expect(unsafe.calls.some((call) => call.startsWith("plan"))).toBe(false);
      await rm(sourcePath);
    }
  } finally {
    await rm(directory, { recursive: true });
  }
}, 60_000);
