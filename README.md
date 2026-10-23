# a2f0.net

## Quick Start

[mise](https://mise.jdx.dev/) installs Node from `.nvmrc` and Bun from
`.mise.toml`. CI uses the same configuration.
The resume app lives in [`packages/resume`](packages/resume), the apex website
lives in [`packages/website`](packages/website/README.md), and PR helpers come
from the commit-pinned [agent-tool repository](https://github.com/a2f0/agent-tool).
The resume data, layout, and SVG
and PDF factories live in [`packages/shared`](packages/shared/README.md). The
website opens the resume, the graffiti artwork from
[`packages/demo`](packages/demo), and other apps in desktop windows.
[`packages/drive`](packages/drive/README.md) is an independently styled file explorer
built on the published Tearleads client SDK, hosted at `drive.a2f0.net`.
Run the commands below from the repository root.

Production browser apps use CT click analytics. See
[click analytics](docs/click-tracking.md) for app dimensions, collected data,
and browser opt-outs.

```sh
mise install
bun ci
bun run start-server
```

`bun run build` builds every workspace. For the resume, it generates the
desktop SVG, then Next.js exports the site to `packages/resume/out/`.
Cloudflare Workers serves those files. The desktop SVG is included in the
exported HTML; local development and mobile layouts still generate it in the
browser. The SVG uses the bundled Arimo font for consistent build and browser
layout. PDF generation remains in the browser.

The demo at `demo.a2f0.net` displays a grayscale SVG graffiti wordmark on a
black canvas, served by Cloudflare Workers. Edit `packages/demo/public/a2f0.svg`
to refine the artwork. Its TypeScript in `packages/demo/src` renders the ASCII
view, the lens, and the toolbar's play button animations (a laser etching over
the SVG, and falling code that writes the ASCII art). Wrangler runs
`bun run build` before `dev`. The guarded deployment builds once, then previews
and publishes that same `dist/` asset tree. Preview it with
`bun run --cwd packages/demo start` on port 4002.

## Agent tooling

`bun ci` installs the commit-pinned agent-tool CLI.
See [AGENTS.md](AGENTS.md) for review, hook, title, and shipping requirements, and
[dependency maintenance](docs/dependencies.md) for updating the tooling.

## Testing

```sh
bun run compile
bun run unit
bun run ci-headless
bun run --cwd packages/website test
bun run --cwd packages/demo test
bun run lint:md
bun run check:architecture
```

`ci-headless` builds the static export and runs the browser tests against
Wrangler on port 4001. It covers the resume views, downloads, menus, direct
routes, canonical URLs, and 404 responses. The website test exports
`packages/website` and drives its desktop and windows through Wrangler. The
demo test builds and serves `packages/demo/dist` through Wrangler and checks
that its page responds without a redirect.

The resume and demo browser suites include an `a11y.e2e.ts` spec that audits each view with
[axe-core](https://github.com/dequelabs/axe-core) against WCAG 2.2 A and AA
and axe's best practices, and drives the menus and toolbar from the keyboard.
Biome enforces all of its `a11y` lint rules on the TSX and HTML.

`bun run check:architecture` runs
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) over every
source file git doesn't ignore with the rules in `scripts/architecturePolicy.ts`: no
circular imports, type-only ones included; npm imports declared in the importing
workspace, as dependencies wherever the apps ship them; no orphaned modules; and
workspaces importing one another by package name and only down their layers. The
demo and `packages/shared` import no other workspace, the resume imports
`packages/shared`, and the website imports both. The pre-push hook runs it
after [Knip](https://knip.dev), which reports unused files, dependencies, and
exports.

`bun run compile`, `bun run unit`, and `bun run build` run each workspace's
script through [Turborepo](https://turborepo.com), in parallel, and cache the
results in `.turbo/` on your machine; CI doesn't reuse a cache. A workspace's
tasks rerun when its files, or those of a workspace it depends on, change.
Root script compilation and the safety/compatibility unit tests run before the
workspace tasks and are never cached.
Pass `--force` to skip the cache or `--filter=@resume/site` to run one
workspace, as in `bun run unit --force`. Agent helper
tests and compilation run in the standalone agent-tool repository's CI.
Invoke the repository's [`$ship-pr` skill](.agents/skills/ship-pr/SKILL.md) to validate, independently
review, and squash-merge the current PR. The `main` ruleset requires
the stable `build` CI check with the branch up to date before merging.

To develop browser tests, run these in separate terminals:

```sh
bun run build
bun run start-server-test
```

```sh
bun run --cwd packages/resume test --spec test/specs/svg.e2e.ts
```

To run the same browser suite against a deployed site:

```sh
bun run --cwd packages/resume test-headless --baseUrl https://resume.a2f0.net
```

To preview the production build locally on port 4000:

```sh
bun run build
bun run start
```

Spell check against the
[aspell definition in dotfiles](https://github.com/a2f0/dotfiles/blob/main/files/aspell.en.pws):

```sh
aspell --master=en_US --lang=en_US -c packages/shared/resume.json
```

## Cloudflare Deployment

This follows the Workers static-assets setup in `tearleads` and
`devopsrockstars`: Wrangler publishes assets, and Terraform attaches domains.
The [Next.js static export](https://nextjs.org/docs/pages/guides/static-exports)
is served using Cloudflare's
[static site routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

| Branch | Command | Worker | Domain |
| --- | --- | --- | --- |
| `staging` | `bun run deploy:staging` | `resume-staging` | `staging.a2f0.net` |
| `main` | `bun run deploy:prod` | `resume-prod` | `resume.a2f0.net` |
| `main` | `bun run deploy:website` | `resume-redirect` | `a2f0.net` |
| `main` | `bun run deploy:demo` | `demo` | `demo.a2f0.net` |
| `main` | `bun run --cwd packages/drive deploy` | `drive` | `drive.a2f0.net` |

The website uses the published, pinned `@tearleads/windowing` package and
deploys alongside the resume and demo after production validation succeeds.

`a2f0.net` serves the website directly. The resume remains at
`resume.a2f0.net`. The website keeps the apex Worker's existing service name,
`resume-redirect`, so the apex domain stays attached as the code it serves
changes.

Terraform also attaches `nc.a2f0.net` to the `nc` Worker, which
[a2f0/nc](https://github.com/a2f0/nc) builds and deploys with
`bun run web:deploy`; this repository's CI doesn't deploy it.

Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your environment for
local deployments. GitHub Actions uses repository secrets with the same names
and deploys only after validation succeeds on pushes to those two branches.
Pull requests and manual workflow runs validate without deploying.

Every deployment command and CI deployment uses the guard in `scripts/deploy.ts`.
It verifies existing identities and a complete preview before publishing; missing
credentials, unsafe changes, or drift stop the command. Never bypass it with a
direct Wrangler deployment. Terraform keeps ownership of custom domains. See
[the deployment and dependency gates](docs/dependencies.md).

Use separate tokens: `cloudflare_deploy_api_token` needs Workers Scripts Edit
and read access to the existing Worker settings, deployments, domains,
subdomain settings and schedules. The guard
fails closed when its reads are denied. It populates the Actions
`CLOUDFLARE_API_TOKEN` secret. CI exposes it only to the guard and Wrangler,
after installation and the build finish; the demo's local build runs with
Cloudflare credentials removed.
The Terraform provider uses `cloudflare_api_token`, which also needs Workers
custom-domain access, Zone Read, DNS Edit, and Zone Settings Edit for `a2f0.net`.
Creating the zone requires additional zone-creation permission; the stack looks
up a zone created beforehand. Both tokens live in `.secrets/prod/main.tfvars.json`;
see [Setup](#setup).

Public `workers.dev` and preview URLs are disabled. Each Worker is served
through its existing Terraform-owned custom domain. Select the explicit target
with the scripts above; do not pass alternate names or environments to Wrangler.
Use `preview:staging`, `preview:prod`, `preview:website`, or `preview:demo`
for the same guard without mutation.

## Infrastructure

Terraform keeps state in the Cloudflare R2 bucket `a2f0-net-terraform-state`
and manages Cloudflare custom domains, HTTPS redirects, Google Workspace DNS
records, and GitHub secrets. Google Workspace account resources remain in the
same stack. Domain registration remains with AWS and delegates to the Cloudflare
nameservers.

### Setup

1. Install Terraform using the version in `terraform/.terraform-version`.
2. Link the gitignored `.secrets` to `../matrix-secrets/a2f0.net`, which the
   [matrix repository](https://github.com/a2f0/matrix/blob/main/docs/secrets.md)
   manages and backs up. The Terraform scripts read the R2 state key from
   `.secrets/prod/app.env`; no AWS credentials are needed. Provide a GitHub
   token through `GITHUB_TOKEN` or the sensitive `github_token` variable.
3. The same folder holds Terraform's inputs. `terraform/apply.sh` passes
   `.secrets/prod/main.tfvars.json`, which includes `cloudflare_account_id` and
   `cloudflare_api_token` plus the separate `cloudflare_deploy_api_token`.
   `terraform/gsuite.tf` reads the Google Workspace service-account key from
   `.secrets/prod/google-credentials.json`. The entrypoint stops before
   planning when either file is missing.

Change these values in the matrix-secrets folder and back it up from the matrix
repository; never commit them here. Terraform plan files also contain secrets
and are ignored by Git. Clones that used the former SOPS decryption may still
hold plaintext `terraform/main.tfvars.json` and `terraform/google-credentials.json`.
Nothing reads them now and Git still ignores them; delete them.

### Validation and Provisioning

```sh
terraform fmt -check -recursive terraform
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
tflint --chdir terraform
```

For the real backend:

```sh
terraform/init.sh
terraform/apply.sh --dry-run
terraform/apply.sh
```

A clone initialized for the former S3 backend runs
`terraform/init.sh -reconfigure` once; the state already lives in R2, so never
migrate it.

Run the dry run first and review its non-destructive actions. The apply
entrypoint requires the real populated backend and applies only the inspected
saved plan after approval and a fresh state check. Deletions, replacements, and
missing domain state stop it. Keep the existing Worker scripts and domains;
the website uses `resume-redirect`, which owns the apex custom domain. See
[the Terraform gates](docs/dependencies.md#terraform-preview) for details.

### Dependency Updates

Follow [dependency maintenance](docs/dependencies.md) for upgrade procedures,
active compatibility constraints, overrides, and validation. Do not apply
infrastructure or deploy to validate an upgrade.
