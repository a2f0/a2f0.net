# Resume app

This workspace contains the Next.js resume, browser and unit tests, static
assets, and Cloudflare Worker configurations. Run `bun install` at the repository
root, then use root scripts such as `bun run build`, `bun run unit`, and
`bun run ci-headless`.

The production build writes its static export to `packages/resume/out/`.
See [development](../../docs/development.md) and
[deployment](../../docs/deployment.md) for the full workflow.
