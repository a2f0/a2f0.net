# Testing helpers

Test helpers that more than one app's suite uses, exported by path, for
example `@a2f0/testing/axe`. Only tests may import them; the architecture check
rejects an import from shipped code.

- `axe`: audits the current page with axe-core in a WebdriverIO spec.
- `favicons`: registers a spec checking that pages link and serve the rendered
  icons.
- `clickTrackingProbe`: intercepts CT requests in a local browser preview, so a
  spec can assert that clicks send nothing.
- `standaloneClickTracking`: registers the Bun unit suite for a standalone
  app's click tracking.

Each app's suite runs these; `bun run --cwd packages/testing compile`
typechecks them.
