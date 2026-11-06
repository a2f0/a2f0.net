// Run in a separate Bun process so SDK mocks cannot affect SDK-backed unit tests.
import { afterEach, expect, mock, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { SessionSnapshot } from "@tearleads/client-sdk";

GlobalRegistrator.register();
Object.defineProperty(navigator, "storage", {
  value: {
    getDirectory() {
      return undefined;
    },
  },
});
const files = new Map<string, Uint8Array>();
// Holds profile writes back while set, to keep a teardown in progress.
let writeGate: Promise<void> | null = null;
let keyringError: Error | null = null;
let releases = 0;
const clients: FakeClient[] = [];
let online = true;
const networkListeners = new Set<(online: boolean) => void>();
const identity = {
  format: "tearleads.identity-key-package",
  version: 1,
  createdAt: "2026-10-11T00:00:00Z",
  signingFingerprint: "test-fingerprint",
  signingKeyPair: { signingPublicKey: "public", signingPrivateKey: "private" },
  encapsulationKeyPair: { publicKey: "public", secretKey: "private" },
};
const emptySession: SessionSnapshot = {
  authToken: null,
  containerId: "local-root",
  defaultOrganizationId: null,
  organizationId: null,
  userId: "local-user",
  isAuthenticated: false,
  isRoot: false,
  rootAcknowledgments: [],
};
class FakeSession {
  snapshot = { ...emptySession };
  userIdAcknowledged = false;
  syncEnabled = false;
  listeners = new Set<() => void>();
  get containerId() {
    return this.snapshot.containerId;
  }
  get userId() {
    return this.snapshot.userId;
  }
  get defaultOrganizationId() {
    return this.snapshot.defaultOrganizationId;
  }
  get isAuthenticated() {
    return this.snapshot.isAuthenticated;
  }
  emit() {
    for (const listener of this.listeners) listener();
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  setSyncEnabled(enabled: boolean) {
    this.syncEnabled = enabled;
  }
  setContext(context: SessionSnapshot) {
    this.snapshot = { ...context };
    this.userIdAcknowledged = !!context.userId;
    this.emit();
  }
  setUserId(userId: string | null) {
    this.snapshot = { ...this.snapshot, userId };
    this.emit();
  }
  setContainerId(containerId: string | null) {
    this.snapshot = { ...this.snapshot, containerId };
    this.emit();
  }
  registerIdentity = mock(async () => {
    this.userIdAcknowledged = true;
    return { challenge: "challenge" };
  });
  login = mock(async () => {
    this.finishLogin();
    return true;
  });
  finishLogin() {
    this.snapshot = {
      ...this.snapshot,
      authToken: "ephemeral-token",
      isAuthenticated: true,
    };
    this.emit();
  }
  logout() {
    this.snapshot = {
      ...this.snapshot,
      authToken: null,
      isAuthenticated: false,
    };
    this.emit();
  }
}
class FakeClient {
  constructor() {
    clients.push(this);
  }
  session = new FakeSession();
  identity = {
    signingFingerprint: identity.signingFingerprint,
    generate: async () => {
      return undefined;
    },
    importSeedPhrase: async () => {
      return undefined;
    },
    importKeyPackage: async () => {
      return undefined;
    },
    exportKeyPackage: async () => identity,
    destroy() {
      return undefined;
    },
  };
  network = {
    setConnectivityAuthoritative() {
      return undefined;
    },
    setOnline() {
      return undefined;
    },
    online: true,
  };
  runtime = {
    subscribe: () => () => {
      return undefined;
    },
  };
  containerContents = { workflowRuntime: () => ({}) };
  backfill = mock(() => {
    return undefined;
  });
  deviceFirst = {
    open: () => ({
      view: {
        updateRuntime() {
          return undefined;
        },
      },
      reconciler: {
        enqueueIdleBackfill: this.backfill,
        reconcileNow: async () => {
          return undefined;
        },
      },
    }),
  };
  dispose() {
    return undefined;
  }
}
const keys = {
  identityPersistenceKey: new Uint8Array(32),
  sqliteKey: new Uint8Array(32),
  blobStoreKey: new Uint8Array(32),
  deriveKey: async () => new Uint8Array(32),
  dispose() {
    return undefined;
  },
};
mock.module("@tearleads/client-sdk", () => ({
  Tearleads: FakeClient,
  createBrowserLocalKeyring: () => {
    if (keyringError) throw keyringError;
    return {
      loadSession: async () => keys,
      getOrCreateSession: async () => keys,
      close() {
        return undefined;
      },
    };
  },
  createEncryptedBlobStore: (namespace: string) => ({
    readBytes: async (key: string) => files.get(`${namespace}/${key}`) ?? null,
    writeBytes: async (key: string, bytes: Uint8Array) => {
      await writeGate;
      files.set(`${namespace}/${key}`, bytes.slice());
    },
  }),
  createBrowserNetworkStatusSource: () => ({
    getOnline: () => online,
    subscribe: (listener: (online: boolean) => void) => {
      networkListeners.add(listener);
      return () => networkListeners.delete(listener);
    },
  }),
}));
let crashWorker: ((error: Error) => void) | undefined;
mock.module("@tearleads/client-sdk/sqlite", () => ({
  createSQLiteRuntime: () => ({
    subscribeWorkerError(listener: (error: Error) => void) {
      crashWorker = listener;
      return () => {
        crashWorker = undefined;
      };
    },
    client: {
      init: async () => {
        return undefined;
      },
    },
    id: "test-db",
    destroy() {
      return undefined;
    },
    terminateNow() {
      return undefined;
    },
  }),
  PERSISTENT_STORAGE_POLICY: {},
  requestPersistentStorage: async () => {
    return undefined;
  },
}));
mock.module("../src/browserLock", () => ({
  acquireDriveLock: async () => () => {
    releases += 1;
  },
}));
const { openDrive } = await import("../src/host");
const api = "https://api.example.test";
afterEach(() => {
  files.clear();
  clients.length = 0;
  online = true;
  networkListeners.clear();
  writeGate = null;
  keyringError = null;
  releases = 0;
});

function persistedProfile() {
  const bytes = [...files.values()][0];
  if (!bytes) throw new Error("Expected the host to save its profile");
  return JSON.parse(new TextDecoder().decode(bytes));
}

test("disconnect cancels a pending login, clears its late token, and stays disconnected after reopen", async () => {
  const errors = mock(() => {
    return undefined;
  });
  const host = await openDrive(api, errors, { kind: "create" });
  if (!host) throw new Error("Host did not open");
  const client = clients[0];
  const started = Promise.withResolvers<void>();
  const response = Promise.withResolvers<void>();
  client.session.login = mock(async () => {
    started.resolve();
    await response.promise;
    client.session.finishLogin();
    return true;
  });
  const connecting = host.connect();
  await started.promise;
  await host.disconnect();
  response.resolve();
  await connecting;
  await host.close();
  expect(client.session.snapshot.authToken).toBeNull();
  expect(client.session.isAuthenticated).toBe(false);
  expect(client.session.syncEnabled).toBe(false);
  expect(client.backfill).not.toHaveBeenCalled();
  expect(persistedProfile().connect).toBe(false);
  expect(persistedProfile().session.authToken).toBeNull();
  const reopened = await openDrive(api, errors);
  expect(reopened).not.toBeNull();
  expect(clients[1].session.login).not.toHaveBeenCalled();
  expect(clients[1].session.syncEnabled).toBe(false);
  await reopened?.close();
  expect(errors).not.toHaveBeenCalled();
});

test("disconnect shuts down established sync and persists the choice across reopen", async () => {
  const host = await openDrive(
    api,
    () => {
      return undefined;
    },
    { kind: "create" },
  );
  if (!host) throw new Error("Host did not open");
  await host.connect();
  expect(clients[0].session.syncEnabled).toBe(true);
  expect(clients[0].backfill).toHaveBeenCalledTimes(1);
  expect(persistedProfile().connect).toBe(true);
  expect(persistedProfile().session.authToken).toBeNull();
  await host.disconnect();
  expect(clients[0].session.syncEnabled).toBe(false);
  expect(clients[0].session.snapshot.authToken).toBeNull();
  await host.close();
  expect(persistedProfile().connect).toBe(false);
  const reopened = await openDrive(api, () => {
    return undefined;
  });
  expect(reopened).not.toBeNull();
  expect(clients[1].session.login).not.toHaveBeenCalled();
  expect(clients[1].session.syncEnabled).toBe(false);
  await reopened?.close();
});

test("a previously connected drive opened offline reconnects when the network returns", async () => {
  const host = await openDrive(api, () => undefined, { kind: "create" });
  if (!host) throw new Error("Host did not open");
  await host.connect();
  await host.close();
  online = false;
  const errors = mock(() => undefined);
  const reopened = await openDrive(api, errors);
  expect(reopened).not.toBeNull();
  const client = clients[1];
  expect(client.session.login).not.toHaveBeenCalled();
  expect(client.session.syncEnabled).toBe(false);
  const backfill = Promise.withResolvers<void>();
  client.backfill.mockImplementation(() => {
    backfill.resolve();
    return undefined;
  });
  online = true;
  for (const listener of networkListeners) listener(true);
  await backfill.promise;
  expect(client.session.login).toHaveBeenCalledTimes(1);
  expect(client.session.registerIdentity).not.toHaveBeenCalled();
  expect(client.session.isAuthenticated).toBe(true);
  expect(client.session.syncEnabled).toBe(true);
  await reopened?.disconnect();
  for (const listener of networkListeners) listener(false);
  for (const listener of networkListeners) listener(true);
  expect(client.session.login).toHaveBeenCalledTimes(1);
  expect(client.session.syncEnabled).toBe(false);
  await reopened?.close();
  expect(errors).not.toHaveBeenCalled();
});

test("pausing a saved connection while offline prevents login when connectivity returns", async () => {
  const host = await openDrive(api, () => undefined, { kind: "create" });
  if (!host) throw new Error("Host did not open");
  await host.connect();
  await host.close();
  online = false;
  const reopened = await openDrive(api, () => undefined);
  if (!reopened) throw new Error("Host did not reopen");
  expect(reopened.connection.getSnapshot()).toBe(true);
  expect(clients[1].session.isAuthenticated).toBe(false);
  const changes = mock(() => undefined);
  const unsubscribe = reopened.connection.subscribe(changes);
  await reopened.disconnect();
  expect(changes).toHaveBeenCalled();
  expect(reopened.connection.getSnapshot()).toBe(false);
  online = true;
  for (const listener of networkListeners) listener(true);
  expect(clients[1].session.login).not.toHaveBeenCalled();
  expect(clients[1].session.syncEnabled).toBe(false);
  unsubscribe();
  await reopened.close();
  const restored = await openDrive(api, () => undefined);
  expect(restored?.connection.getSnapshot()).toBe(false);
  expect(clients[2].session.login).not.toHaveBeenCalled();
  await restored?.close();
});

test("a first failed connection retries when online without registering again", async () => {
  online = false;
  const host = await openDrive(api, () => undefined, { kind: "create" });
  if (!host) throw new Error("Host did not open");
  const client = clients[0];
  client.session.login.mockRejectedValueOnce(new Error("Offline"));
  await expect(host.connect()).rejects.toThrow("Offline");
  expect(host.connection.getSnapshot()).toBe(true);
  const backfill = Promise.withResolvers<void>();
  client.backfill.mockImplementation(() => {
    backfill.resolve();
    return undefined;
  });
  online = true;
  for (const listener of networkListeners) listener(true);
  await backfill.promise;
  expect(client.session.registerIdentity).toHaveBeenCalledTimes(1);
  expect(client.session.login).toHaveBeenCalledTimes(2);
  expect(client.session.syncEnabled).toBe(true);
  await host.close();
});

test("a keyring that cannot start releases the drive lock", async () => {
  keyringError = new Error("Storage is blocked");
  await expect(openDrive(api, () => undefined)).rejects.toThrow(
    "Storage is blocked",
  );
  expect(releases).toBe(1);
});

test("a second close waits for the first close to release the lock", async () => {
  const host = await openDrive(api, () => undefined, { kind: "create" });
  if (!host) throw new Error("Host did not open");
  const gate = Promise.withResolvers<void>();
  writeGate = gate.promise;
  // A session change starts a profile write that the teardown waits for.
  clients[0].session.setUserId("changed-user");
  const first = host.close();
  let secondDone = false;
  const second = host.close().then(() => {
    secondDone = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(secondDone).toBe(false);
  expect(releases).toBe(0);
  gate.resolve();
  await Promise.all([first, second]);
  expect(releases).toBe(1);
});

test("a SQLite worker crash closes the host and settles closed after the lock is released", async () => {
  const errors = mock(() => undefined);
  const host = await openDrive(api, errors, { kind: "create" });
  if (!host) throw new Error("Host did not open");
  expect(typeof host.closed?.then).toBe("function");
  crashWorker?.(new Error("Worker crashed"));
  await host.closed;
  expect(errors).toHaveBeenCalledWith("Worker crashed");
  expect(releases).toBe(1);
});
