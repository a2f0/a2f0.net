# Agent Notes (Codex)

This file is for Codex guidance in this repository.

## Repository Identification (Critical)

Never infer repository identity from the folder name. Always resolve the GitHub repo directly:

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
```

Use `-R "$REPO"` (or `--repo "$REPO"`) on `gh` commands when ambiguity is possible.

## Branch and Commit Rules

- Do not commit or push directly to `main`; work on a branch.
- Use conventional commits.
- Do not force-push unless explicitly requested.
- Do not add AI attribution/co-author footers.

## PR Review Thread Replies (Critical)

When addressing Gemini or reviewer feedback:

- Always reply inside the original review thread.
- Never use top-level PR comments for review feedback replies.
- Never use `gh pr review` to reply to individual review comments.
- Use the PR comment reply endpoint:
  - `POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/replies`
- Tag `@gemini-code-assist` in replies intended for Gemini.
- Include what changed and the commit SHA when relevant.

## Addressing Gemini Feedback Workflow

1. Determine repo and PR number for the current branch.
2. Fetch unresolved review threads (`reviewThreads`) and prioritize Gemini comments.
3. Implement fixes scoped to valid feedback.
4. Run relevant validation (`bun run compile`, `bun run unit`, `bun run ci-headless` as needed).
5. Commit and push.
6. Reply in each addressed thread via the REST reply endpoint.
7. Resolve threads only when fully addressed.

## Repo Validation Commands

The Next.js resume app is in `packages/resume` and the static apex website is in
`packages/website`. PR helpers come from the commit-pinned `a2f0/agent-tool`
GitHub dependency; use `bun run agent-tool` from the root. Project title and CI
policy is in `agent-tool.json`. Run the root Bun scripts to check the workspaces.
Shared skills are managed in `.agents/skills` and `.claude/skills`. Run
`bun run agents:sync` after updating the dependency pin; commit the lockfile,
skills, and `.agent-tool-skills.json` together. Do not edit managed skills.

Primary checks in this repo:

- `bun run lint:md`
- `bun run compile`
- `bun run unit`
- `bun run ci-headless`
- `bun run agents:check`

Pre-commit hook entrypoint:

- `sh ./.husky/pre-commit`

## Shipping and Deployment

Use the shared `$ship-pr` skill with the Node version in `.nvmrc` and Bun version
in `package.json`. Run the checks above and both Husky hooks before shipping.
Pre-commit needs Terraform/TFLint versions from CI, ShellCheck, and yamllint.
Integrate updated bases with normal merges; do not force-push. For Codex prefer
Claude review and fall back to the independent Codex CLI if unavailable.

Handle actionable review-bot feedback in its original threads using the rules
above; allow configured bots at least 60 seconds to respond. Every changed head
requires validation and a new independent review. Before merging, validate the
PR title against the full repository commitlint configuration with
`printf '%s\n' "$PR_TITLE" | bunx --no-install commitlint`. Then invoke
`node_modules/.bin/agent-tool pr merge '' "$REVIEWED_SHA" "$BASE_REF"` directly
because `bun run` drops empty arguments.

Require the production branch's effective strict required-check rule to remain
active without a current-user bypass, and require `build` in workflow `CI` on
the reviewed head. Recheck the live base, PR base, and head before merging.
Verify merge ancestry and branch identities before deleting shipped branches.

After merging to `production`, wait for the `CI` deployment for that merge commit
and smoke-test `resume.a2f0.net`, `a2f0.net`, and `experiment.a2f0.net`. If using an
isolated worktree, clean up that worktree without modifying the user's checkout.
Report the independent reviewer, fallback, verdict, repairs, merge, and deploy.

## Markdown Linting

Markdown lint is enforced in CI and hooks:

- Script: `bun run lint:md`
- Tool: `markdownlint-cli2`
- Config: `.markdownlint-cli2.jsonc`

## Issue Handling

Do not create GitHub issues unless the user explicitly requests it.
