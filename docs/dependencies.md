# Dependency and deployment gates

Use the pinned `update-dependencies` skill with this repository's gates. Keep
reusable procedures and active constraints here; put each upgrade's dated version
inventory, migration results, audit/test/preview evidence, and skipped groups in
its PR. Update or remove guidance when a constraint changes instead of appending
upgrade journals. Past findings need their PR provenance and fresh verification
before they describe current upstream or production state.

Inventory direct pins, workspace edges, all lock resolutions, runtimes, CI
Actions, native binaries, provider versions, overrides and patches. Use official
release/migration notes and actual registry publication/artifact proof. A source
branch or stale cache's `latest` tag cannot prove a published upgrade. Bun owns
the lockfile; refresh it through normal manager operations.

## Pins and agent tooling

Keep versions exact and Actions pinned by commit SHA with version comments.
mise reads Node from `.nvmrc` and Bun from `.mise.toml` for local setup and CI.
Keep `package.json`'s `engines.node` and `packageManager` aligned with those
pins. Preserve `.nvmrc`: the deployment snapshot guard also reads it.
Bun settings live in `bunfig.toml`, and dependency build permissions live in
`package.json`. Dependabot is disabled; upgrades go through this workflow.
Update `terraform/.terraform-version` and the CI version together. Provider or
module changes require the authentic R2 state backend and a complete
non-destructive saved plan through `terraform/apply.sh --dry-run`. Local validation and fixture
plans are never production-plan evidence. Do not apply infrastructure or deploy
to validate an upgrade.

Agent-tool is pinned exactly as `@a2f0/agent-tool` from npm. Confirm the producer's
successful publication and package tarball before selecting a version; source
commits do not establish availability. Use `bun install` to update the lockfile,
then `bun run agents:sync` and commit the pin, lockfile, managed skills, and
`.agent-tool-skills.json` together. Do not edit managed copies or lock integrity.
`bun run agents:check` is the hook and CI drift gate. Shared branch, commit,
installed-hook, validation-receipt, and PR mechanics use `agent-tool.json`;
full commitlint, architecture, and deployment policy remain repository-owned.
See [development](development.md) for migrating the old Husky hook location and
[AGENTS.md](../AGENTS.md) for shipping requirements.

## Coupled packages and migrations

- React, React DOM, types and the Next.js/third-parties pair move together with
  the actual export, browser and peer checks. Node types follow the runtime in
  [`.nvmrc`](../.nvmrc). The published
  [Bun types](https://www.npmjs.com/package/@types/bun/v/1.4.3) and
  [Happy DOM](https://www.npmjs.com/package/@happy-dom/global-registrator/v/21.0.4)
  request newer Node declarations, while WebdriverIO requests Node 22 types.
  The root `@types/node` override keeps all ambient Node declarations on the
  supported Node 24 runtime line. Verify full compilation and runtime tests when
  changing it; remove the override when owners resolve that line naturally or
  the repository deliberately changes its supported runtime.
- Keep `@tearleads/windowing` exact and consume only published releases. Its
  local producer candidate cannot authorize a consumer bump. The website and
  Drive (for its theme provider and switch) pin the same version; bump them
  together and recheck Drive's theme switch in its browser suite.
  The website's click-attribution wrapper gives each desktop window a full-size
  immediate parent because the package measures that parent for geometry. Recheck
  fitting, dragging, resizing, stacking, and pointer routing in the website browser
  suite when upgrading; keep routed app roots directly inside their existing pane.
- Keep `@tearleads/client-sdk` exact and verify its published tarball before
  upgrading Drive. Check the public API and existing browser database schema;
  the SDK can reject older schemas without migrating them. Agree on preserving
  local data or requiring fresh browser storage before shipping an incompatible
  upgrade, and document the recovery steps. Never clear browser data silently.
  Copy the worker, SQLite WASM, and license from that same installed SDK with
  Drive's `copy-sdk` script, then verify persistence and attachments in its
  browser suite.
- Skyline mounts in an HTMLElement/open shadow root.
  Browser tests wait for the viewer's readiness and inspect its rendered controls,
  canvas and focus. Always destroy on unmount and preserve the dedicated local
  asset-copy cleanup. Its `colour` mount option selects the sunny-day view for
  Paper; changing the desktop scheme destroys and remounts the viewer because
  the published instance has no live colour setter. Pass the same scheme through
  `theme` so the loading backdrop matches before the scene or its styles arrive,
  and the bottom controls keep that palette after the scene renders.
  The host website owns click tracking. Verify the published mount entry does not
  import or initialize the standalone page tracker, even if Skyline carries its
  own CT dependency. Check descriptive `data-ct` labels in the copied assets and
  intercept collector requests when smoke-testing real mounted controls/canvases
  under the production origin: one trusted click must produce one event with the
  host site's app dimension. Never send these verification clicks to production.
- Dnbm's sequencer/player loaders and copied asset API must be checked against
  the actual published tarball before updating its pin. Paper's palette also
  relies on the private `.frame`, `.dialog-layer`, and `.failure` selectors and
  CSS tokens in `useDnbmTheme.ts`. Recheck those tokens and the shadow-root
  stylesheet cascade against the tarball, including a saved-Paper cold load.
- Wrangler, Miniflare, workerd, Sharp and native image libraries form one owning
  group. A patched Sharp resolution requires native ABI and offline Miniflare
  SVG-to-PNG behavior proof, plus the authenticated deployment preview.

## Security overrides and patches

The `smol-toml` 1.9 security fix returns objects with null prototypes.
Markdownlint 0.42.0 otherwise drops nested TOML rule options through an
`instanceof Object` check. Its narrow Bun-managed patch accepts those objects
while preserving options, `enabled` and warning `severity`. The real CLI
regression is `scripts/checks/markdownlintCompatibility.test.ts`. Remove the patch only
when an upstream owning Markdownlint release passes that regression unpatched.
The owner now resolves `smol-toml` 1.9.1 directly, so no parser override is
needed. Keep verifying the real CLI regression and the resolved graph when
updating that owner.
Mocha's own compatible range now resolves the fixed `serialize-javascript`
7.1.2, so it needs no override. Recheck that resolution when changing Mocha.

WebdriverIO 10 uses Puppeteer browser downloads without the former `basic-ftp`
and `extract-zip` dependency path. Puppeteer's downloader uses the system `unzip`
on macOS/Linux; its optional `yauzl` peer is only a fallback. Verify a fresh
`WEBDRIVER_CACHE_DIR` when changing this owner group and ensure `unzip` exists
on development machines and CI. Follow the
[WebdriverIO migration guide](https://webdriver.io/docs/v10-migration) for
strict selectors and explicit browsing contexts. Run `bun audit` on the installed
candidate when the registry is available and put its dated report in the upgrade PR.
[PR #1188](https://github.com/a2f0/a2f0.net/pull/1188) records the prior audit and
held owner groups; it does not establish today's exposure or available fixes.

The remaining advisory constraints need their owning packages updated:

- `markdownlint-cli2` still owns Markdownlint 0.42.0 and
  `micromark-extension-math` with KaTeX 0.16. KaTeX's
  [prototype-pollution gadget fix](https://github.com/advisories/GHSA-238p-pmpm-9mq7)
  starts at 0.18.2. Revisit when that owner accepts the fixed release; verify
  the real Markdownlint CLI and its TOML regression before removing its patch.
- `micromatch` still owns `braces` 3.0.3. The
  [nested-pattern stack exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
  has no published fixed version. Recheck its owning release and advisory,
  then run the lint, architecture and browser discovery checks.

## Worker preview

Every owned deployment script and CI deployment runs `scripts/deploy/deploy.ts`.
Use the matching `preview:*` root script or Drive's `preview` script first. The deployment itself repeats the preview and fresh checks.

For changes to this guard, run the manual workflow on the reviewed clean feature
branch with `gh workflow run main.yml --ref <branch> -f preview=true`. Wait for
validation and all five preview targets on that exact commit. The optional preview
uses CI credentials and never publishes; ordinary PR and push validation receives
no deployment credentials.

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
routes on deploy. Route inventory is a separate review check, not a CI token
requirement; verify it for the proposed migration. The authenticated route
inventory in [PR #1188](https://github.com/a2f0/a2f0.net/pull/1188) is historical
evidence. Adding or changing routing requires a separate migration review.

The five target names and Terraform-owned hostnames are explicit in
`scripts/deploy/deployPolicy.ts`. New resource settings, migrations, alternate Worker
names, stateful bindings, enabled public endpoints, cron schedules and split
live traffic require a separate migration review. A new target's Worker is
created once with `bun scripts/deploy/deploy.ts <target> --bootstrap`, after
`--bootstrap-dry-run`, from the reviewed PR head before merging; it refuses when
the Worker or its hostname already exists. Terraform then attaches the
hostname, as [Drive's hosting notes](../packages/drive/README.md#hosting)
describe. The guard reads existing
identities, runs [Wrangler's dry run](https://developers.cloudflare.com/workers/wrangler/commands/workers/),
then compares fresh remote evidence and the local commit/config/tool/assets.
It checks actual Bun, Node and installed Wrangler versions against the pins,
binds execution to the captured Node path, and fingerprints the runtime binaries,
Wrangler executable target and CLI code again after preview.
No D1 migration command is needed: these Workers have no D1 binding.

The demo builds once without Cloudflare credentials. A validated private
configuration removes its custom-build command and uses the absolute captured
asset directory for both dry run and deployment; Wrangler cannot rebuild the
assets between them. The guard hashes file boundaries and paths, including
routing files, and rejects symlinks. Temporary configuration and logs are
removed afterward. Never run direct Wrangler deploy to bypass the guard.

After a merge to `main`, wait for the actual merge commit's successful
deployment and smoke-test resume, apex, demo and Drive URLs, as `AGENTS.md`
requires. A bundle preview alone does not prove live identity or route safety.

## Terraform preview

State lives in the Cloudflare R2 bucket `a2f0-net-terraform-state` at key
`terraform.tfstate`, through the S3 backend in `terraform/main.tf` with R2's
endpoint, path-style addressing, and lockfile locking. Initialize it with
`terraform/init.sh` and use the existing default workspace. Local
`init -backend=false`/validation never substitute for the actual backend plan.

The bucket's key, `TF_STATE_ACCESS_KEY_ID` and `TF_STATE_SECRET_ACCESS_KEY`, is
in `.secrets/prod/app.env`. `.secrets` is the gitignored link to
`../matrix-secrets/a2f0.net`, managed and backed up from the
[matrix repository](https://github.com/a2f0/matrix/blob/main/docs/secrets.md).
`terraform/init.sh`, `upgrade.sh`, and `apply.sh` read `shared.env`, when
present, and then `app.env` in a subshell. They give Terraform only those two
values, as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, unset `AWS_PROFILE`
and `AWS_SESSION_TOKEN`, and stop when either value is missing. No AWS account
credentials are involved, and no provider in the stack uses AWS. A provider that
did would receive the R2 key, so adding one requires separating the backend
credentials first.

Terraform's inputs live in the same tier and stay private there:
`apply.sh` passes `.secrets/prod/main.tfvars.json` as its variables file, and
`gsuite.tf` reads the Google Workspace key from
`.secrets/prod/google-credentials.json`. The entrypoint stops before running
Terraform when either is missing. The provider leaves its credentials unset
without that file only so that `init -backend=false` validation runs without
`.secrets`.

Run `terraform/apply.sh --dry-run`. The entrypoint verifies that the
initialized backend is that bucket and key on the R2 endpoint alone, and that
the Terraform CLI is the pinned version. It rejects provisioners/external data
programs, and inherited `TF_CLI_ARGS`, `TF_DATA_DIR`, `TF_WORKSPACE`, and AWS S3
endpoint overrides. Endpoints in shared AWS configuration are ignored. It
requires provider refresh in its saved plan and reads populated remote state
with the six existing custom-domain resources. It matches their
hostnames and services to explicit existing production identities and their
account IDs to the private account variable. A domain migration
requires a separate guard review: `DOMAIN_MIGRATION` in
`scripts/deploy/terraformPlan.ts` names the domains it adds and retires. While it is
applied, an added domain may still be absent from state, and a retired one may
remain there or be deleted, each only with exactly its named identity. Empty it
again once the migration is applied. The entrypoint then creates and inspects a
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

Markdownlint owns Markdown formatting. Biome's Markdown formatter stays disabled
because it removes blank lines required by the enforced Markdownlint rules.
Biome continues to format source, JSON and YAML; managed skill directories stay
excluded from Biome and are verified with `agents:check` and Markdownlint.

Use pinned Bun/Node binaries, install normally to set up the copied Git hooks, and run:

```sh
bun run compile
bun run unit
bun run build
bun run lint:md
bun run check:dependencies
bun run agents:check
sh scripts/git/hooks/pre-commit
sh scripts/git/hooks/pre-push </dev/null
bun run ci-headless
bun run --cwd packages/website test
bun run --cwd packages/demo test
bun run --cwd packages/drive test
bun audit
```

One-shot Node scripts use [tsx's documented Node loader](https://tsx.is/dev-api/node-cli)
(`node --import tsx`) with the pinned Node runtime. Root script checks run
directly before the cached workspace tasks. Browser,
native, registry, signing, preview or provider failures remain required gates;
record the blocker and preserve the local candidate for normal resumption.
