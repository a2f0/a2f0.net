# Resume app

The Next.js resume served at <https://resume.a2f0.net>. This workspace contains
the app, its browser and unit tests, static assets, and Cloudflare Worker
configurations. Run `bun ci` at the repository root, then use root scripts such
as `bun run start-server` (development, on <http://localhost:4000>),
`bun run build`, `bun run unit`, and `bun run ci-headless`.

`bun run build` generates the desktop SVG, then Next.js exports the site to
`packages/resume/out/`, which Cloudflare Workers serves. The desktop SVG is
included in the exported HTML; local development and mobile layouts still
generate it in the browser. The SVG uses the bundled Arimo font for consistent
build and browser layout. PDF generation remains in the browser.

Staging's export is built with `RESUME_DEPLOY_TIER=staging`, which keeps it
out of search results; see
[search indexing](../../docs/deployment.md#search-indexing).
See [development](../../docs/development.md) and
[deployment](../../docs/deployment.md) for the full workflow.

Only the standalone production page starts CT click tracking, with the
`resume` app dimension and a constant safe page. Shared résumé components
remain inert when embedded in the website. See
[click analytics](../../docs/click-tracking.md) for collected data and opt-outs.
