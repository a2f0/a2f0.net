# Graffiti demo

The graffiti demo served at <https://demo.a2f0.net>: a grayscale SVG graffiti
wordmark on a black canvas, served by Cloudflare Workers. The website's artwork
window runs the same markup and code inside a shadow root; see the
[website README](../website/README.md).

Edit `public/a2f0.svg` to refine the artwork. The TypeScript in `src/` renders
the ASCII view, the lens, and the toolbar's play button animations (a laser
etching over the SVG, and falling code that writes the ASCII art).
`src/main.ts` mounts the page and starts click tracking; the reusable
`mountSite` in `src/site.ts` does not track. See
[click analytics](../../docs/click-tracking.md).

## Quick start

After `bun ci` at the repository root, preview the demo on port 4002:

```sh
bun run --cwd packages/demo start   # http://localhost:4002
```

Wrangler runs `bun run build` before `dev`. The build copies `public/` into
`dist/`, renders the favicons and link-preview image there, and bundles
`src/main.ts` as `graffiti.js`.

## Commands

| Command | Purpose |
| --- | --- |
| `bun run --cwd packages/demo unit` | Unit-test `src/` |
| `bun run --cwd packages/demo test` | Serve the demo and run its browser tests |
| `bun run preview:demo` | Run the guarded deployment without publishing |
| `bun run deploy:demo` | Publish the `demo` Worker through the guard |

The guarded deployment builds once, then previews and publishes that same
`dist/` asset tree. CI deploys it on validated pushes to `main`; see
[deployment](../../docs/deployment.md).
