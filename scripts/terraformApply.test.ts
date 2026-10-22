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
test("Terraform entrypoint inspects saved plans and refuses unattended apply", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-terraform-test-"));
  const folder = resolve(directory, "terraform");
  const binaries = resolve(directory, "bin");
  const log = resolve(directory, "calls");
  const guard = resolve(import.meta.dir, "terraformPlan.ts");
  const realBun = process.execPath;
  await mkdir(folder);
  await mkdir(binaries);
  for (const script of ["apply.sh", "credentials.sh"])
    await copyFile(
      new URL(`../terraform/${script}`, import.meta.url),
      resolve(folder, script),
    );
  // Fixture R2 state key in the .secrets layout; shared.env loads first, so
  // app.env's value wins and nothing else from the tier files is exported.
  const secrets = resolve(directory, ".secrets/prod");
  await mkdir(secrets, { recursive: true });
  await writeFile(
    resolve(secrets, "shared.env"),
    "TF_STATE_ACCESS_KEY_ID=shared-access\nFIXTURE_TIER_VALUE=unexported\n",
  );
  const appEnvironment = resolve(secrets, "app.env");
  const stateKey =
    "TF_STATE_ACCESS_KEY_ID=fixture-access\nTF_STATE_SECRET_ACCESS_KEY=fixture-secret\n";
  await writeFile(appEnvironment, stateKey);
  await writeFile(resolve(folder, "main.tf"), "# fixture only\n");
  const state = {
    version: 4,
    serial: 1,
    lineage: "00000000-0000-0000-0000-000000000001",
    resources: ["website", "resume", "staging", "demo", "nc", "dnbm"].map(
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
  // Terraform's inputs sit in the same tier under the names its tooling reads.
  const terraformInputs = [
    [
      "main.tfvars.json",
      JSON.stringify({ cloudflare_account_id: "a".repeat(32) }),
    ],
    ["google-credentials.json", "{}\n"],
  ] as const;
  for (const [name, contents] of terraformInputs)
    await writeFile(resolve(secrets, name), contents);
  const bun = resolve(binaries, "bun");
  await writeFile(bun, '#!/bin/sh\nshift\nexec "$REAL_BUN" "$GUARD" "$@"\n');
  await chmod(bun, 0o755);
  const terraform = resolve(binaries, "terraform");
  await writeFile(
    terraform,
    `#!/bin/sh
set -eu
[ "$AWS_IGNORE_CONFIGURED_ENDPOINT_URLS" = true ] || exit 9
[ "$AWS_ACCESS_KEY_ID" = fixture-access ] || exit 9
[ "$AWS_SECRET_ACCESS_KEY" = fixture-secret ] || exit 9
[ -z "\${AWS_PROFILE+set}\${AWS_SESSION_TOKEN+set}" ] || exit 9
[ -z "\${TF_STATE_ACCESS_KEY_ID+set}\${FIXTURE_TIER_VALUE+set}" ] || exit 9
printf '%s\\n' "$*" >> "$CALLS"
case "$1" in
  workspace) echo default ;;
  version) echo '{"terraform_version":"1.17.0"}' ;;
  state) cat "$FIXTURE/state.json" ;;
  plan) for argument in "$@"; do case "$argument" in -out=*) printf fixture > "\${argument#-out=}" ;; esac; done ;;
  show) cat "$FIXTURE/plan.json" ;;
  apply) [ -f "$3" ] ;;
  *) exit 9 ;;
esac
`,
  );
  await chmod(terraform, 0o755);
  const pseudoTerminal = `
import os, pty, subprocess, sys
master, slave = pty.openpty()
child = subprocess.Popen(sys.argv[1:], stdin=slave, stdout=slave, stderr=slave)
os.close(slave)
os.write(master, b"yes\\n")
while True:
    try:
        output = os.read(master, 4096)
    except OSError:
        break
    if not output:
        break
    os.write(1, output)
os.close(master)
sys.exit(child.wait())
`;
  await mkdir(resolve(folder, ".terraform"));
  await writeFile(
    resolve(folder, ".terraform/terraform.tfstate"),
    JSON.stringify({
      backend: {
        type: "s3",
        config: {
          bucket: "a2f0-net-terraform-state",
          key: "terraform.tfstate",
          region: "auto",
          endpoints: {
            s3: "https://0be508e6c4caa573595c5f94e11900e4.r2.cloudflarestorage.com",
          },
          use_lockfile: true,
          use_path_style: true,
        },
      },
    }),
  );
  async function run(
    actions: string[],
    preview: boolean,
    extraEnvironment: Record<string, string> = {},
    interactive = false,
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
    const args = [
      "sh",
      resolve(folder, "apply.sh"),
      ...(preview ? ["--dry-run"] : []),
    ];
    const child = spawn(
      interactive ? ["python3", "-c", pseudoTerminal, ...args] : args,
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
          AWS_PROFILE: "ambient",
          AWS_SESSION_TOKEN: "ambient",
          AWS_ACCESS_KEY_ID: "ambient",
          AWS_SECRET_ACCESS_KEY: "ambient",
          TF_STATE_ACCESS_KEY_ID: "ambient",
          TF_STATE_SECRET_ACCESS_KEY: "ambient",
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
        (call) =>
          call.startsWith("plan ") &&
          call.includes("-refresh=true") &&
          call.includes("-var-file=../.secrets/prod/main.tfvars.json"),
      ),
    ).toBe(true);
    const inheritedArguments: Record<string, string>[] = [
      { TF_CLI_ARGS_plan: "-refresh=false" },
      { TF_CLI_ARGS: "-refresh=false" },
      { TF_DATA_DIR: "/alternate/backend" },
      { TF_WORKSPACE: "alternate" },
      { AWS_ENDPOINT_URL: "https://example.invalid" },
      { AWS_ENDPOINT_URL_S3: "https://example.invalid" },
      { AWS_S3_ENDPOINT: "https://example.invalid" },
    ];
    for (const inherited of inheritedArguments) {
      const refused = await run(["update"], false, inherited);
      expect(refused.status).not.toBe(0);
      expect(refused.calls).toEqual([""]);
    }
    for (const contents of [
      null,
      "TF_STATE_ACCESS_KEY_ID=fixture-access\n",
      "TF_STATE_ACCESS_KEY_ID=fixture-access\nTF_STATE_SECRET_ACCESS_KEY=\n",
    ]) {
      if (contents === null) await rm(appEnvironment);
      else await writeFile(appEnvironment, contents);
      const missing = await run(["update"], true);
      expect(missing.status).not.toBe(0);
      expect(missing.output).toContain(".secrets/prod/app.env");
      expect(missing.calls).toEqual([""]);
    }
    await writeFile(appEnvironment, stateKey);
    for (const [name, contents] of terraformInputs) {
      await rm(resolve(secrets, name));
      const missing = await run(["update"], true);
      expect(missing.status).not.toBe(0);
      expect(missing.output).toContain(`Missing .secrets/prod/${name}`);
      expect(missing.calls).toEqual([""]);
      await writeFile(resolve(secrets, name), contents);
    }
    const mutation = await run(["update"], false);
    expect(mutation.status).not.toBe(0);
    expect(mutation.output).toContain("requires an interactive terminal");
    expect(mutation.calls.some((call) => call.startsWith("plan "))).toBe(true);
    expect(mutation.calls.some((call) => call.startsWith("apply "))).toBe(
      false,
    );
    expect(mutation.calls.filter((call) => call === "state pull")).toHaveLength(
      2,
    );
    const approved = await run(["update"], false, {}, true);
    expect(approved.status).toBe(0);
    expect(
      approved.calls.some((call) => call.startsWith("show -no-color ")),
    ).toBe(true);
    const saved = approved.calls
      .find((call) => call.startsWith("plan "))
      ?.split("-out=")[1];
    expect(saved).toBeDefined();
    expect(approved.calls.at(-1)).toBe(`apply -input=false ${saved}`);
    expect(approved.calls.filter((call) => call === "state pull")).toHaveLength(
      3,
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
      [
        "commented.tf",
        'resource "null_resource" "unsafe" { provisioner /* ignored */ "local-exec" { command = "true" } }',
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

// Command fixtures: an injected Terraform records its arguments and checks the
// environment, so init and upgrade never reach the real backend here.
test("init and upgrade entrypoints give Terraform only the R2 state key", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-terraform-init-"));
  const folder = resolve(directory, "terraform");
  const binaries = resolve(directory, "bin");
  const log = resolve(directory, "calls");
  await mkdir(folder);
  await mkdir(binaries);
  for (const script of ["init.sh", "upgrade.sh", "credentials.sh"])
    await copyFile(
      new URL(`../terraform/${script}`, import.meta.url),
      resolve(folder, script),
    );
  const terraform = resolve(binaries, "terraform");
  await writeFile(
    terraform,
    `#!/bin/sh
set -eu
[ -f credentials.sh ] || exit 9
[ "$AWS_ACCESS_KEY_ID" = fixture-access ] || exit 9
[ "$AWS_SECRET_ACCESS_KEY" = fixture-secret ] || exit 9
[ -z "\${AWS_PROFILE+set}\${AWS_SESSION_TOKEN+set}\${TF_STATE_ACCESS_KEY_ID+set}" ] || exit 9
printf '%s\\n' "$*" >> "$CALLS"
`,
  );
  await chmod(terraform, 0o755);
  async function run(script: string, ...args: string[]) {
    await writeFile(log, "");
    const child = spawn(["sh", resolve(folder, script), ...args], {
      cwd: directory,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PATH: `${binaries}:${process.env.PATH}`,
        CALLS: log,
        AWS_PROFILE: "ambient",
        AWS_SESSION_TOKEN: "ambient",
        TF_STATE_ACCESS_KEY_ID: "ambient",
      },
    });
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
    for (const script of ["init.sh", "upgrade.sh"]) {
      const missing = await run(script);
      expect(missing.status).not.toBe(0);
      expect(missing.output).toContain(".secrets/prod/app.env");
      expect(missing.calls).toEqual([""]);
    }
    await mkdir(resolve(directory, ".secrets/prod"), { recursive: true });
    await writeFile(
      resolve(directory, ".secrets/prod/app.env"),
      "TF_STATE_ACCESS_KEY_ID=fixture-access\nTF_STATE_SECRET_ACCESS_KEY=fixture-secret\n",
    );
    const init = await run("init.sh", "-reconfigure");
    expect(init.status).toBe(0);
    expect(init.calls).toEqual(["init -reconfigure"]);
    const upgrade = await run("upgrade.sh");
    expect(upgrade.status).toBe(0);
    expect(upgrade.calls).toEqual(["init -upgrade"]);
  } finally {
    await rm(directory, { recursive: true });
  }
}, 60_000);
