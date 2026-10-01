# Experiment

A prototype for [a2f0/a2f0.net#1144](https://github.com/a2f0/a2f0.net/issues/1144):
the resume in a draggable, resizable window from
[`@tearleads/windowing`](https://github.com/a2f0/tearleads/tree/main/packages/windowing),
meant for `experiment.a2f0.net`.

The package is not published yet, so this app links a local tearleads checkout
and does not build in CI. Register the package once from the checkout, then
install from this repository's root:

```sh
(cd ~/github/tearleads/packages/windowing && bun link)
bun install
bun run --cwd packages/experiment dev
```

The dev server listens on port 4003. `build` writes a static export to `out/`,
`start` serves it through Wrangler on the same port, and `deploy` publishes the
`experiment` Worker. Terraform attaches the `experiment.a2f0.net` domain.

Next.js builds with webpack (`--webpack`) because Turbopack neither follows the
`bun link` symlink nor accepts the package's component stylesheets.
`next.config.ts` pins React to this app's copy so the linked source does not
load a second one from the tearleads checkout.
