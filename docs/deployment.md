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
It lacks Zone → Single Redirect → Edit (Dynamic URL Redirects Write), so the
[www redirect](#www-redirect) is managed outside Terraform.
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
The website's copies of other sites' pages stay out of its sitemap: the dnbm
pages under `/dnbm/` name `dnbm.a2f0.net` as canonical, as `@a2f0/dnbm` gives
them from 0.4.10, so search engines treat them as that site's duplicates and
the copies stay indexable. The skyline viewer's copies under `/skyline/` stay
out of search: `@a2f0/skyline` marks its pages `noindex`, and the website's
[`public/_headers`](../packages/website/public/_headers) sends
`X-Robots-Tag: noindex, nofollow` for `/skyline` and `/skyline/*`, so the
copy's scripts, models, images, and redirects carry it too.

Each Next.js app's error page, `pages/404.tsx`, exports as `404.html`, which
Workers also serves at `/404` with a 200. It is the one page of a production
host's own that asks to be left out of search: it carries
`<meta name="robots" content="noindex">` and names no canonical URL or
`og:url`, and no sitemap lists it. The resume's `_document.tsx` adds the tag
for each tier (see `robotsDirectives`), and Drive's and the website's
`_app.tsx` swap it for the canonical. The resume and Drive serve the page,
with a 404, for every missing path (`not_found_handling: "404-page"`). The
website's routed shell answers missing paths with the desktop instead, and
the demo exports no error page: its missing paths, `/404` included, answer
an empty 404.

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
`_headers` or root pages ask to be left out of search. It makes two
exceptions. The root page `404.html` (`ERROR_PAGE`) may carry a noindex robots
meta tag; every other root page that does still stops a deploy, and so does a
`_headers` rule for `/404`. A target's `noindexPatterns` in
[`scripts/deploy/deployPolicy.ts`](../scripts/deploy/deployPolicy.ts) name the
`_headers` patterns it may keep out of search: only the website has any, and
they name exactly the two skyline patterns, so a noindex rule for `/*`, the
site's own pages, or `/dnbm/*` still stops a deploy.

## Infrastructure

Terraform keeps state in the Cloudflare R2 bucket `a2f0-net-terraform-state`
and manages Cloudflare custom domains, HTTPS redirects, Google Workspace DNS
records, and GitHub secrets. Google Workspace account resources remain in the
same stack. Domain registration remains with AWS and delegates to the Cloudflare
nameservers. The [www redirect](#www-redirect) is the one zone behavior managed
outside Terraform.

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

### www Redirect

`www.a2f0.net` answers HTTP and HTTPS requests with a 301 to
`https://a2f0.net`, keeping the path and query string. Terraform's
`always_use_https` setting doesn't cover it, and nothing about it is in
Terraform: `cloudflare_api_token` lacks Zone → Single Redirect → Edit, so it
was created on 2026-10-24 with the [`cf` CLI](https://github.com/cloudflare/cf)
under the account owner's login. It consists of:

- the zone's `http_request_dynamic_redirect` entry point ruleset, `Redirects`
  (ID `e4f31148f01741b98e13b4a216e2c1ea`), with one rule, ref `www_to_apex`,
  that matches `(http.host eq "www.a2f0.net")` and redirects with status 301
  to `concat("https://a2f0.net", http.request.uri.path)`, preserving the query
  string;
- a proxied `AAAA` record `www.a2f0.net` → `100::`
  (ID `fddb23e2502433994776ea7336c97a6b`), so the name resolves to Cloudflare.

To recreate it, save the rule as `rules.json`:

```json
[
  {
    "ref": "www_to_apex",
    "description": "www.a2f0.net to a2f0.net",
    "expression": "(http.host eq \"www.a2f0.net\")",
    "action": "redirect",
    "action_parameters": {
      "from_value": {
        "status_code": 301,
        "preserve_query_string": true,
        "target_url": {
          "expression": "concat(\"https://a2f0.net\", http.request.uri.path)"
        }
      }
    }
  }
]
```

Then, with a login that can edit single redirects, replace the entry point's
rules, and create the record only if it is missing:

```sh
cf rulesets entrypoint update http_request_dynamic_redirect -z a2f0.net \
  --name Redirects \
  --description 'Single redirects (managed with cf, see the repository docs)' \
  --rules @rules.json
cf dns records create -z a2f0.net --body '{"type":"AAAA","name":"www.a2f0.net","content":"100::","proxied":true,"ttl":1,"comment":"Redirected to the apex by the Redirects ruleset (managed with cf)"}'
```

The update replaces every rule in the phase, so keep any other redirect in
`rules.json`. A zone has one entry point ruleset per phase. Once the Terraform
token gains that permission, a Terraform-managed redirect must import this
ruleset and the record by the IDs above rather than create new ones.

Check it live:

```sh
curl -sI https://www.a2f0.net/ | grep -i '^location'
```

It prints `location: https://a2f0.net/`.

### Dependency Updates

Follow [dependency maintenance](dependencies.md) for upgrade procedures,
active compatibility constraints, overrides, and validation. Do not apply
infrastructure or deploy to validate an upgrade.
