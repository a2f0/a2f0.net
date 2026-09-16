# Resume

## Quick Start

Use the Node version in `.nvmrc` and the pnpm version in `package.json`.

```sh
nvm use
npm install --global pnpm@12.4.2
pnpm install --frozen-lockfile
pnpm start-server
```

Next.js exports the site to `out/`. Cloudflare Workers serves those files;
PDF and SVG generation runs in the browser.

## Testing

```sh
pnpm compile
pnpm unit
pnpm ci-headless
pnpm lint:md
```

`ci-headless` builds the static export and runs the browser tests against
Wrangler on port 4001. It covers the resume views, downloads, menus, direct
routes, canonical URLs, and 404 responses.

`pnpm unit` runs both the app tests and the Node-based tests in
[`packages/agent-tool`](packages/agent-tool/README.md). Invoke the repository's
[`$ship-pr` skill](.codex/skills/ship-pr/SKILL.md) to validate, independently
review, and squash-merge the current PR. The production branch rule requires
the stable `build` CI check with the branch up to date before merging.

To develop browser tests, run these in separate terminals:

```sh
pnpm build
pnpm start-server-test
```

```sh
pnpm test -- --spec test/specs/svg.e2e.ts
```

To run the same browser suite against a deployed site:

```sh
pnpm exec wdio run wdio.headless.conf.ts --baseUrl https://a2f0.net
```

To preview the production build locally on port 4000:

```sh
pnpm build
pnpm start
```

Spell check against the
[aspell definition in dotfiles](https://github.com/a2f0/dotfiles/blob/main/files/aspell.en.pws):

```sh
aspell --master=en_US --lang=en_US -c resume.json
```

## Cloudflare Deployment

This follows the Workers static-assets setup in `tearleads` and
`devopsrockstars`: Wrangler publishes assets, and Terraform attaches domains.
The [Next.js static export](https://nextjs.org/docs/pages/guides/static-exports)
is served using Cloudflare's
[static site routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).

| Branch | Command | Worker | Domain |
| --- | --- | --- | --- |
| `staging` | `pnpm deploy:staging` | `resume-staging` | `staging.a2f0.net` |
| `production` | `pnpm deploy:prod` | `resume-prod` | `a2f0.net` |

Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your environment for
local deployments. GitHub Actions uses repository secrets with the same names
and deploys only after validation succeeds on pushes to those two branches.
Pull requests and manual workflow runs validate without deploying.

Use separate tokens: `cloudflare_deploy_api_token` needs only Workers Scripts
Edit on the account and populates the Actions `CLOUDFLARE_API_TOKEN` secret.
CI exposes it only to Wrangler, after installation and the build finish.
The Terraform provider uses `cloudflare_api_token`, which also needs Workers
custom-domain access, Zone Read, DNS Edit, and Zone Settings Edit for `a2f0.net`.
Creating the zone requires additional zone-creation permission; the stack looks
up a zone created beforehand. Both tokens are stored in Blackbox.

Public `workers.dev` and preview URLs are disabled. Each Worker becomes
publicly reachable when Terraform attaches its custom domain and the zone is
active. Always pass `--env staging` or `--env prod` to Wrangler.

## Infrastructure

Terraform uses the existing S3 state backend and manages Cloudflare custom
domains, HTTPS redirects, Google Workspace DNS records, and GitHub secrets.
Google Workspace account resources remain in the same stack. The retired
Vercel project and Route 53 hosted zone have been removed. Domain registration
remains with AWS and delegates to the Cloudflare nameservers; the S3 state
backend remains active.

### Setup

1. Install Terraform using the version in `terraform/.terraform-version`.
2. Install [Blackbox](https://github.com/StackExchange/blackbox).
3. Run `blackbox_decrypt_all_files` with an authorized GPG key.
4. Configure AWS credentials for the S3 backend, plus a GitHub
   token through `GITHUB_TOKEN` or the sensitive `github_token` variable.
5. Check `terraform/main.tfvars`: it includes `cloudflare_account_id` and
   `cloudflare_api_token` plus the separate `cloudflare_deploy_api_token`.
   The Google Workspace service-account credentials
   are encrypted separately as `terraform/google-credentials.json.gpg`.

To change encrypted variables, use `blackbox_edit_start terraform/main.tfvars`,
edit the file, and run `blackbox_edit_end terraform/main.tfvars`. Commit only
the encrypted `.gpg` file. Terraform plan files also contain secrets and are
ignored by Git.

### Validation and Provisioning

```sh
terraform fmt -check -recursive terraform
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
tflint --chdir terraform
```

For the real backend:

```sh
cd terraform
terraform init -backend-config=terraform.backend
terraform plan -var-file=main.tfvars -out=infrastructure.tfplan
terraform apply infrastructure.tfplan
```

Review the plan before applying. The Worker scripts must already exist before
Terraform creates their custom domains.

### Hosting Retirement

The Cloudflare cutover and legacy hosting retirement completed on 2026-09-16.
Both domains serve Workers, and Cloudflare holds the Google mail and
verification records. The old Vercel project, Route 53 hosted zone, `VERCEL_*`
Actions secrets, and unused `DOMAIN_STAGING` Actions secret were removed after
verifying the production deployment, DNS delegation, HTTPS, and mail records.
Terraform now manages only the active Cloudflare, GitHub, and Google Workspace
resources; its S3 backend is independent of the retired Route 53 DNS service.
The retirement was applied and the legacy state entries removed before dropping
the AWS provider and the already-applied Vercel migration blocks.

### Dependency Updates

```sh
pnpm up --latest
pnpm install
pnpm compile
pnpm unit
pnpm ci-headless
pnpm audit
```

Keep package versions exact. pnpm settings and dependency build permissions
live in `pnpm-workspace.yaml`. Dependabot groups npm, Actions, and Terraform
provider updates. Actions are pinned by commit SHA with version comments.

Update `terraform/.terraform-version` and the CI Terraform version together.
Refresh providers and check the real plan:

```sh
cd terraform
terraform init -upgrade -backend-config=terraform.backend
terraform providers lock -platform=darwin_arm64 -platform=linux_amd64
terraform plan -var-file=main.tfvars
```
