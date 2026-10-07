import { expect, test } from "bun:test";
import { file } from "bun";
import {
  checkConfiguration,
  checkDomain,
  checkPublicEndpoints,
  checkRoutes,
  checkSettings,
  DEPLOYMENTS,
  type DeploymentName,
  deploymentConfiguration,
  runDeployment,
} from "./deployPolicy";

for (const name of Object.keys(DEPLOYMENTS) as DeploymentName[]) {
  test(`${name}: validates the real config and requires its existing domain`, async () => {
    const target = DEPLOYMENTS[name];
    const text = await file(
      new URL(`../packages/${target.package}/wrangler.jsonc`, import.meta.url),
    ).text();
    expect(checkConfiguration(text, name)).toBe(
      target.package === "website" ? "./dist" : "./out",
    );
    expect(
      checkDomain(
        [
          {
            id: "existing-domain",
            zone_id: "existing-zone",
            service: target.worker,
            hostname: target.hostname,
          },
        ],
        name,
      ),
    ).toBe("existing-zone");
    expect(() => checkDomain([], name)).toThrow();
    expect(() =>
      checkDomain(
        [
          {
            id: "existing-domain",
            zone_id: "existing-zone",
            service: "other-worker",
            hostname: target.hostname,
          },
        ],
        name,
      ),
    ).toThrow();
    expect(() => checkRoutes([{ script: target.worker }], name)).toThrow();
    expect(() => checkRoutes([], name)).not.toThrow();
  });
}

test("resource migrations, renames and unknown build commands fail closed", async () => {
  const text = await file(
    new URL("../packages/experiment/wrangler.jsonc", import.meta.url),
  ).text();
  for (const addition of [
    '"d1_databases": []',
    '"migrations": []',
    '"routes": []',
    '"build": {"command":"terraform apply"}',
  ]) {
    expect(() =>
      checkConfiguration(
        text.replace(
          '"name": "experiment",',
          `"name": "experiment", ${addition},`,
        ),
        "experiment",
      ),
    ).toThrow();
  }
  expect(() =>
    checkConfiguration(
      text.replace('"name": "experiment"', '"name": "new-worker"'),
      "experiment",
    ),
  ).toThrow();
});

test("missing bindings and existing stateful bindings cannot be cleared", () => {
  for (const settings of [{}, { bindings: [{ name: "DB", type: "d1" }] }])
    expect(() => checkSettings(settings)).toThrow();
  expect(() =>
    checkSettings({ bindings: [], compatibility_date: "2026-09-16" }),
  ).not.toThrow();
});

test("a website preview captures the real assets without rerunning its build", async () => {
  const text = await file(
    new URL("../packages/website/wrangler.jsonc", import.meta.url),
  ).text();
  const config = JSON.parse(
    deploymentConfiguration(text, "website", "/fixture/website"),
  );
  expect(config.name).toBe("resume-redirect");
  expect(config.assets.directory).toBe("/fixture/website/dist");
  expect(config.build).toBeUndefined();
  expect(config.$schema).toBeUndefined();
  expect(() =>
    deploymentConfiguration(
      text.replace('"bun run build"', '"terraform apply"'),
      "website",
      "/fixture/website",
    ),
  ).toThrow();
});

test("live public endpoints and schedules must match the static-only config", () => {
  expect(() =>
    checkPublicEndpoints({ enabled: false, previews_enabled: false }, []),
  ).not.toThrow();
  for (const value of [
    {},
    { enabled: true, previews_enabled: false },
    { enabled: false, previews_enabled: true },
  ]) {
    expect(() => checkPublicEndpoints(value, [])).toThrow();
  }
  expect(() =>
    checkPublicEndpoints({ enabled: false, previews_enabled: false }, [
      { cron: "* * * * *" },
    ]),
  ).toThrow();
  for (const addition of [
    { migration_tag: "v1" },
    { logpush: true },
    { tail_consumers: [{}] },
    { observability: { enabled: true } },
  ]) {
    expect(() =>
      checkSettings({
        bindings: [],
        compatibility_date: "2026-09-16",
        ...addition,
      }),
    ).toThrow();
  }
});

function checks() {
  const calls: string[] = [];
  return {
    calls,
    snapshot: async () => {
      calls.push("snapshot");
      return "committed-config-assets-tool";
    },
    inspect: async () => {
      calls.push("inspect");
      return "existing-domain-worker-version";
    },
    preview: async () => {
      calls.push("preview");
    },
    apply: async () => {
      calls.push("apply");
    },
  };
}

test("preview-only checks fresh evidence and performs no mutation", async () => {
  const run = checks();
  await runDeployment(run, true);
  expect(run.calls).toEqual([
    "snapshot",
    "inspect",
    "preview",
    "snapshot",
    "inspect",
  ]);
});

test("a deployment mutates only after preview and fresh local/remote checks", async () => {
  const run = checks();
  await runDeployment(run, false);
  expect(run.calls).toEqual([
    "snapshot",
    "inspect",
    "preview",
    "snapshot",
    "inspect",
    "apply",
  ]);
});

test("failed preview or changed local/remote evidence prevents mutation", async () => {
  const failed = checks();
  failed.preview = async () => {
    throw new Error("Preview failed");
  };
  await expect(runDeployment(failed, false)).rejects.toThrow();
  expect(failed.calls).not.toContain("apply");
  for (const field of ["snapshot", "inspect"] as const) {
    const run = checks();
    let count = 0;
    run[field] = async () => {
      return ++count === 1 ? "before" : "changed";
    };
    await expect(runDeployment(run, false)).rejects.toThrow();
    expect(run.calls).not.toContain("apply");
  }
});

test("all owned deploy entrypoints use the guard", async () => {
  for (const folder of ["resume", "website", "experiment"]) {
    const manifest = await file(
      new URL(`../packages/${folder}/package.json`, import.meta.url),
    ).json();
    for (const [name, command] of Object.entries(manifest.scripts)) {
      if (name.startsWith("deploy"))
        expect(command).toContain("scripts/deploy.ts");
    }
  }
  const workflow = await file(
    new URL("../.github/workflows/main.yml", import.meta.url),
  ).text();
  expect(workflow).not.toContain("wrangler deploy");
  for (const target of Object.keys(DEPLOYMENTS))
    expect(workflow).toContain(`scripts/deploy.ts ${target}`);
});
