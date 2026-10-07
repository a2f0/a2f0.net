import { createHash } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { version as bunVersion, spawn } from "bun";
import {
  checkApiResult,
  checkConfiguration,
  checkDeployment,
  checkDomain,
  checkPublicEndpoints,
  checkSettings,
  DEPLOYMENTS,
  type DeploymentName,
  deploymentConfiguration,
  record,
  runDeployment,
} from "./deployPolicy";
import {
  checkToolVersions,
  digestAssets,
  fingerprintFile,
} from "./deploySnapshot";

const root = resolve(import.meta.dir, "..");

async function command(args: string[], cwd = root, env = process.env) {
  const child = spawn(args, { cwd, env, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, status] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (status !== 0)
    throw new Error(
      `Deployment command failed (${args[0]}, exit ${status}); inspect the command locally without publishing private output`,
    );
  void stderr;
  return stdout;
}

async function main() {
  const [name, mode, ...extra] = process.argv.slice(2);
  if (
    !name ||
    !Object.hasOwn(DEPLOYMENTS, name) ||
    (mode !== undefined && mode !== "--dry-run") ||
    extra.length
  ) {
    throw new Error(
      "Usage: bun scripts/deploy.ts <resume-staging|resume-prod|website|experiment> [--dry-run]",
    );
  }
  const target = name as DeploymentName;
  const specification = DEPLOYMENTS[target];
  const directory = resolve(root, "packages", specification.package);
  const executable = resolve(directory, "node_modules", ".bin", "wrangler");
  const toolDirectory = resolve(directory, "node_modules", "wrangler");
  const readRuntime = async () => {
    const rootManifest = record(
      JSON.parse(await readFile(resolve(root, "package.json"), "utf8")),
    );
    const manifest = record(
      JSON.parse(await readFile(resolve(directory, "package.json"), "utf8")),
    );
    const tool = record(
      JSON.parse(
        await readFile(resolve(toolDirectory, "package.json"), "utf8"),
      ),
    );
    const node = record(
      JSON.parse(
        await command([
          "node",
          "-p",
          "JSON.stringify({ version: process.versions.node, executable: process.execPath })",
        ]),
      ),
    );
    checkToolVersions(
      {
        bun: rootManifest.packageManager,
        node: record(rootManifest.engines).node,
        wrangler: record(manifest.devDependencies).wrangler,
      },
      { bun: bunVersion, node: node.version, wrangler: tool.version },
    );
    if (
      `v${node.version}` !==
        (await readFile(resolve(root, ".nvmrc"), "utf8")).trim() ||
      typeof node.executable !== "string"
    ) {
      throw new Error("Node does not match the repository runtime pin");
    }
    return realpath(node.executable);
  };
  const nodeExecutable = await readRuntime();
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Deployment runs directly and never through cached Turbo tasks.
  const token = process.env.CLOUDFLARE_API_TOKEN;
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Deployment runs directly and never through cached Turbo tasks.
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account || !/^[a-f0-9]{32}$/i.test(account))
    throw new Error(
      "Scoped Cloudflare credentials and the existing account ID are required",
    );
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: Deployment runs directly and never through cached Turbo tasks.
  if (process.env.CLOUDFLARE_ENV !== undefined)
    throw new Error(
      "Select the explicit guarded target without CLOUDFLARE_ENV",
    );
  const originalConfig = await readFile(
    resolve(directory, "wrangler.jsonc"),
    "utf8",
  );
  const capturedConfig = deploymentConfiguration(
    originalConfig,
    target,
    directory,
  );
  // The website's Wrangler custom build only replaces generated local dist/.
  // Build before snapshotting so the preview and the mutation use the same assets.
  if (target === "website") {
    const buildEnvironment = { ...process.env };
    for (const key of [
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_KEY",
      "CLOUDFLARE_EMAIL",
    ])
      delete buildEnvironment[key];
    await command(["bun", "run", "build"], directory, buildEnvironment);
  }
  const api = async (path: string, completeList = true) => {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/${path}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!response.ok)
      throw new Error(`Cloudflare identity read failed (${response.status})`);
    return checkApiResult(await response.json(), completeList);
  };
  const inspect = async () => {
    const path = `accounts/${account}/workers/scripts/${specification.worker}`;
    const [settings, domains, deployments, subdomain, schedules] =
      await Promise.all([
        api(`${path}/settings`),
        api(`accounts/${account}/workers/domains`),
        api(`${path}/deployments`, false),
        api(`${path}/subdomain`),
        api(`${path}/schedules`),
      ]);
    checkSettings(settings);
    checkPublicEndpoints(subdomain, schedules);
    checkDomain(domains, target);
    // The validated Wrangler config has no route/routes and workers_dev=false.
    // Cloudflare documents that this preserves dashboard-managed routes on deploy.
    checkDeployment(deployments);
    // Fingerprints never expose binding or account response contents.
    return createHash("sha256")
      .update(
        JSON.stringify({
          account,
          settings,
          domains,
          deployments,
          subdomain,
          schedules,
        }),
      )
      .digest("hex");
  };
  const temporary = await mkdtemp(resolve(tmpdir(), "a2f0-deploy-"));
  const configPath = resolve(temporary, "wrangler.json");
  await writeFile(configPath, capturedConfig, { mode: 0o600 });
  const snapshot = async () => {
    if (
      (
        await command([
          "git",
          "status",
          "--porcelain",
          "--untracked-files=normal",
        ])
      ).trim()
    )
      throw new Error("Deploy only a committed, clean worktree");
    if ((await readRuntime()) !== nodeExecutable)
      throw new Error("Node executable changed during preview");
    const config = await readFile(resolve(directory, "wrangler.jsonc"), "utf8");
    if (
      config !== originalConfig ||
      (await readFile(configPath, "utf8")) !== capturedConfig
    )
      throw new Error("Captured configuration changed");
    const assets = checkConfiguration(config, target);
    const hash = createHash("sha256")
      .update(await command(["git", "rev-parse", "HEAD"]))
      .update(config);
    for (const path of [
      "package.json",
      "bun.lock",
      `packages/${specification.package}/package.json`,
      `packages/${specification.package}/node_modules/wrangler/package.json`,
    ]) {
      hash.update(await readFile(resolve(root, path)));
    }
    for (const path of [
      process.execPath,
      nodeExecutable,
      executable,
      resolve(toolDirectory, "wrangler-dist", "cli.js"),
    ]) {
      hash.update(await fingerprintFile(path));
    }
    hash.update(await digestAssets(resolve(directory, assets)));
    return hash.digest("hex");
  };
  const wranglerEnvironment = {
    ...process.env,
    WRANGLER_SEND_METRICS: "false",
    WRANGLER_LOG_PATH: resolve(temporary, "logs"),
  };
  const args = [
    nodeExecutable,
    executable,
    "deploy",
    "--config",
    configPath,
    ...(specification.environment ? ["--env", specification.environment] : []),
  ];
  try {
    await runDeployment(
      {
        snapshot,
        inspect,
        preview: async () => {
          await command([...args, "--dry-run"], directory, wranglerEnvironment);
        },
        apply: async () => {
          await command(args, directory, wranglerEnvironment);
        },
      },
      mode === "--dry-run",
    );
  } finally {
    await rm(temporary, { recursive: true });
  }
  console.log(
    mode === "--dry-run"
      ? "Deployment preview and existing identities verified"
      : "Previewed deployment completed",
  );
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Deployment stopped",
    );
    process.exitCode = 1;
  });
}
