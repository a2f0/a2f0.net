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

test("empty or missing domain state cannot pass as an existing production stack", () => {
  const resources = [
    "website",
    "resume",
    "staging",
    "experiment",
    "nc",
    "dnbm",
  ].map((name) => ({
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
  }));
  const state = {
    version: 4,
    serial: 1,
    lineage: "00000000-0000-0000-0000-000000000001",
    resources,
  };
  expect(() => checkTerraformState(state, "a".repeat(32))).not.toThrow();
  expect(() => checkTerraformState(state, "b".repeat(32))).toThrow();
  const wrongDomain = structuredClone(state);
  wrongDomain.resources[0].instances[0].attributes.hostname = "other.example";
  expect(() => checkTerraformState(wrongDomain, "a".repeat(32))).toThrow();
  for (const change of [
    { resources: [] },
    { lineage: "" },
    { resources: resources.slice(1) },
    { serial: -1 },
  ]) {
    expect(() =>
      checkTerraformState({ ...state, ...change }, "a".repeat(32)),
    ).toThrow();
  }
});
