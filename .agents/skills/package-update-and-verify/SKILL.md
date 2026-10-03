---
name: package-update-and-verify
description: Update JavaScript/TypeScript project dependencies in package.json and verify project health end-to-end. Use when asked to update all dependencies (or most dependencies), refresh lockfiles, ensure TypeScript compiles, and confirm unit and integration tests pass before finishing.
---

# Package Update And Verify

Execute a full dependency refresh workflow and do not declare success until TypeScript and tests are green.

## Workflow

1. Identify package manager and commands.

- Prefer `bun` when `bun.lock` exists.
- Use `npm` when `package-lock.json` exists.
- Use `yarn` when `yarn.lock` exists.
- If none are present, infer from `packageManager` in `package.json`; otherwise use `npm`.

1. Snapshot current state.

- Record `git status --short`.
- Inspect existing scripts in `package.json` to find compile/typecheck/unit/integration commands.

1. Update dependency versions in `package.json`.

- `bun`: run `bun update --recursive --latest`.
- `npm`: run `npx npm-check-updates -u` then `npm install`.
- `yarn`: run `yarn up '*' --latest`.
- If the user asks for stricter scope (for example, no major bumps), honor that scope.

1. Install and refresh lockfile.

- Run package-manager install command after version changes.
- Ensure lockfile changes are included with `package.json` updates.

1. Ensure TypeScript compiles.

- Prefer existing script in this order: `typecheck`, `check-types`, `build` (if it runs `tsc`).
- If no suitable script exists, run `bunx --no-install tsc --noEmit`.
- Fix compile issues introduced by upgrades.

1. Ensure tests pass.

- Run unit tests first (`test:unit`, `unit`, or equivalent).
- Run integration tests next (`test:integration`, `integration`, or equivalent).
- If the project has a single test command, run it and confirm it covers both levels when possible.
- Fix dependency-related test failures and rerun until green.

1. Report and hand off.

- Summarize updated dependency groups and any notable major-version migrations.
- Report exact verification commands executed and their status.
- List files changed (at minimum `package.json` and lockfile).

## Execution Rules

- Prefer minimal code changes required to restore compile/test compatibility after upgrades.
- Do not silently skip failing checks; either fix them or report blockers clearly.
- Keep edits scoped to dependency upgrades and required compatibility changes unless user asks for broader refactors.
- If unit or integration scripts are missing, state that explicitly and run the closest available test target.
