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

To develop browser tests, run these in separate terminals:

```sh
pnpm build
pnpm start-server-test
```

```sh
pnpm test -- --spec test/specs/svg.e2e.ts
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

The deployment token needs Workers Scripts Edit on the account. Terraform
also needs Workers custom-domain access, Zone Read, DNS Edit, and Zone Settings
Edit for `a2f0.net`. Creating the zone requires additional zone-creation
permission; the stack looks up a zone created beforehand.

Public `workers.dev` and preview URLs are disabled. Each Worker becomes
publicly reachable when Terraform attaches its custom domain and the zone is
active. Always pass `--env staging` or `--env prod` to Wrangler.

## Infrastructure

Terraform uses the existing S3 state backend and manages Cloudflare custom
domains, HTTPS redirects, Google Workspace DNS records, and GitHub secrets.
The existing Route 53 records remain available during DNS propagation and
rollback. Google Workspace account resources remain in the same stack.

### Setup

1. Install Terraform using the version in `terraform/.terraform-version`.
2. Install [Blackbox](https://github.com/StackExchange/blackbox).
3. Run `blackbox_decrypt_all_files` with an authorized GPG key.
4. Configure AWS credentials for the S3 backend and Route 53, plus a GitHub
   token through `GITHUB_TOKEN` or the sensitive `github_token` variable.
5. Check `terraform/main.tfvars`: it includes `cloudflare_account_id` and
   `cloudflare_api_token`. The Google Workspace service-account credentials
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
terraform plan -var-file=main.tfvars -out=migration.tfplan
terraform apply migration.tfplan
```

Review the plan before applying. The Worker scripts must already exist before
Terraform creates their custom domains.

### Vercel Migration Order

1. Create `a2f0.net` in the same Cloudflare account as the Workers. Compare its
   DNS inventory with Route 53, including mail and verification records.
2. Publish both Workers with `pnpm deploy:staging` and `pnpm deploy:prod`.
3. Import any DNS records already copied by Cloudflare's scan into their
   matching Terraform resources. Do not leave duplicate MX or TXT records.
4. Plan and apply the Terraform changes. Confirm both custom domains, all five
   Google MX records, and the Google verification TXT record exist. Custom
   domains manage the web DNS records; remove conflicting scanned web records
   if Cloudflare refuses to attach the domains.
5. Check DNSSEC at the registrar. Remove any old DS record before changing
   DNS providers, then enable Cloudflare DNSSEC and register its new DS after
   the cutover. The initial Route 53 inventory had no DNSSEC keys.
6. Update the registrar nameservers to `terraform output cloudflare_nameservers`.
   Verify Cloudflare reports the zone active and certificates ready.
7. Verify HTTPS, `/pdf`, PDF/SVG downloads, missing-route 404s, HTTP redirects,
   and the mail records on both authoritative and public DNS resolvers.
8. Keep Vercel and Route 53 available through DNS propagation and the rollback
   window. Retire them and remove the old `VERCEL_*` GitHub secrets afterward.

`migration.tf` forgets the Vercel resources and old deployment secrets with
`destroy = false`, preserving the live site during migration. The migration was applied on 2026-09-16 before removing the Vercel provider
and token from this stack. Vercel and its old GitHub secrets remain available
for rollback.

To roll back during propagation, restore the original Route 53 nameservers
at the registrar. The preserved Route 53 web records still point to Vercel.

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
