# Drive

A standalone file explorer at `drive.a2f0.net`, and this repository’s first
consumer of the published `@tearleads/client-sdk`. Version `0.1.45` is pinned
in the manifest and lockfile. Nothing imports the Tearleads application or a
neighboring checkout.

Drive creates an encrypted local workspace, or imports an existing Tearleads
recovery phrase. It supports folder navigation and renaming, search within a
folder, notes, file attachments, and downloads. Other Tearleads document kinds
open as read-only structured fields. The interface has its own styling.

## Development

Use the Node version in `.nvmrc` and Bun version in the root manifest:

```sh
bun ci
bun run --cwd packages/drive dev
```

Open `http://localhost:4004`. `dev` and `build` copy the SQLite module worker,
WASM, and license from the installed SDK into `public/`. Next’s webpack config
enables async WebAssembly for Loro’s development entrypoint. The production
build is a static export; Wrangler serves `out/`.

The default API is `https://api.tearleads.com`. For local API development, set
the build-time environment variable before starting Next:

```sh
NEXT_PUBLIC_TEARLEADS_API_URL=http://127.0.0.1:4005 \
  bun run --cwd packages/drive dev
```

Current Tearleads APIs allow browser SDK clients from any origin using bearer
authentication, without cookie credentials or a host-specific CORS allowlist.
The API URL also selects a separate local storage namespace. Production builds
use the default URL unless an explicit override is supplied.

## Identity and persistence

Upgrading from SDK `0.1.26` to `0.1.45` requires fresh browser storage: the SDK
rejects the older SQLite schema and does not migrate it. Before upgrading, save
your recovery phrase and download any local-only files or notes you need. Close
all Drive tabs, clear site data for `drive.a2f0.net` in your browser settings,
then reopen Drive and import your recovery phrase or create a new drive. This
deletes that browser's local identity, keys, and files. A recovery phrase restores
the identity and permits downloading synced data; it cannot recover unsynced
files. Drive never clears site data automatically.

Creating a drive generates an identity and root folder locally. It makes no
API requests until **Your identity → Connect to Tearleads**. Importing a recovery
phrase attempts to sign in to that existing identity. A failed imported login
never registers a replacement account. Reconnection uses the same identity.
Tearleads organization billing and access permissions still govern remote sync.

The SDK browser keyring holds a non-extractable wrapping key in IndexedDB.
Identity and acknowledged session context are encrypted in OPFS; no bearer
token is persisted. SQLite uses the keyring’s cipher key and persistent OPFS
backend. File bytes use the SDK’s encrypted blob store. Private history keys
are derived from the same local keyring and scoped to the API and identity.
The host requests durable browser storage, but the browser may decline.

One tab holds the workspace lock. Other tabs explain that the drive is already
open. Unmount releases the SDK, worker, and local keys. Disconnect pauses remote
sync and keeps local files. Clearing site data removes local files and keys;
a recovery phrase restores identity, not files that never reached the server.

The first release refreshes remote content on focus, every minute while visible,
and with the Refresh button. It does not yet provide sharing controls, deletion,
document moves, rich document editors, or a websocket connection.

## Validation

```sh
bun run --cwd packages/drive compile
bun run --cwd packages/drive unit
bun run --cwd packages/drive test
```

The browser test serves the production export through Wrangler. It exercises
real SDK identity creation, SQLite persistence across reload, folder and note
writes, attachment upload and verified local download, single-tab ownership,
search, renaming from All drives, recovery form errors, dialog errors, and mobile
layout. It creates no production accounts. Unit tests cover session acknowledgment
restoration, API namespace isolation, navigation, login failure, and React
startup/teardown races. Isolated host tests cover pending-login cancellation and
disconnect persistence across reopening. Root compile, unit, architecture,
dependency, Markdown, and hook checks include this workspace.

For the optional sync and identity-recovery test, start the API from a prepared
Tearleads checkout (with its dependencies and SDK built):

```sh
cd <tearleads-checkout>/packages/api
API_DATABASE=memory API_PORT=4005 BLOB_OBJECT_STORE=memory \
  API_PUBLIC_ORIGIN=http://127.0.0.1:4005 \
  API_CORS_ORIGINS=http://localhost:4004 NODE_ENV=development bun src/index.ts
```

Then start Drive with the local API URL shown above. Run `bun run --cwd packages/drive test:integration` in a third
terminal. This test refuses non-loopback API addresses before registration,
creates a disposable identity and local sync trial, then recovers that identity,
a folder, note text, and attachment bytes in a fresh browser. It does not change
production accounts or require the Tearleads checkout in CI.

## Hosting

The Worker is named `drive`. Terraform owns `drive.a2f0.net`; CI builds, tests,
and deploys the package on validated pushes to `production`. Current Tearleads
APIs allow Drive and future Experiment hosts without a separate CORS change.

Before merging a branch that first enables Drive in production CI, provision
the Worker and attach its custom domain from the reviewed, committed PR head.
The normal CI deployment requires both identities and a prior Worker deployment;
it cannot perform initial provisioning. Skip bootstrap when those identities
already exist, and verify them with the normal `preview` command instead.

Initial provisioning uses the repository’s Cloudflare credentials and guarded
deploy entrypoint:

```sh
bun run --cwd packages/drive build
bun scripts/deploy.ts drive --bootstrap-dry-run
bun scripts/deploy.ts drive --bootstrap
sh terraform/apply.sh --dry-run
sh terraform/apply.sh
```

Bootstrap verifies that neither the Worker nor its custom domain already
exists, previews the exact assets, and rechecks local and remote evidence before
creating the Worker with public development URLs disabled. Terraform then
attaches the hostname through its normal saved-plan review. Subsequent deploys
use `bun run --cwd packages/drive deploy` and require the existing identities;
`preview` performs those checks without publishing.

## Future Experiment integration

The package exports `DriveApp` as its default and `@a2f0/drive/styles.css`.
The component accepts an optional `apiBaseUrl`. A future Experiment mini-app
can import the component and stylesheet, then serve the same SDK worker/WASM
assets at its origin. Drive’s styles are scoped to its root and dialog classes.
The SDK owns storage, identity, and sync; the React components own presentation.
Storage belongs to the browser origin, so `drive.a2f0.net` and
`experiment.a2f0.net` will have separate local copies and sign in to the same
remote identity using its recovery phrase.
