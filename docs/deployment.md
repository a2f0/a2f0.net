# Deployment and infrastructure

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
Pull requests and manual workflow runs validate without deploying. Add
`-f preview=true` to `gh workflow run main.yml --ref <branch>` to run all five
complete guarded previews with CI credentials after validation. Use the exact
reviewed feature commit and wait for every preview target before shipping a
guard change.

Every deployment command and CI deployment uses the guard in `scripts/deploy/deploy.ts`.
It verifies existing identities and a complete preview before publishing; missing
credentials, unsafe changes, or drift stop the command. Never bypass it with a
direct Wrangler deployment. Terraform keeps ownership of custom domains. See
[the deployment and dependency gates](dependencies.md).

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

## Search indexing

The production hosts are indexable: each page's exported HTML names its
canonical URL and carries its description and link-preview tags, including
the `og-image.png` each build renders from `assets/brand/`, and each
host serves a plain-text `robots.txt`. The resume and the website also serve a
`sitemap.xml`. The resume and website pages describe themselves with JSON-LD.

`staging.a2f0.net` stays out of search results. The resume's build reads
`RESUME_DEPLOY_TIER` (`production` by default, or `staging`; see
[`packages/resume/lib/deployTier.ts`](../packages/resume/lib/deployTier.ts)).
A staging build adds a robots meta tag to every page and a `_headers` rule
that sends `X-Robots-Tag: noindex, nofollow` with every response. It names no
canonical URL and has no sitemap, and its `robots.txt` still allows crawling,
so crawlers can read those rules. `deploy:staging`, `preview:staging`, and CI's
staging builds set the tier. The deploy guard checks the assets against the
target's tier in
[`scripts/deploy/indexingPolicy.ts`](../scripts/deploy/indexingPolicy.ts): it
refuses a staging deploy without those rules, and a production deploy whose
`_headers` or root pages ask to be left out of search.

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
[the Terraform gates](dependencies.md#terraform-preview) for details.

### Dependency Updates

Follow [dependency maintenance](dependencies.md) for upgrade procedures,
active compatibility constraints, overrides, and validation. Do not apply
infrastructure or deploy to validate an upgrade.
