# Dependency and deployment gates

Keep a dated inventory of direct pins, workspace edges, all lock resolutions,
runtimes, CI Actions, native binaries, provider versions, overrides and patches.
Use official release/migration notes and actual registry publication/artifact
proof. A source branch or stale cache's `latest` tag cannot prove a published
upgrade. Bun owns the lockfile; refresh it through normal manager operations.

## Coupled packages and migrations

- React, React DOM, types and the Next.js/third-parties pair move together with
  the actual export, browser and peer checks. Node types follow the pinned Node
  24 runtime; transitive owners may still declare other type versions.
- Keep `@tearleads/windowing` exact and consume only published releases. Its
  local producer candidate cannot authorize a consumer bump.
- Skyline 0.2.2 replaces iframe mounting with an HTMLElement/open shadow root.
  Browser tests wait for the viewer's readiness and inspect its rendered controls,
  canvas and focus. Always destroy on unmount and preserve the dedicated local
  asset-copy cleanup.
- Dnbm's sequencer/player loaders and copied asset API must be checked against
  the actual published tarball before updating its pin.
- Agent-tool keeps the existing full Git SHA alias policy. Bun must resolve the
  exact producer commit before the installer updates both harnesses and the
  ownership file. Do not manually edit managed skill copies or lock integrity.
- Wrangler, Miniflare, workerd, Sharp and native image libraries form one owning
  group. A patched Sharp resolution requires native ABI and offline Miniflare
  SVG-to-PNG behavior proof, plus the authenticated deployment preview.

## Security overrides and patches

The `smol-toml` 1.9 security fix returns objects with null prototypes.
Markdownlint 0.41.1 otherwise drops nested TOML rule options through an
`instanceof Object` check. Its narrow Bun-managed patch accepts those objects
while preserving options, `enabled` and warning `severity`. The real CLI
regression is `scripts/markdownlintCompatibility.test.ts`. Remove the patch only
when an upstream owning Markdownlint release passes that regression unpatched.
Keep `serialize-javascript` exact until the owning package supports the fixed
version naturally and the relevant rendering/escaping tests pass.

The existing `basic-ftp` override still needs its owning Puppeteer/extract-zip
integration checked before a major-version replacement. A retained pin is not
an advisory remediation. Report advisory exposure, fixed-version availability
and actual final graph coverage separately; never silently suppress a warning or
invent a fixed Braces release. Run `bun audit` on the installed candidate when
the registry is available and retain its dated report.

## Worker preview

Every owned deployment script and CI deployment runs `scripts/deploy.ts`.
Use the matching `preview:*` root script or the experiment's `preview` script
first. The deployment itself repeats the preview and fresh checks.

The guard requires a committed clean tree and scoped Cloudflare credentials.
Read permissions must cover the existing account's Worker settings,
deployments, domains, subdomain settings and schedules; publishing additionally
requires Workers Scripts Edit. Denied or incomplete reads stop before
publishing. Never broaden tokens as a workaround.

For a reviewed compatibility-date bump, change the four Wrangler configs and
`WORKER_COMPATIBILITY.current` together, and set `previous` to the verified live
date for the first deployment. The guard then accepts only the configured or
that explicitly reviewed previous live date. Clear `previous` after the
transition. Other compatibility flags still require a separate review.

The guard rejects `route`/`routes` and requires `workers_dev=false` for all four
configs. [Cloudflare documents](https://developers.cloudflare.com/workers/wrangler/configuration/)
that omitting both route keys with `workers_dev=false` preserves dashboard-managed
routes on deploy. An authenticated pre-merge zone read found zero Worker routes
on 2026-10-07; route inventory is a separate review check, not a CI token
requirement. Adding or changing routing requires a separate migration review.

The four target names and Terraform-owned hostnames are explicit in
`scripts/deployPolicy.ts`. New resource settings, migrations, alternate Worker
names, stateful bindings, enabled public endpoints, cron schedules and split
live traffic require a separate migration review. The guard reads existing
identities, runs [Wrangler's dry run](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
then compares fresh remote evidence and the local commit/config/tool/assets.
It checks actual Bun, Node and installed Wrangler versions against the pins,
binds execution to the captured Node path, and fingerprints the runtime binaries,
Wrangler executable target and CLI code again after preview.
No D1 migration command is needed: these Workers have no D1 binding.

The website builds once without Cloudflare credentials. A validated private
configuration removes its custom-build command and uses the absolute captured
asset directory for both dry run and deployment; Wrangler cannot rebuild the
assets between them. The guard hashes file boundaries and paths, including
routing files, and rejects symlinks. Temporary configuration and logs are
removed afterward. Never run direct Wrangler deploy to bypass the guard.

After a production merge, wait for the actual merge commit's successful
deployment and smoke-test resume, apex and experiment URLs, as `AGENTS.md`
requires. A bundle preview alone does not prove live identity or route safety.

## Terraform preview

Initialize the documented existing S3 backend (`resume-terraform`,
`resume/terraform.tfstate`, `us-east-1`) with authentic AWS credentials and the
existing default workspace. Keep decrypted SOPS variables private. Local
`init -backend=false`/validation never substitute for the actual backend plan.

Run `terraform/apply.sh --dry-run`. The entrypoint verifies the initialized
backend and pinned Terraform CLI, rejects provisioners/external data programs,
rejects inherited `TF_CLI_ARGS`, `TF_DATA_DIR`, `TF_WORKSPACE`, and AWS S3 endpoint
overrides. The selected AWS profile's custom endpoints are ignored. It requires
provider refresh in its saved plan and reads populated remote state with the
six existing custom-domain resources. It matches their
hostnames and services to explicit existing production identities and their
account IDs to the private account variable. A domain migration
requires a separate guard review. The entrypoint then creates and inspects a
complete saved plan. Unsupported, deferred,
errored, failed-check, provider-Action, deletion and replacement effects stop
it. Applying requires an interactive terminal, a visible rendering of the exact
saved plan, and typed `yes`; it rechecks remote state after approval and applies
only that saved plan. Missing domain state cannot authorize recreation. Plan/state
JSON remains in a private temporary directory and is removed afterward.
The saved-plan guard accepts Terraform JSON format 1.2; review that format when
updating the pinned Terraform CLI.

`checkTerraformPlan` is a repository-owned read-only JSON guard. It does not
prove credentials, state identity, provider-internal effects or real production
safety by itself. The command requires the authentic backend and provider
refresh; manually review any provider effects before mutation. Unit command
fixtures prove ordering and refusal behavior only and never access production.

## Validation

Use pinned Bun/Node binaries, install normally to set up Husky, and run:

```sh
bun run compile
bun run unit
bun run build
bun run lint:md
bun run check:dependencies
bun run agents:check
sh .husky/pre-commit
sh .husky/pre-push
bun run ci-headless
bun run --cwd packages/website test
bun run --cwd packages/experiment test
bun audit
```

One-shot Node scripts use [tsx's documented Node loader](https://tsx.is/dev-api/node-cli)
(`node --import tsx`) with the pinned Node runtime. Root script checks run
directly before the cached workspace tasks. Browser,
native, registry, signing, preview or provider failures remain required gates;
record the blocker and preserve the local candidate for normal resumption.
