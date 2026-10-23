# Development and testing

Install the pinned Node and Bun versions and run `bun ci` from the repository
root. See [deployment](deployment.md) for Workers and Terraform, and
[dependency maintenance](dependencies.md) for upgrades.

## Validation

```sh
bun run compile
bun run unit
bun run ci-headless
bun run ci-headless:staging
bun run --cwd packages/website test
bun run --cwd packages/demo test
bun run --cwd packages/drive test
bun run lint:md
bun run check:architecture
```

`ci-headless` builds the static export and runs the browser tests against
Wrangler on port 4001. It covers the resume views, downloads, menus, direct
routes, canonical URLs, search metadata, and 404 responses.
`ci-headless:staging` builds staging's export and runs the search metadata spec
against it, checking the robots meta tag, the `X-Robots-Tag` header on every
kind of response, and the missing canonical URL and sitemap. The website test exports
`packages/website` and drives its desktop and windows through Wrangler. The
demo test builds and serves `packages/demo/dist` through Wrangler and checks
that its page responds without a redirect.

The resume and demo browser suites include an `a11y.e2e.ts` spec that audits each view with
[axe-core](https://github.com/dequelabs/axe-core) against WCAG 2.2 A and AA
and axe's best practices, and drives the menus and toolbar from the keyboard.
Biome enforces all of its `a11y` lint rules on the TSX and HTML.

`bun run check:architecture` runs
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) over every
source file git doesn't ignore with the rules in `scripts/checks/architecturePolicy.ts`: no
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
Invoke the repository's [`$ship-pr` skill](../.agents/skills/ship-pr/SKILL.md) to validate, independently
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

## Script ownership

Repository policy and formatting checks live in `scripts/checks/`; guarded
Worker and Terraform entrypoints live in `scripts/deploy/`. Workspace asset
generators stay with their package under `scripts/build/`, and the resume
schema validator lives under its `scripts/checks/`. Use package scripts as the
stable interface. Keep native Terraform wrappers in `terraform/`.

## Brand images

Favicons render from the plain static SVG sources in `assets/brand/`:
`logo.svg` for the resume, website, and demo, and `drive.svg` for Drive.
The `images` targets in `agent-tool.json` declare the outputs, `favicon.svg`,
`favicon.ico`, and `apple-touch-icon.png`, and each app's `favicons` script runs
`agent-tool images build` before its dev server and build: into `public/` for
the Next.js apps and into `dist/` for the demo. The outputs are ignored; never
commit them or other binary images. Edit the sources instead, following
agent-tool's source rules (no `<style>`, `style` attributes, or text).
Each build's `og-image` script renders the 1200×630 link-preview image,
`og-image.png`, the same way: the `og-image` target from `logo.svg` and
`drive-og-image` from `drive.svg`.

## Shared tooling and hook migration

The exact npm agent-tool pin owns branch/ref checks, attribution checks, copied
hook installation, validation receipts, and shipping skills. Full commitlint,
workspace architecture, and deployment guards retain their project policy.
`bun run check:fast` runs static checks, unit tests, both validation hooks, and
the same critical-level audit gate as CI; `bun run check` additionally runs every browser suite. Existing package
aliases remain available for focused work. CI validates the explicit branch name
because its checkout may be detached.
Pre-push checks commit signatures, attribution, and full commitlint rules for
the actual pushed commit ranges, including pushes of a branch other than HEAD.
For named remotes, commits already reachable from that remote's tracking refs are
excluded, including main commits integrated with a normal merge. URL-only pushes
lack that tracking context and use the remote's old tip, or all history on first
push; use a configured named remote for the normal shipping workflow.
Direct or CI invocation with no ref tuples runs static checks only. Use
`sh scripts/git/hooks/pre-push </dev/null` for noninteractive validation; Git
supplies ref tuples itself during a real push.
Run `bun audit` separately when reviewing the documented lower-severity
dependency constraints.

Existing Husky clones have a local `core.hooksPath` of `.husky/_`. Inspect it with
`git config --local --get core.hooksPath`; only for that exact legacy value, run
`git config --local --unset core.hooksPath` before `bun install`. Installation
copies the tracked `scripts/git/hooks/` files and records their ownership. Review
any existing unmanaged hooks before using `bun run hooks:install --adopt` to
replace them with backups. Other custom paths need their own inspection. Hooks
check their installation against tracked sources before running; reinstall after
pulling hook or policy updates.
