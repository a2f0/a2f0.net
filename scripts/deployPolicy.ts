import { resolve } from "node:path";
import { type ParseError, parse } from "jsonc-parser";

export const DEPLOYMENTS = {
  "resume-staging": {
    package: "resume",
    environment: "staging",
    worker: "resume-staging",
    hostname: "staging.a2f0.net",
  },
  "resume-prod": {
    package: "resume",
    environment: "prod",
    worker: "resume-prod",
    hostname: "resume.a2f0.net",
  },
  website: {
    package: "website",
    environment: undefined,
    worker: "resume-redirect",
    hostname: "a2f0.net",
  },
  experiment: {
    package: "experiment",
    environment: undefined,
    worker: "experiment",
    hostname: "experiment.a2f0.net",
  },
} as const;

export type DeploymentName = keyof typeof DEPLOYMENTS;

// A date migration must explicitly name the currently live date as previous.
// Keep previous null until such a migration is reviewed; remove it afterward.
export const WORKER_COMPATIBILITY = {
  current: "2026-09-16",
  previous: null,
} satisfies { current: string; previous: string | null };

type CompatibilityPolicy = { current: string; previous: string | null };

export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object in deployment evidence");
  }
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new Error(
      "Deployment configuration contains unreviewed resource effects",
    );
  }
}

export function checkConfiguration(
  text: string,
  target: DeploymentName,
  compatibility: CompatibilityPolicy = WORKER_COMPATIBILITY,
) {
  const errors: ParseError[] = [];
  const config = record(parse(text, errors));
  if (errors.length) throw new Error("Invalid Wrangler configuration");
  onlyKeys(config, [
    "$schema",
    "name",
    "compatibility_date",
    "workers_dev",
    "preview_urls",
    "assets",
    "env",
    "build",
  ]);
  if (
    config.compatibility_date !== compatibility.current ||
    config.workers_dev !== false ||
    config.preview_urls !== false
  ) {
    throw new Error(
      "Compatibility or public endpoint settings changed; a new safety review is required",
    );
  }
  const assets = record(config.assets);
  onlyKeys(assets, ["directory", "html_handling", "not_found_handling"]);
  const expectedDirectory =
    DEPLOYMENTS[target].package === "website" ? "./dist" : "./out";
  if (assets.directory !== expectedDirectory)
    throw new Error("Unexpected asset directory");
  if (config.build !== undefined) {
    const build = record(config.build);
    onlyKeys(build, ["command", "watch_dir"]);
    if (
      target !== "website" ||
      build.command !== "bun run build" ||
      JSON.stringify(build.watch_dir) !== JSON.stringify(["src", "public"])
    )
      throw new Error("Unreviewed custom build command");
  }
  let name = config.name;
  const environment = DEPLOYMENTS[target].environment;
  if (environment !== undefined) {
    if (name !== undefined)
      throw new Error("Resume requires an explicit environment");
    const environments = record(config.env);
    onlyKeys(environments, ["staging", "prod"]);
    for (const [key, worker] of [
      ["staging", "resume-staging"],
      ["prod", "resume-prod"],
    ]) {
      const settings = record(environments[key]);
      onlyKeys(settings, ["name"]);
      if (settings.name !== worker)
        throw new Error("A resume Worker identity changed");
    }
    name = record(environments[environment]).name;
  } else if (config.env !== undefined) {
    throw new Error("Unexpected deployment environments");
  }
  if (name !== DEPLOYMENTS[target].worker)
    throw new Error("Worker rename or recreation refused");
  return expectedDirectory;
}

/** Capture the validated asset-only config without any second custom build. */
export function deploymentConfiguration(
  text: string,
  target: DeploymentName,
  directory: string,
) {
  const assets = checkConfiguration(text, target);
  const config = record(parse(text));
  delete config.build;
  delete config.$schema;
  config.assets = {
    ...record(config.assets),
    directory: resolve(directory, assets),
  };
  return JSON.stringify(config);
}

export function checkPublicEndpoints(subdomain: unknown, schedules: unknown) {
  const endpoints = record(subdomain);
  if (endpoints.enabled !== false || endpoints.previews_enabled !== false) {
    throw new Error(
      "Existing public endpoint settings differ from the preview",
    );
  }
  const triggers = record(schedules);
  onlyKeys(triggers, ["schedules"]);
  if (!Array.isArray(triggers.schedules) || triggers.schedules.length) {
    throw new Error(
      "Existing cron triggers require a separate migration review",
    );
  }
}

export function checkSettings(
  settings: unknown,
  compatibility: CompatibilityPolicy = WORKER_COMPATIBILITY,
) {
  const value = record(settings);
  if (!Array.isArray(value.bindings) || value.bindings.length !== 0) {
    throw new Error("Existing bindings are unknown or would be removed");
  }
  if (
    value.migration_tag ||
    value.logpush === true ||
    (value.tail_consumers !== undefined &&
      (!Array.isArray(value.tail_consumers) || value.tail_consumers.length)) ||
    (value.observability !== undefined &&
      record(value.observability).enabled !== false)
  ) {
    throw new Error(
      "Existing stateful or logging configuration needs a separate review",
    );
  }
  if (
    (value.compatibility_date !== compatibility.current &&
      (compatibility.previous === null ||
        value.compatibility_date !== compatibility.previous)) ||
    (value.compatibility_flags !== undefined &&
      (!Array.isArray(value.compatibility_flags) ||
        value.compatibility_flags.length))
  ) {
    throw new Error("Existing runtime compatibility differs from the preview");
  }
}

export function checkDomain(domains: unknown, target: DeploymentName) {
  if (!Array.isArray(domains)) throw new Error("Incomplete domain evidence");
  const matches = domains
    .map(record)
    .filter((domain) => domain.hostname === DEPLOYMENTS[target].hostname);
  const domain = matches[0];
  if (
    matches.length !== 1 ||
    !domain ||
    domain.service !== DEPLOYMENTS[target].worker ||
    typeof domain.id !== "string" ||
    !domain.id ||
    typeof domain.zone_id !== "string" ||
    !domain.zone_id ||
    (domain.environment !== undefined && domain.environment !== "production")
  ) {
    throw new Error(
      "Existing custom domain does not identify the expected Worker",
    );
  }
  return domain.zone_id;
}

/** A paginated or partial identity read cannot authorize a deployment. */
export function checkApiResult(payload: unknown, completeList: boolean) {
  const response = record(payload);
  if (response.success !== true)
    throw new Error("Cloudflare identity read did not succeed");
  if (completeList && response.result_info !== undefined) {
    const pagination = record(response.result_info);
    if (
      (pagination.total_pages !== undefined &&
        (!Number.isInteger(pagination.total_pages) ||
          pagination.total_pages !== 1)) ||
      (pagination.total_count !== undefined &&
        (!Array.isArray(response.result) ||
          !Number.isInteger(pagination.total_count) ||
          pagination.total_count !== response.result.length))
    ) {
      throw new Error("Cloudflare identity list is incomplete");
    }
  }
  return response.result;
}

/** The newest existing deployment must route all traffic to one version. */
export function checkDeployment(deployments: unknown) {
  const values = record(deployments).deployments;
  if (!Array.isArray(values) || !values.length)
    throw new Error("No existing Worker deployment found");
  const entries = values.map((value) => {
    const entry = record(value);
    if (typeof entry.created_on !== "string")
      throw new Error("Existing Worker deployment dates are incomplete");
    const timestamp = Date.parse(entry.created_on);
    if (Number.isNaN(timestamp))
      throw new Error("Existing Worker deployment dates are incomplete");
    return { entry, timestamp };
  });
  const latest = [...entries].sort((a, b) => b.timestamp - a.timestamp)[0]
    .entry;
  const traffic = latest.versions;
  if (
    !Array.isArray(traffic) ||
    traffic.length !== 1 ||
    record(traffic[0]).percentage !== 100 ||
    typeof record(traffic[0]).version_id !== "string" ||
    !record(traffic[0]).version_id
  )
    throw new Error("Existing deployment is incomplete or splits live traffic");
  return record(traffic[0]).version_id;
}

export interface DeploymentChecks {
  snapshot(): Promise<string>;
  inspect(): Promise<string>;
  preview(): Promise<void>;
  apply(): Promise<void>;
}

/** A failed/incomplete preview or changed local/remote evidence prevents mutation. */
export async function runDeployment(
  checks: DeploymentChecks,
  previewOnly: boolean,
) {
  const local = await checks.snapshot();
  const remote = await checks.inspect();
  await checks.preview();
  if ((await checks.snapshot()) !== local)
    throw new Error(
      "Commit, tool, configuration or assets changed during preview",
    );
  if ((await checks.inspect()) !== remote)
    throw new Error(
      "Deployment identity or live version changed during preview",
    );
  if (!previewOnly) await checks.apply();
}
