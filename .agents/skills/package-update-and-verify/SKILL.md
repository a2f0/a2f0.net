---
name: package-update-and-verify
description: Follow the shared dependency-update workflow and this repository's compatibility, validation and infrastructure-preview gates.
---

# Package Update And Verify

Use `update-dependencies` from the owning agent-tool installation when available.
For an older pin, read the Matrix workspace's shared skill and documented plan
helper, plus [the repository dependency gates](../../../docs/dependencies.md).
Do not install newer managed skill copies alongside an unresolved older pin.

1. Read `AGENTS.md`, README and linked docs; record the clean base and branch.
2. Inventory all packages, lockfiles, runtimes, Actions, patches, overrides and
   Terraform providers. Check dated official registry/release evidence and
   upstream migration instructions before selecting each compatible group.
3. Preserve exact package and full Git commit pins. Update owning packages and
   coupled peers together; use Bun to refresh locks and install artifacts.
   Keep unresolved groups held rather than using unpublished builds, stale
   registry downgrades, hand-written integrity or forced API/peer overrides.
4. Complete source migrations and meaningful behavior checks. Run documented
   compilation, unit, build, browser, hooks, skill drift and security gates.
   Record actual warnings, deprecations, unresolved advisories and unavailable
   checks; never describe fixtures as real deployment evidence.
5. Trace every local and CI mutation entrypoint. Deployment requires existing
   account/Worker/domain/binding identities and a meaningful dry run with fresh
   evidence immediately before mutation. Terraform requires the real S3 backend
   and a complete saved plan through `terraform/apply.sh --dry-run`. Never delete,
   replace or recreate infrastructure to make an upgrade pass.
6. Follow `ship-pr` only after all required validation and safety gates pass,
   including a signed commit and independent review of its exact HEAD. Keep a
   ledger for each dependency decision, check, preview and shipping gate.
