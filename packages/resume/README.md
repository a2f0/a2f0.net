# Resume app

This workspace contains the Next.js resume, browser and unit tests, static
assets, and Cloudflare Worker configurations. Run `bun install` at the repository
root, then use root scripts such as `bun run build`, `bun run unit`, and
`bun run ci-headless`.

The production build writes its static export to `packages/resume/out/`.
Staging's export is built with `RESUME_DEPLOY_TIER=staging`, which keeps it
out of search results; see
[search indexing](../../docs/deployment.md#search-indexing).
See [development](../../docs/development.md) and
[deployment](../../docs/deployment.md) for the full workflow.

Only the standalone production page starts CT click tracking, with the
`resume` app dimension and a constant safe page. Shared résumé components
remain inert when embedded in the website. See
[click analytics](../../docs/click-tracking.md) for collected data and opt-outs.
