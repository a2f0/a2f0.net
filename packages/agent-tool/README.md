# Agent tool

PR and independent review helpers adapted from `tearleads/packages/agent-tool`.
The app stays at the repository root; this package uses the same pinned Node,
pnpm, TypeScript, and Vitest toolchain. Install with `pnpm install` at the root.

```sh
pnpm agent-tool solicitClaudeCodeReview
pnpm agent-tool solicitCodexReview
pnpm agent-tool openPr 'feat: describe the change' < /tmp/pr-body.md
pnpm agent-tool squashMerge '' "$REVIEWED_SHA" "$REVIEW_BASE_REF"
```

Review commands require an authenticated `claude` or `codex` CLI and `gh`.
They read an immutable snapshot of tracked Git blobs; ignored credentials and
uncommitted work are excluded. Review policy comes from the base commit.
`AGENT_TOOL_REVIEW_BASE_REF` and `AGENT_TOOL_REVIEW_BASE_OID` pin the review base.
Claude defaults to `xhigh` effort and Codex to `high`; either accepts an effort
argument. A successful command means a complete review was returned: inspect
its `VERDICT` and findings before proceeding.

`openPr` reads its body from stdin and validates the title using the root
commitlint configuration. `squashMerge` performs a synchronous GraphQL squash,
keeps the commit body empty, appends `(#PR)`, and rejects queued/automatic merges.
Always supply the reviewed head SHA and base branch when shipping. The caller
must check required CI, current base, and review findings first; the helper does
not replace those gates. See the [ship-pr skill](../../.codex/skills/ship-pr/SKILL.md)
for the complete workflow, including cleanup after a confirmed merge.

Run `pnpm unit --project agent-tool` for the helper tests, or `pnpm unit` to
include the app tests. `pnpm compile` checks both packages.
