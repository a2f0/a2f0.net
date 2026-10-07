import { file } from "bun";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { record } from "./deployPolicy";

/** Tokenize block heads while skipping HCL comments and quoted string bodies. */
export function checkTerraformHcl(source: string): void {
  let previous: string | null = null;
  for (let index = 0; index < source.length; ) {
    const character = source[index];
    const next = source[index + 1];
    if (/\s/.test(character)) {
      index++;
      continue;
    }
    if (character === "#" || (character === "/" && next === "/")) {
      index = source.indexOf("\n", index);
      if (index < 0) return;
      continue;
    }
    if (character === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) throw new Error("Unterminated Terraform block comment");
      index = end + 2;
      continue;
    }
    if (character === '"') {
      let end = index + 1;
      let interpolationDepth = 0;
      for (; end < source.length; end++) {
        if (source[end] === "\\" && interpolationDepth === 0) end++;
        else if (
          (source[end] === "$" || source[end] === "%") &&
          source[end + 1] === "{"
        ) {
          interpolationDepth++;
          end++;
        } else if (interpolationDepth > 0) {
          if (source[end] === "{") interpolationDepth++;
          else if (source[end] === "}") interpolationDepth--;
          else if (source[end] === '"')
            throw new Error(
              "Quoted Terraform template expressions require a separate review",
            );
        } else if (source[end] === '"') break;
      }
      if (end >= source.length)
        throw new Error("Unterminated Terraform string");
      if (previous === "provisioner")
        throw new Error("Unreviewed Terraform provisioner");
      if (previous === "data") {
        let label: unknown;
        try {
          label = JSON.parse(source.slice(index, end + 1));
        } catch {
          throw new Error("Unsupported Terraform data block label");
        }
        if (label === "external")
          throw new Error("Unreviewed Terraform external data program");
      }
      previous = null;
      index = end + 1;
      continue;
    }
    if (character === "<" && next === "<")
      throw new Error("Terraform heredoc source requires a separate review");
    const identifier = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(source.slice(index));
    if (identifier) {
      previous = identifier[0];
      index += identifier[0].length;
      continue;
    }
    previous = null;
    index++;
  }
}

/** Inspect every Terraform source, including ignored override files and modules. */
export async function checkTerraformSources(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "providers" && basename(directory) === ".terraform")
      continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error("Symlinked Terraform source requires a separate review");
    if (entry.isDirectory()) {
      await checkTerraformSources(path);
      continue;
    }
    if (!entry.isFile() || !/\.tf(?:\.json)?$/.test(entry.name)) continue;
    const source = await readFile(path, "utf8");
    if (entry.name.endsWith(".tf.json")) {
      const input: unknown = JSON.parse(source);
      const inspect = (value: unknown): boolean => {
        if (!value || typeof value !== "object") return false;
        if (Array.isArray(value)) return value.some(inspect);
        const object = value as Record<string, unknown>;
        if (Object.hasOwn(object, "provisioner")) return true;
        const data = object.data;
        if (
          data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          Object.hasOwn(data, "external")
        )
          return true;
        return Object.values(object).some(inspect);
      };
      if (inspect(input))
        throw new Error("Unreviewed Terraform provisioner or external data");
    } else checkTerraformHcl(source);
  }
}

/** Read-only guard; full real-backend freshness and provider effects remain caller checks. */
export function checkTerraformPlan(input: unknown) {
  const plan = record(input);
  if (
    plan.format_version !== "1.2" ||
    plan.complete !== true ||
    plan.errored !== false ||
    (plan.deferred_changes !== undefined &&
      (!Array.isArray(plan.deferred_changes) || plan.deferred_changes.length))
  ) {
    throw new Error("Terraform plan is unsupported, failed or incomplete");
  }
  // Terraform provider Actions and provisioners can hide effects outside the
  // resource action array. This repository owns neither; fail closed on them.
  if (
    plan.action_invocations !== undefined &&
    (!Array.isArray(plan.action_invocations) || plan.action_invocations.length)
  ) {
    throw new Error("Provider action effects require a separate review");
  }
  if (!Array.isArray(plan.resource_changes))
    throw new Error("Missing resource changes");
  const allowed = new Set(["no-op", "create", "read", "update"]);
  for (const field of ["resource_changes", "resource_drift"]) {
    const changes = plan[field] ?? [];
    if (!Array.isArray(changes)) throw new Error("Invalid resource evidence");
    for (const value of changes) {
      const resource = record(value);
      const change = record(resource.change);
      if (
        !Array.isArray(change.actions) ||
        change.actions.length !== 1 ||
        !allowed.has(change.actions[0])
      ) {
        throw new Error(
          "Resource deletion, replacement or unknown action refused",
        );
      }
    }
  }
  if (plan.checks !== undefined) {
    if (
      !Array.isArray(plan.checks) ||
      plan.checks.some((check) => record(check).status !== "pass")
    ) {
      throw new Error("Terraform checks did not all pass");
    }
  }
}

export function checkTerraformBackend(input: unknown) {
  const backend = record(record(input).backend);
  const configuration = record(backend.config);
  if (
    backend.type !== "s3" ||
    configuration.bucket !== "resume-terraform" ||
    configuration.key !== "resume/terraform.tfstate" ||
    configuration.region !== "us-east-1" ||
    configuration.insecure === true ||
    (configuration.endpoint !== undefined &&
      configuration.endpoint !== null &&
      configuration.endpoint !== "") ||
    (configuration.endpoints !== undefined && configuration.endpoints !== null)
  ) {
    throw new Error(
      "Initialize the existing production S3 backend before planning",
    );
  }
}

/** Require populated remote state for this existing stack before planning. */
export function checkTerraformState(input: unknown, account: unknown) {
  const state = record(input);
  if (
    typeof account !== "string" ||
    !/^[a-f0-9]{32}$/i.test(account) ||
    state.version !== 4 ||
    typeof state.lineage !== "string" ||
    !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(state.lineage) ||
    !Number.isInteger(state.serial) ||
    Number(state.serial) < 0 ||
    !Array.isArray(state.resources)
  ) {
    throw new Error("Remote state identity is absent or unsupported");
  }
  const domains = {
    website: ["a2f0.net", "resume-redirect"],
    resume: ["resume.a2f0.net", "resume-prod"],
    staging: ["staging.a2f0.net", "resume-staging"],
    experiment: ["experiment.a2f0.net", "experiment"],
    nc: ["nc.a2f0.net", "nc"],
    dnbm: ["dnbm.a2f0.net", "dnbm"],
  };
  for (const [name, [hostname, service]] of Object.entries(domains)) {
    const matching = state.resources
      .map(record)
      .filter(
        (resource) =>
          resource.mode === "managed" &&
          resource.type === "cloudflare_workers_custom_domain" &&
          resource.name === name,
      );
    const resource = matching[0];
    if (
      matching.length !== 1 ||
      !resource ||
      !Array.isArray(resource.instances) ||
      resource.instances.length !== 1 ||
      typeof record(record(resource.instances[0]).attributes).id !== "string" ||
      !record(record(resource.instances[0]).attributes).id ||
      record(record(resource.instances[0]).attributes).account_id !== account ||
      record(record(resource.instances[0]).attributes).hostname !== hostname ||
      record(record(resource.instances[0]).attributes).service !== service
    ) {
      throw new Error(
        "Existing domain state is incomplete; refuse possible recreation",
      );
    }
  }
}

if (import.meta.main) {
  const [mode, path, variables, ...extra] = process.argv.slice(2);
  if (
    !path ||
    extra.length ||
    (mode !== "state" && variables !== undefined) ||
    (mode === "state" && !variables) ||
    (mode !== "sources" &&
      mode !== "plan" &&
      mode !== "backend" &&
      mode !== "state" &&
      mode !== "version")
  )
    throw new Error(
      "Usage: terraformPlan.ts <sources|plan|backend|version> <path>, or state <private-state-json> <private-variables-json>",
    );
  if (mode === "sources") await checkTerraformSources(path);
  else {
    const value: unknown = await file(path).json();
    if (mode === "backend") checkTerraformBackend(value);
    else if (mode === "state") {
      if (!variables) throw new Error("Missing existing account variables");
      checkTerraformState(
        value,
        record(await file(variables).json()).cloudflare_account_id,
      );
    } else if (mode === "plan") checkTerraformPlan(value);
    else if (
      record(value).terraform_version !==
      (
        await file(
          new URL("../terraform/.terraform-version", import.meta.url),
        ).text()
      ).trim()
    ) {
      throw new Error("Use the repository's pinned Terraform CLI");
    }
  }
  console.log(
    "Terraform safety evidence accepted; attribute values are not printed",
  );
}
