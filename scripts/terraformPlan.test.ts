import { expect, test } from "bun:test";
import {
  checkTerraformBackend,
  checkTerraformHcl,
  checkTerraformPlan,
  checkTerraformState,
} from "./terraformPlan";

const plan = (actions: string[]) => ({
  format_version: "1.2",
  complete: true,
  errored: false,
  resource_changes: [{ change: { actions } }],
});

test("accepts complete saved plans with only supported non-destructive actions", () => {
  for (const action of ["no-op", "create", "read", "update"])
    expect(() => checkTerraformPlan(plan([action]))).not.toThrow();
});

test("rejects deletion, either replacement order and unknown effects", () => {
  for (const actions of [
    ["delete"],
    ["create", "delete"],
    ["delete", "create"],
    ["forget"],
    [],
  ]) {
    expect(() => checkTerraformPlan(plan(actions))).toThrow();
  }
});

test("rejects unsupported, incomplete, errored, deferred and failed-check evidence", () => {
  for (const change of [
    { format_version: "1.3" },
    { complete: false },
    { complete: undefined },
    { errored: true },
    { resource_changes: undefined },
    { deferred_changes: [{}] },
    { checks: [{ status: "unknown" }] },
    { action_invocations: [{}] },
    { resource_drift: [{ change: { actions: ["delete"] } }] },
  ]) {
    expect(() =>
      checkTerraformPlan({ ...plan(["update"]), ...change }),
    ).toThrow();
  }
});

test("requires the initialized R2 state backend rather than local or substituted state", () => {
  const r2 =
    "https://0be508e6c4caa573595c5f94e11900e4.r2.cloudflarestorage.com";
  // The shape Terraform writes to .terraform/terraform.tfstate after init.
  const backend = {
    type: "s3",
    config: {
      bucket: "a2f0-net-terraform-state",
      key: "terraform.tfstate",
      region: "auto",
      endpoint: null,
      endpoints: { dynamodb: null, iam: null, s3: r2, sso: null, sts: null },
      insecure: null,
      use_lockfile: true,
      use_path_style: true,
    },
  };
  expect(() => checkTerraformBackend({ backend })).not.toThrow();
  const { endpoints } = backend.config;
  for (const change of [
    { type: "local" },
    { config: { ...backend.config, bucket: "empty-test" } },
    { config: { ...backend.config, key: "other.tfstate" } },
    { config: { ...backend.config, region: "us-east-1" } },
    { config: { ...backend.config, endpoints: null } },
    { config: { ...backend.config, endpoints: {} } },
    {
      config: {
        ...backend.config,
        endpoints: { ...endpoints, s3: "https://example.invalid" },
      },
    },
    {
      config: {
        ...backend.config,
        endpoints: { ...endpoints, sts: "https://example.invalid" },
      },
    },
    { config: { ...backend.config, endpoint: "https://example.invalid" } },
    { config: { ...backend.config, sts_endpoint: "https://example.invalid" } },
    { config: { ...backend.config, use_lockfile: null } },
    { config: { ...backend.config, use_path_style: false } },
    { config: { ...backend.config, insecure: true } },
    {
      config: {
        bucket: "resume-terraform",
        key: "resume/terraform.tfstate",
        region: "us-east-1",
      },
    },
  ])
    expect(() =>
      checkTerraformBackend({ backend: { ...backend, ...change } }),
    ).toThrow();
});

test("HCL source scan sees unsafe blocks across all comment forms", () => {
  for (const separator of [
    " ",
    " /* comment */ ",
    " # comment\n ",
    " // comment\n ",
  ]) {
    expect(() =>
      checkTerraformHcl(`provisioner${separator}"local-exec" {}`),
    ).toThrow();
    expect(() =>
      checkTerraformHcl(`data${separator}"external" "unsafe" {}`),
    ).toThrow();
  }
  expect(() =>
    checkTerraformHcl(String.raw`data "\u0065xternal" "unsafe" {}`),
  ).toThrow();
  expect(() =>
    checkTerraformHcl(
      'resource "example" "safe" { value = "provisioner \\"local-exec\\"" }',
    ),
  ).not.toThrow();
  expect(() =>
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Terraform interpolation.
    checkTerraformHcl('output "safe" { value = "${resource.example.id}" }'),
  ).not.toThrow();
  expect(() =>
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Terraform interpolation.
    checkTerraformHcl('output "unsafe" { value = "${jsonencode("x")}" }'),
  ).toThrow();
  expect(() =>
    checkTerraformHcl('# data "external"\nresource "safe" "ok" {}'),
  ).not.toThrow();
  expect(() => checkTerraformHcl("data /* unterminated")).toThrow();
  expect(() => checkTerraformHcl("value = <<EOF\ntext\nEOF")).toThrow();
});

const account = "a".repeat(32);

/** A custom-domain resource as remote state records it. */
const domainResource = (name: string, hostname: string, service: string) => ({
  mode: "managed",
  type: "cloudflare_workers_custom_domain",
  name,
  instances: [
    {
      attributes: {
        id: `fixture-${name}`,
        account_id: account,
        hostname,
        service,
      },
    },
  ],
});

const domainResources = [
  domainResource("website", "a2f0.net", "resume-redirect"),
  domainResource("resume", "resume.a2f0.net", "resume-prod"),
  domainResource("staging", "staging.a2f0.net", "resume-staging"),
  domainResource("demo", "demo.a2f0.net", "demo"),
  domainResource("nc", "nc.a2f0.net", "nc"),
  domainResource("dnbm", "dnbm.a2f0.net", "dnbm"),
];

const domainState = <T>(resources: T[]) => ({
  version: 4,
  serial: 1,
  lineage: "00000000-0000-0000-0000-000000000001",
  resources,
});

const noMigration = { adding: [], retiring: {} };
const migration = {
  adding: ["demo"],
  retiring: {
    experiment: ["experiment.a2f0.net", "experiment"] as const,
  },
};
const experiment = domainResource(
  "experiment",
  "experiment.a2f0.net",
  "experiment",
);

test("empty or missing domain state cannot pass as an existing production stack", () => {
  const resources = domainResources;
  const state = domainState(resources);
  expect(() => checkTerraformState(state, account)).not.toThrow();
  expect(() => checkTerraformState(state, account, noMigration)).not.toThrow();
  expect(() => checkTerraformState(state, "b".repeat(32))).toThrow();
  const wrongDomain = structuredClone(state);
  wrongDomain.resources[0].instances[0].attributes.hostname = "other.example";
  expect(() => checkTerraformState(wrongDomain, account)).toThrow();
  for (const change of [
    { resources: [] },
    { lineage: "" },
    { resources: resources.slice(1) },
    { serial: -1 },
  ]) {
    expect(() =>
      checkTerraformState({ ...state, ...change }, account),
    ).toThrow();
  }
});

test("a reviewed domain migration lets its domains be absent but never misidentified", () => {
  const before = domainState([
    ...domainResources.filter(({ name }) => name !== "demo"),
    experiment,
  ]);
  expect(() => checkTerraformState(before, account, migration)).not.toThrow();
  expect(() => checkTerraformState(before, account, noMigration)).toThrow();
  const after = domainState(domainResources);
  expect(() => checkTerraformState(after, account, migration)).not.toThrow();
  const misidentified = [
    domainState([
      ...domainResources,
      domainResource("experiment", "experiment.a2f0.net", "other"),
    ]),
    domainState([
      ...domainResources.filter(({ name }) => name !== "demo"),
      domainResource("demo", "demo.a2f0.net", "other"),
    ]),
  ];
  for (const state of misidentified)
    expect(() => checkTerraformState(state, account, migration)).toThrow();
});

test("a reviewed domain migration deletes only the domain it retires", () => {
  const deletion = (change: Record<string, unknown> = {}) => ({
    format_version: "1.2",
    complete: true,
    errored: false,
    resource_changes: [
      {
        address: "cloudflare_workers_custom_domain.experiment",
        mode: "managed",
        type: "cloudflare_workers_custom_domain",
        name: "experiment",
        change: {
          actions: ["delete"],
          before: { hostname: "experiment.a2f0.net", service: "experiment" },
          after: null,
        },
        ...change,
      },
    ],
  });
  expect(() => checkTerraformPlan(deletion(), migration)).not.toThrow();
  expect(() => checkTerraformPlan(deletion(), noMigration)).toThrow();
  for (const change of [
    { name: "website", address: "cloudflare_workers_custom_domain.website" },
    { address: 'cloudflare_workers_custom_domain.experiment["x"]' },
    { type: "cloudflare_dns_record" },
    {
      change: {
        actions: ["delete"],
        before: { hostname: "a2f0.net", service: "experiment" },
        after: null,
      },
    },
    {
      change: {
        actions: ["delete", "create"],
        before: { hostname: "experiment.a2f0.net", service: "experiment" },
        after: { hostname: "experiment.a2f0.net", service: "experiment" },
      },
    },
    { change: { actions: ["delete"], before: null, after: null } },
  ]) {
    expect(() => checkTerraformPlan(deletion(change), migration)).toThrow();
  }
  // Drift is never a reviewed deletion.
  const drift = deletion();
  expect(() =>
    checkTerraformPlan(
      {
        ...drift,
        resource_changes: [],
        resource_drift: drift.resource_changes,
      },
      migration,
    ),
  ).toThrow();
});
