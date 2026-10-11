import {
  createBrowserLocalKeyring,
  createBrowserNetworkStatusSource,
  createEncryptedBlobStore,
  type DeviceFirstContainerContents,
  Tearleads,
} from "@tearleads/client-sdk";
import {
  createSQLiteRuntime,
  PERSISTENT_STORAGE_POLICY,
  requestPersistentStorage,
} from "@tearleads/client-sdk/sqlite";
import { authenticateDrive } from "./authentication";
import { acquireDriveLock } from "./browserLock";
import { errorMessage, readProfile, restoreSession } from "./profile";

export interface DriveHost {
  apiBaseUrl: string;
  client: Tearleads;
  contents: DeviceFirstContainerContents;
  connection: {
    getSnapshot(): boolean;
    subscribe(listener: () => void): () => void;
  };
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  close(): Promise<void>;
}

export type OpenDriveInput =
  | { kind: "create" }
  | { kind: "import"; seedPhrase: string };

export async function openDrive(
  apiBaseUrl: string,
  reportError: (message: string) => void,
  input?: OpenDriveInput,
): Promise<DriveHost | null> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(apiBaseUrl),
  );
  const namespace = `a2f0-drive-${Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24)}`;
  const releaseLock = await acquireDriveLock(namespace);
  const keyring = createBrowserLocalKeyring();
  const scope = { namespace };
  let keys: Awaited<ReturnType<typeof keyring.loadSession>> = null;
  let sqlite: ReturnType<typeof createSQLiteRuntime> | undefined;
  let client: Tearleads | undefined;
  const cleanup: (() => void)[] = [];
  let writes = Promise.resolve();
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    for (const stop of cleanup) stop();
    client?.dispose();
    await writes.catch(() => undefined);
    client?.identity.destroy();
    sqlite?.destroy();
    keys?.dispose();
    keyring.close?.();
    releaseLock();
  };
  try {
    keys = await keyring.loadSession(scope);
    if (!keys && !input) {
      await close();
      return null;
    }
    keys ??= await keyring.getOrCreateSession(scope);
    const localKeys = keys;
    const profileStore = createEncryptedBlobStore(`${namespace}-identity`, {
      key: keys.identityPersistenceKey,
    });
    const saved = await profileStore.readBytes("profile");
    let profile = saved ? readProfile(saved, apiBaseUrl) : null;
    if (profile && input)
      throw new Error(
        "A drive is already saved in this browser. Open it to continue.",
      );
    if (!profile && !input) {
      await close();
      return null;
    }
    if (!navigator.storage?.getDirectory)
      throw new Error(
        "Private file storage is unavailable. Open Drive in a regular browser window.",
      );
    sqlite = createSQLiteRuntime({ workerUrl: "/worker.js" });
    await sqlite.client.init({
      dbName: `/${namespace}.db`,
      cipher: "chacha20",
      key: keys.sqliteKey,
      persistence: "opfs-sahpool",
    });
    const tearleads = new Tearleads({
      apiBaseUrl,
      database: { client: sqlite.client, id: sqlite.id },
      blobStoreFactory: (fingerprint) =>
        createEncryptedBlobStore(`${namespace}-${fingerprint}`, {
          key: localKeys.blobStoreKey,
        }),
      principalHistoryKeyProvider: ({
        identityTrustDomain,
        signingFingerprint,
      }) =>
        localKeys.deriveKey(
          `history:${identityTrustDomain}:${signingFingerprint}`,
        ),
      logger: {
        log: () => undefined,
        logError: (message, cause) => {
          if (!closed)
            reportError(
              cause
                ? `${String(message)}: ${errorMessage(cause)}`
                : String(message),
            );
        },
      },
    });
    client = tearleads;
    tearleads.session.setSyncEnabled(false);
    if (profile) {
      await tearleads.identity.importKeyPackage(profile.identity);
      restoreSession(tearleads, profile);
    } else {
      if (input?.kind === "import")
        await tearleads.identity.importSeedPhrase(input.seedPhrase);
      else await tearleads.identity.generate();
      profile = {
        version: 1,
        apiBaseUrl,
        identity: await tearleads.identity.exportKeyPackage(),
        session: tearleads.session.snapshot,
        userIdAcknowledged: tearleads.session.userIdAcknowledged,
        imported: input?.kind === "import",
        connect: input?.kind === "import",
      };
    }
    const current = profile;
    const persist = () => {
      current.session = {
        ...tearleads.session.snapshot,
        authToken: null,
        isAuthenticated: false,
        isRoot: false,
      };
      current.userIdAcknowledged = tearleads.session.userIdAcknowledged;
      const bytes = new TextEncoder().encode(JSON.stringify(current));
      const write = writes
        .catch(() => undefined)
        .then(() => profileStore.writeBytes("profile", bytes));
      writes = write;
      return write;
    };
    await persist();
    cleanup.push(
      tearleads.session.subscribe(() => {
        void persist().catch((error) =>
          reportError(`Could not save this session: ${errorMessage(error)}`),
        );
      }),
    );
    const network = createBrowserNetworkStatusSource();
    tearleads.network.setConnectivityAuthoritative(true);
    tearleads.network.setOnline(network.getOnline());
    const contents = tearleads.deviceFirst.open();
    const updateRuntime = () => {
      if (!closed)
        contents.view.updateRuntime(
          tearleads.containerContents.workflowRuntime(),
        );
    };
    cleanup.push(tearleads.runtime.subscribe(updateRuntime));
    updateRuntime();
    let connection: Promise<void> | null = null;
    let wantsConnection = false;
    const connectionListeners = new Set<() => void>();
    const notifyConnection = () => {
      for (const listener of connectionListeners) listener();
    };
    cleanup.push(() => connectionListeners.clear());
    const connectOnce = async () => {
      if (closed)
        throw new Error("This drive has closed. Reload to reopen it.");
      const authenticated = await authenticateDrive(
        tearleads.session,
        current.imported,
        () => closed || !wantsConnection,
      );
      if (authenticated === null) return;
      if (!authenticated)
        throw new Error(
          "Could not connect to Tearleads. Check your connection and try again.",
        );
      if (closed || !wantsConnection) {
        tearleads.session.logout();
        return;
      }
      // Login acknowledges roots but leaves navigation to the host. A freshly
      // imported identity has no local selection to reconcile with that root.
      if (!tearleads.session.containerId) {
        const root = tearleads.session.snapshot.rootAcknowledgments.find(
          (entry) =>
            entry.organizationId === tearleads.session.defaultOrganizationId &&
            entry.userId === tearleads.session.userId &&
            entry.signingFingerprint === tearleads.identity.signingFingerprint,
        );
        tearleads.session.setContainerId(root?.rootContainerId ?? null);
      }
      current.connect = true;
      tearleads.session.setSyncEnabled(true);
      await persist();
      contents.reconciler.enqueueIdleBackfill();
    };
    const connect = () => {
      wantsConnection = true;
      notifyConnection();
      connection ??= connectOnce().finally(() => {
        connection = null;
      });
      return connection;
    };
    cleanup.push(
      network.subscribe((online) => {
        tearleads.network.setOnline(online);
        if (
          online &&
          !closed &&
          current.connect &&
          !tearleads.session.isAuthenticated
        )
          void connect().catch((error) => {
            if (!closed) reportError(errorMessage(error));
          });
      }),
    );
    const refresh = () => {
      if (
        !closed &&
        document.visibilityState === "visible" &&
        tearleads.session.isAuthenticated &&
        tearleads.network.online
      ) {
        void contents.reconciler
          .reconcileNow()
          .catch((error) => reportError(errorMessage(error)));
      }
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    const onPageHide = () => {
      tearleads.dispose();
      sqlite?.terminateNow();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      // A bfcache restore must boot a new worker after pagehide terminated it.
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    cleanup.push(() => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    });
    const stopCrash = sqlite.subscribeWorkerError?.((error) => {
      reportError(errorMessage(error));
      void close();
    });
    if (stopCrash) cleanup.push(stopCrash);
    // Storage denial leaves the drive usable; the UI explains browser eviction.
    void requestPersistentStorage(PERSISTENT_STORAGE_POLICY).catch(
      () => undefined,
    );
    if (current.connect && network.getOnline())
      void connect().catch((error) => {
        if (!closed) reportError(errorMessage(error));
      });
    return {
      apiBaseUrl,
      client: tearleads,
      contents,
      connection: {
        getSnapshot: () => wantsConnection || current.connect,
        subscribe(listener) {
          connectionListeners.add(listener);
          return () => connectionListeners.delete(listener);
        },
      },
      connect,
      close,
      async disconnect() {
        wantsConnection = false;
        current.connect = false;
        notifyConnection();
        tearleads.session.setSyncEnabled(false);
        tearleads.session.logout();
        await persist();
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
