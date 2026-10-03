---
name: ship-pr
description: >-
  Ship this repository's current branch end to end: validate, commit, independently
  review and repair, open or resume its PR, wait for required CI, squash merge the
  exact reviewed commit, and clean up. Use when the user asks to ship a PR or
  invokes $ship-pr. Supports --keep-branch to skip checkout/branch cleanup and
  --report-only to review without repairing, pushing, or merging.
---

# Ship PR

Adapted from `tearleads` for this repository's Bun workspace and Husky hooks.
This skill is self-contained; it does not require tearleads' other PR skills.
Use `bun run agent-tool` from the repository root for review, creation, and merge.
An invocation authorizes the normal workflow through merge and branch cleanup,
subject to the user's constraints and GitHub's protections.

## Prepare

1. Read `AGENTS.md`. Resolve the repository with
   `gh repo view --json nameWithOwner -q .nameWithOwner`, never the folder name.
   Resolve its default branch too; do not assume `main` (currently `production`).
   Work on a feature branch, preserving unrelated user changes.
2. Load Node from `.nvmrc` and Bun from `packageManager` in `package.json`.
   Run `bun ci` when needed. `gh` must be authenticated;
   review also needs an authenticated `claude` or `codex` CLI.
3. Locate the current branch's PR using `gh pr view --json
   number,url,baseRefName,headRefOid,state`. Omit `-R` for this initial lookup so
   fork PRs resolve correctly. Only an explicit no-PR result means no PR;
   authentication/network failures are errors. For later lookups derive `REPO`
   from the PR URL and use `gh pr view "$PR_NUMBER" -R "$REPO"`.
4. Record `REVIEW_BASE_REF` from the PR, or the default branch for a new PR.
   Resolve the authoritative base repository's Git URL with `gh repo view` and
   the host's configured Git protocol. Fetch that branch, record its exact OID
   as `REVIEW_BASE_OID`, and confirm it is a commit. Do not assume `origin` owns
   a fork PR's base.
5. Unless `--report-only`, integrate the base with a normal merge if needed;
   do not force-push. Resolve conflicts, then run the repository checks:

   ```sh
   bun run lint:md
   bun run compile
   bun run unit
   bun run ci-headless
   sh ./.husky/pre-commit
   sh ./.husky/pre-push
   ```

   Pre-commit requires the Terraform/TFLint versions in CI plus ShellCheck and
   yamllint. Stage only intended files and commit with a conventional message.
   Do not bypass hooks. Avoid repeating passed checks unless code or base changes
   justify it. In report-only mode review committed HEAD and identify any local
   changes it excludes; do not commit the user's work automatically.

## Independent review and repair

Record `REVIEWED_SHA=$(git rev-parse HEAD)` before invoking the reviewer. For a
Codex implementer use Claude; for a Claude implementer use Codex:

```sh
AGENT_TOOL_REVIEW_BASE_REF="$REVIEW_BASE_REF" \
AGENT_TOOL_REVIEW_BASE_OID="$REVIEW_BASE_OID" \
  bun run agent-tool solicitClaudeCodeReview
```

Use `solicitCodexReview` for the other direction or as fallback if Claude cannot
run. Helpers isolate the reviewer to a snapshot of tracked files at HEAD, using
review instructions from the trusted base. They do not grant write access or
load project hooks/plugins. Preserve their sandbox restrictions. If both CLI
reviewers are unavailable, an independent read-only sub-agent may review the
same pinned diff and tracked snapshot; record that fallback. Do not substitute
the implementing agent's self-review. Never include ignored/decrypted secrets.

Read the entire output: exit zero confirms a completed review, not approval.
Require a final verdict of CLEAN, SUGGESTION, or MINOR with no unresolved
Blocker/Major ([P0]/[P1]) findings. Fix valid findings, run relevant checks,
commit, and repeat independent review of every changed head. Explain a rejected
finding with concrete evidence and have the reviewer reassess it. Repairs have
no arbitrary round limit. Verify HEAD still equals `REVIEWED_SHA` after review.
Report-only ends here with findings and reviewed/base SHAs. If review cannot be
completed, preserve the branch and report the actual blocker.

## Open or resume and verify CI

Push the reviewed feature branch without force. For an existing PR update its
title/body to describe the final implementation; preserve relevant review
history. Otherwise write a concrete description to a temporary file and run:

```sh
bun run agent-tool openPr 'feat: describe the change' < /tmp/pr-body.md
```

Do not pass multiline descriptions through shell interpolation. Capture PR
number/URL, then verify GitHub's head equals both local HEAD and `REVIEWED_SHA`,
and its base branch equals `REVIEW_BASE_REF`. Address reviewer feedback in the
original review threads according to `AGENTS.md`.

Wait for required checks using `gh pr checks "$PR_NUMBER" --required --watch
--fail-fast -R "$REPO"`. Inspect failures, repair, validate, commit, push, and
re-review before another attempt. A missing check is not success: compare the
effective required contexts to the actual workflow jobs. Never bypass or weaken
protections to make a merge pass.

Immediately before merging:

- Read `repos/$REPO/rules/branches/{URL-encoded-base}` with `gh api`. Require
  an effective strict `required_status_checks` rule with at least one required
  check. Read its source ruleset from `repos/$REPO/rulesets/{id}` and confirm
  `enforcement` is `active` and `current_user_can_bypass` is `never`. This lets
  GitHub reject a stale base atomically if it moves after the local check.
- Fetch the authoritative base again. Its OID must equal `REVIEW_BASE_OID` and
  be an ancestor of `REVIEWED_SHA`. If it moved, integrate it without force,
  validate, commit, push, and review the new head against the new base; repeat
  these gates. Also recheck local and PR head identity and PR base identity.

## Merge and clean up

Use the helper for a synchronous, exact-head squash with the PR title as its
subject and an empty body:

```sh
node_modules/.bin/agent-tool pr merge '' "$REVIEWED_SHA" "$REVIEW_BASE_REF"
```

The helper appends the PR number and validates the subject using
`agent-tool.json`. Invoke the installed executable directly because `bun run`
drops the empty subject argument. Commit hooks enforce the complete commitlint
configuration.
Never substitute `gh pr merge`, auto-merge, or merge queues. The mutation's
`expectedHeadOid` rejects an unreviewed head. GitHub has no atomic expected-base
input, so never retarget the PR concurrently with shipping. If a stale base
causes failure, refresh, integrate, validate, and re-review; other errors leave
the PR open for diagnosis. Never clean up after a failed merge.

After GitHub reports `MERGED`, record its merge commit. Unless `--keep-branch`:

1. Confirm the worktree is clean and the feature branch still points at the
   merged PR head. Fetch the PR base and verify it contains the squash commit.
2. Switch to that base and fast-forward only. If it has local divergence or
   unrelated changes, leave those intact and report incomplete cleanup.
3. Verify the remote feature branch still points at the merged head before
   deleting it with a normal `git push <head-remote> --delete <feature-branch>`.
   Skip deletion if it advanced or disappeared. Delete the local feature branch
   only after confirming it still equals the merged head; squash merges may
   require `git branch -D` after these checks. Never delete the base/default
   branch or run `git reset --hard`/`git clean`.
4. Run `bunx --no-install husky` to reinstall hooks from the merged checkout.
   If the base is `production` or `staging`, check the ensuing Cloudflare
   deployment workflow and smoke-test its live site before reporting completion.

Report the PR link and merge commit, independent reviewer and any fallback,
repairs and checks, deployment result, and final checkout/cleanup state. Distinguish
a completed merge from any incomplete cleanup or deployment.
