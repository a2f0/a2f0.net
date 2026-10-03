# a2f0.net

## Quick Start

Use the Node version in `.nvmrc` and the Bun version in `package.json`.
[Install Bun](https://bun.com/docs/installation) before running these commands.
The resume app lives in [`packages/resume`](packages/resume), the apex website
lives in [`packages/website`](packages/website), and PR helpers come from the
commit-pinned [agent-tool repository](https://github.com/a2f0/agent-tool).
The resume data, layout, and SVG
and PDF factories live in [`packages/shared`](packages/shared/README.md), and
[`packages/experiment`](packages/experiment/README.md) opens the resume and
website artwork in desktop windows. Run the commands below from the repository root.

```sh
nvm use
bun ci
bun run start-server
```

`bun run build` generates the desktop SVG, then Next.js exports the site to
`packages/resume/out/`.
Cloudflare Workers serves those files. The desktop SVG is included in the
exported HTML; local development and mobile layouts still generate it in the
browser. The SVG uses the bundled Arimo font for consistent build and browser
layout. PDF generation remains in the browser.

The apex website displays a grayscale SVG graffiti wordmark on a black canvas,
served by Cloudflare Workers. Edit `packages/website/public/a2f0.svg` to refine
the artwork. Its TypeScript in `packages/website/src` renders the ASCII view,
the lens, the toolbar's play button animations (a laser etching over the SVG,
and falling code that writes the ASCII art), and the terminal window that its
square opens around the art. Wrangler runs `bun run build` before `dev` and
`deploy`, which bundles it with `public/` into `dist/`. Preview it with
`bun run --cwd packages/website start` on port 4002.

## Agent tooling

`bun ci` installs agent-tool directly from GitHub at the full commit SHA in
`package.json` and `bun.lock`; no published npm package or local build is needed.
The source CLI runs with the repository's pinned Bun version. Update that SHA
after reviewing an upstream change, then run `bun install` to refresh the lock.
`agent-tool.json` configures the 100-character title limit, the required `build`
check in workflow `CI`, and PR branding restrictions. Commit hooks validate local
commits; the shipping skills explicitly validate the PR title with the complete
commitlint configuration before GitHub generates the squash commit.

```sh
bun run agent-tool --help
bun run agent-tool review claude
bun run agent-tool review codex
bun run agent-tool pr open 'feat: describe the change' < /tmp/pr-body.md
PR_TITLE=$(gh pr view "$PR_NUMBER" -R "$REPO" --json title -q .title)
printf '%s\n' "$PR_TITLE" | bunx --no-install commitlint && \
  node_modules/.bin/agent-tool pr merge '' "$REVIEWED_SHA" "$REVIEW_BASE_REF"
```

Invoke the installed executable directly for merging because `bun run` drops
empty positional arguments. The shipping skills come from the pinned shared package in `.agents/skills`
and `.claude/skills`; project checks and rules stay in `AGENTS.md`. After updating
the dependency pin, run `bun install` and `bun run agents:sync`, then commit the
lockfile, skills, and `.agent-tool-skills.json` together. `bun run agents:check`
is a read-only hook and CI gate that rejects missing or stale managed skills.

## Testing

```sh
bun run compile
bun run unit
bun run ci-headless
bun run --cwd packages/website test
bun run lint:md
```

`ci-headless` builds the static export and runs the browser tests against
Wrangler on port 4001. It covers the resume views, downloads, menus, direct
routes, canonical URLs, and 404 responses. The website test builds and serves
`packages/website/dist` through Wrangler and checks that the apex page
responds without a resume redirect.

Both browser suites include an `a11y.e2e.ts` spec that audits each view with
[axe-core](https://github.com/dequelabs/axe-core) against WCAG 2.2 A and AA
and axe's best practices, and drives the menus and toolbar from the keyboard.
Biome enforces all of its `a11y` lint rules on the TSX and HTML.

`bun run unit` runs the shared, resume, and website unit tests. Agent helper
tests and compilation run in the standalone agent-tool repository's CI.
Invoke the repository's [`$ship-pr` skill](.agents/skills/ship-pr/SKILL.md) to validate, independently
review, and squash-merge the current PR. The production branch rule requires
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
| `production` | `bun run deploy:prod` | `resume-prod` | `resume.a2f0.net` |
| `production` | `bun run deploy:website` | `resume-redirect` | `a2f0.net` |
| `production` | `bun run --cwd packages/experiment deploy` | `experiment` | `experiment.a2f0.net` |

The experiment uses the published, pinned `@tearleads/windowing` package and
deploys alongside the resume and website after production validation succeeds.

`a2f0.net` serves the website directly. The resume remains at
`resume.a2f0.net`. The website keeps the existing Worker service name so the
apex domain stays attached when the redirect code is replaced.

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
active. Pass `--env staging` or `--env prod` when deploying the resume Worker.

## Infrastructure

Terraform uses the existing S3 state backend and manages Cloudflare custom
domains, HTTPS redirects, Google Workspace DNS records, and GitHub secrets.
Google Workspace account resources remain in the same stack. Domain
registration remains with AWS and delegates to the Cloudflare nameservers.

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
Terraform creates their custom domains. The website deploys to the existing
`resume-redirect` Worker, which already owns the apex custom domain.

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
bun update --recursive --latest
bun install
bun run compile
bun run unit
bun run ci-headless
bun audit
```

Keep package versions exact. Bun settings live in `bunfig.toml`, and
dependency build permissions live in `package.json`. Dependabot groups Bun,
Actions, and Terraform provider updates. Actions are pinned by commit SHA with
version comments.

Update `terraform/.terraform-version` and the CI Terraform version together.
Refresh providers and check the real plan:

```sh
cd terraform
terraform init -upgrade -backend-config=terraform.backend
terraform providers lock -platform=darwin_arm64 -platform=linux_amd64
terraform plan -var-file=main.tfvars
```
