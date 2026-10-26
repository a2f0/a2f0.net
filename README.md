# [a2f0.net](https://a2f0.net)

## Quick Start

[mise](https://mise.jdx.dev/) installs Node from `.nvmrc` and Bun from
`.mise.toml`. CI uses the same configuration.
The resume app lives in [`packages/resume`](packages/resume), the apex website
lives in [`packages/website`](packages/website/README.md), and PR helpers come
from the pinned [agent-tool package](https://www.npmjs.com/package/@a2f0/agent-tool).
The resume data, layout, and SVG
and PDF factories live in [`packages/shared`](packages/shared/README.md). The
website opens the resume, the graffiti artwork from
[`packages/demo`](packages/demo), and other apps in desktop windows.
[`packages/drive`](packages/drive/README.md) is an independently styled file explorer
built on the published Tearleads client SDK, hosted at `drive.a2f0.net`.
Run the commands below from the repository root.

Production browser apps use CT click analytics. See
[click analytics](docs/click-tracking.md) for app dimensions, collected data,
and browser opt-outs.

```sh
mise install
bun ci
bun run start-server
```

`bun run build` builds every workspace. For the resume, it generates the
desktop SVG, then Next.js exports the site to `packages/resume/out/`.
Cloudflare Workers serves those files. The desktop SVG is included in the
exported HTML; local development and mobile layouts still generate it in the
browser. The SVG uses the bundled Arimo font for consistent build and browser
layout. PDF generation remains in the browser.

The demo at `demo.a2f0.net` displays a grayscale SVG graffiti wordmark on a
black canvas, served by Cloudflare Workers. Edit `packages/demo/public/a2f0.svg`
to refine the artwork. Its TypeScript in `packages/demo/src` renders the ASCII
view, the lens, and the toolbar's play button animations (a laser etching over
the SVG, and falling code that writes the ASCII art). Wrangler runs
`bun run build` before `dev`. The guarded deployment builds once, then previews
and publishes that same `dist/` asset tree. Preview it with
`bun run --cwd packages/demo start` on port 4002.

## Common commands

| Command | Purpose |
| --- | --- |
| `bun run build` | Build all workspace exports |
| `bun run compile` | Typecheck root scripts and workspaces |
| `bun run unit` | Test root scripts and workspaces |
| `bun run ci-headless` | Test the resume through local Cloudflare Workers |
| `bun run --cwd packages/website test` | Test the desktop website |
| `bun run --cwd packages/demo test` | Test the graffiti demo |
| `bun run --cwd packages/drive test` | Test Drive persistence and navigation |
| `bun run lint:md` | Check documentation |

See [development and testing](docs/development.md) for architecture checks,
browser debugging, and script ownership. [Deployment](docs/deployment.md)
describes environments, guarded previews, Terraform, and live verification.
Follow [dependency maintenance](docs/dependencies.md) for upgrades and active
compatibility constraints. [AGENTS.md](AGENTS.md) defines validation, review,
and shipping requirements; invoke the managed
[`ship-pr` skill](.agents/skills/ship-pr/SKILL.md) to ship a change.
