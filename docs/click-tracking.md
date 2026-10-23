# Click analytics

CT records clicks for the production website and standalone apps:

| Origin | Site | App | Environment |
| --- | --- | --- | --- |
| `https://a2f0.net` | `a2f0-net` | `website` or the existing mini-app boundary | `production` |
| `https://resume.a2f0.net` | `a2f0-net` | `resume` | `production` |
| `https://demo.a2f0.net` | `a2f0-net` | `demo` | `production` |
| `https://drive.a2f0.net` | `a2f0-net` | `drive` | `production` |

Each standalone browser entrypoint explicitly initializes the pinned
`@a2f0/ct-client` after mounting. Imports and reusable components stay inert.
Next.js starts and cleans up its tracker in the app-level React effect; the
demo starts it only in `src/main.ts`, outside its reusable `mountSite`.
Embedding the résumé, demo, or Drive therefore leaves tracking to the host.
The existing apex website's tracker and app boundaries are unchanged.

Collection requires a production build and the exact HTTPS origin above.
Development, tests, SSR, local previews, other hostnames, and the résumé's
staging hostname do not start it. The demo's build explicitly selects Bun's
production mode. No tracking listener is registered merely by importing code.

Standalone apps always send `page: /`, including the résumé's PDF view.
They never send filenames, folder paths, document IDs, link URLs, query strings,
fragments, rendered text, form values, recovery phrases, or account identity.
Events contain a random event ID, timestamp, app, safe page, element tag, and
an optional explicit static label. Editable fields, ignored descendants, and
synthetic clicks are excluded. Clicks are queued and flushed to
`https://ct.a2f0.net/v1/clicks`.

These sites deliberately override Global Privacy Control. Do Not Track,
the [CT browser extension](https://github.com/a2f0/ct/blob/main/packages/extension/README.md),
CT's local opt-out, and automated-browser exclusion still prevent collection.

Tearleads, LLC operates CT on Cloudflare. The collector records the request IP
and approximate country, region, and city supplied by Cloudflare. Click data
is retained for 90 days and the dashboard requires an authenticated admin.
See [CT's data policy](https://github.com/a2f0/ct/blob/main/docs/privacy.md)
for details and opt-outs. This describes CT only; the résumé's existing Google
Analytics integration is separate.

Unit tests intercept transport while exercising the real client. Standalone
browser tracking tests intercept collection and exercise real controls without
the WebDriver signal, proving built local previews stay inactive. Deployment
checks also intercept collector requests before making real clicks; verification
must never write test events to the production collector.
