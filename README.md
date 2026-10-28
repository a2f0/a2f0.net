# a2f0.net

My personal website: a desktop of draggable, resizable windows
holding my resume, the a2f0 graffiti artwork, a 3D Chicago skyline, and the
dnbm drum and bass sequencer and player. On phones and narrow screens it opens
one app at a time. This repo is available on the web at <https://a2f0.net>.
It also serves:

- the resume on its own at <https://resume.a2f0.net>;
- the graffiti artwork on its own at <https://demo.a2f0.net>;
- Drive, a file explorer built on the published Tearleads client SDK, at
  <https://drive.a2f0.net>.

Production browser apps use CT click analytics. See
[click analytics](docs/click-tracking.md) for app dimensions, collected data,
and browser opt-outs.

## Quick start

Install [mise](https://mise.jdx.dev/), which installs Node from `.nvmrc` and
Bun from `.mise.toml`, as CI does. From the repository root:

```sh
mise install
bun ci                               # dependencies and Git hooks
bun run --cwd packages/website dev   # the desktop at http://localhost:4003
```

`bun run start-server` serves the resume alone at <http://localhost:4000>.
Each package's README has its own commands.

## Layout

| Package | Contents |
| --- | --- |
| [`packages/website`](packages/website/README.md) | The desktop website at `a2f0.net` |
| [`packages/resume`](packages/resume/README.md) | The Next.js resume at `resume.a2f0.net` |
| [`packages/shared`](packages/shared/README.md) | Resume data, layout, and the SVG and PDF factories |
| [`packages/demo`](packages/demo/README.md) | The graffiti artwork at `demo.a2f0.net` |
| [`packages/drive`](packages/drive/README.md) | The Drive file explorer at `drive.a2f0.net` |

The website opens the resume, the demo's artwork, and other apps in desktop
windows. Cloudflare Workers serves every site, and Terraform in `terraform/`
attaches their domains.

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
compatibility constraints.
