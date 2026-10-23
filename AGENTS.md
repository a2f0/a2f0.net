# Repository guidance

Follow this policy when working in this repository.

## Repository Identification (Critical)

Never infer repository identity from the folder name. Always resolve the GitHub repo directly:

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
```

Use `-R "$REPO"` (or `--repo "$REPO"`) on `gh` commands when ambiguity is possible.

## Branch and Commit Rules

- Do not commit or push directly to `main`; work on a branch.
- Use `<type>/<topic>` feature branches and conventional commits.
- Do not force-push unless explicitly requested.
- Do not add AI attribution/co-author footers.

## Review Feedback (Critical)

Fix valid findings from pull request review comments, scoped to the feedback,
and run the relevant validation (`bun run compile`, `bun run unit`,
`bun run ci-headless` as needed) before committing and pushing. Then reply in
each original review thread with
`agent-tool pr threads reply <comment-id> --body-file <reply-file>`,
saying what changed and naming the fixing commit. Never reply with top-level PR
comments or `gh pr review`. Resolve a thread only when its finding is fully
addressed.

## Repo Validation Commands

The Next.js resume app is in `packages/resume`, the Next.js apex website is in
`packages/website`, and the static graffiti demo is in `packages/demo`. PR helpers come from the exact-pinned `@a2f0/agent-tool`
npm dependency; use `bun run agent-tool` from the root. Project title and CI
policy is in `agent-tool.json`. Run the root Bun scripts to check the workspaces.
Shared skills are managed in `.agents/skills` and `.claude/skills`. Run
`bun run agents:sync` after updating the dependency pin; commit the lockfile,
skills, and `.agent-tool-skills.json` together. Do not edit managed skills.

See [development](docs/development.md) for architecture and script ownership,
and [deployment](docs/deployment.md) for environments and infrastructure.

Primary checks in this repo:

- `bun run lint:md`
- `bun run compile`
- `bun run unit`
- `bun run ci-headless`
- `bun run check:architecture`
- `bun run agents:check`

Capture noisy finite checks, builds, setup, and hooks with the pinned harness,
for example `bun run agent:run --label unit -- bun run unit` or
`bun run agent:run --label pre-commit -- sh scripts/git/hooks/pre-commit`.
It preserves the command's exit status and complete private logs while returning
a compact receipt and a bounded failure excerpt. Use
`bun run agent-tool logs <log-path>` or a targeted search for more evidence;
inspect required warnings, timing, and artifacts before accepting a check.
Keep review verdicts and structured decision output visible. Do not wrap
interactive tools or persistent servers, or change test scope to reduce output.
Logs may contain secrets; keep them private and remove them when finished.

Pre-commit hook entrypoint:

- `sh ./scripts/git/hooks/pre-commit`

## Shipping and Deployment

Use the shared `$ship-pr` skill with the Node version in `.nvmrc` and Bun version
in `.mise.toml`. Agent shells should put their matching directories under
`~/.local/share/mise/installs` first on `PATH` rather than running `mise trust`.
Run the checks above and both validation hooks before shipping.
Pre-commit needs Terraform/TFLint versions from CI, ShellCheck, and yamllint.
Integrate updated bases with normal merges; do not force-push. Review with an
agent other than the one that wrote the change: Codex from Claude Code, Claude
from Codex, then the remaining CLIs, reporting any fallback.

Handle actionable review comments in their original threads using the rules
above. Every changed head requires validation and a new independent review.
Before merging, validate the PR title against the full repository commitlint
configuration with `printf '%s\n' "$PR_TITLE" | bunx --no-install commitlint`.
Then invoke
`node_modules/.bin/agent-tool pr merge '' "$REVIEWED_SHA" "$BASE_REF"` directly
because `bun run` drops empty arguments.

Per `agent-tool.json`, the merge helper requires `build` in workflow `CI` on the
reviewed head and refuses to merge unless the `main` ruleset enforces
strict status checks that the merging account cannot bypass. Recheck the live
base, PR base, and head before merging.
Verify merge ancestry and branch identities before deleting shipped branches.

After merging to `main`, wait for the `CI` deployment for that merge commit
and smoke-test `resume.a2f0.net`, `a2f0.net`, `demo.a2f0.net`, and
`drive.a2f0.net`. If using an
isolated worktree, clean up that worktree without modifying the user's checkout.
Report the independent reviewer, fallback, verdict, repairs, merge, and deploy.

## Terraform state

Terraform state lives in the Cloudflare R2 bucket `a2f0-net-terraform-state`;
no AWS credentials are needed. `terraform/init.sh`, `upgrade.sh`, and
`apply.sh` read its key, `TF_STATE_ACCESS_KEY_ID` and
`TF_STATE_SECRET_ACCESS_KEY`, from `.secrets/prod/app.env` and give it to
Terraform alone. `apply.sh` also requires `.secrets/prod/main.tfvars.json`, its
variables file, and `.secrets/prod/google-credentials.json`, which `gsuite.tf`
reads. `.secrets` is a gitignored link to `../matrix-secrets/a2f0.net`,
managed and backed up from a2f0/matrix (see its `docs/secrets.md`). Never commit
it, print its values, or edit its files. Preview with
`terraform/apply.sh --dry-run`; see
[the Terraform gates](docs/dependencies.md#terraform-preview).

## Upgrade documentation

Read [dependency maintenance](docs/dependencies.md) before upgrading. Keep the
root README focused on purpose, setup, and essential safe usage, with a short
link to that document. Reusable procedures and active constraints, override
rationale, and removal conditions belong there. Put each upgrade's version
inventory, migrations, audit/test/preview results, and skipped groups in its PR,
not README or an accumulating documentation journal. Attribute historical
findings to their PR and recheck them before claiming current status. Update or
remove maintenance guidance when constraints change.

## Markdown Linting

Markdown lint is enforced in CI and hooks:

- Script: `bun run lint:md`
- Tool: `markdownlint-cli2`
- Config: `.markdownlint-cli2.jsonc`

## Issue Handling

Do not create GitHub issues unless the user explicitly requests it.
