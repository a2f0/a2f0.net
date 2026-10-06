# Experiment

An experiment started in [a2f0/a2f0.net#1144](https://github.com/a2f0/a2f0.net/issues/1144):
the resume, the a2f0.net artwork, and the 3D Chicago skyline in draggable,
resizable windows from
[`@tearleads/windowing`](https://github.com/a2f0/tearleads/tree/main/packages/windowing),
deployed to `experiment.a2f0.net`.

Each window is a mini-app, defined in [`mini-apps/`](mini-apps/README.md)
in the same shape as Tearleads' mini-apps. The artwork window reads
`packages/website/public/index.html` for its markup and styles and runs the
site's own `mountSite` inside a shadow root, so the site's stylesheet and the
window stylesheets cannot restyle each other. Its controls sit in the window's
toolbar and View menu. The skyline window mounts the viewer from
[`@a2f0/skyline`](https://www.npmjs.com/package/@a2f0/skyline) in an iframe.

The app uses the published `@tearleads/windowing` package, pinned to `0.2.3`.
Install from this repository's root:

```sh
bun ci
bun run --cwd packages/experiment dev
```

The dev server listens on port 4003. `dev` and `build` first copy the
website's `a2f0.svg` into `public/`, and the skyline viewer's assets into
`public/skyline/`. `build` writes a static export to `out/`,
`start` serves it through Wrangler on the same port, and `deploy` publishes the
`experiment` Worker. `unit` runs the desktop and mini-app tests under happy-dom. Terraform
attaches the `experiment.a2f0.net` domain. CI builds and tests the app, then
deploys it on validated pushes to `production`.

Next.js builds with webpack (`--webpack`) to import the website's HTML as text
through the `?raw` resource rule. The windowing package supplies its own CSS
defaults and uses the app's React through peer dependencies.

The skyline viewer opens `/skyline/index.html` and loads its other pages
relative to it, so Wrangler serves HTML with `auto-trailing-slash`: it
redirects that page to `/skyline/`, where `drop-trailing-slash` would redirect
it to `/skyline` and send the viewer's relative URLs to the root.
