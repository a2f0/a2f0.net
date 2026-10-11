import { useState, useSyncExternalStore } from "react";
import { Dialog } from "./Dialog";
import type { DriveHost } from "./host";
import { errorMessage } from "./profile";

export function AccountPanel({
  host,
  onClose,
  reportError,
}: {
  host: DriveHost;
  onClose(): void;
  reportError(message: string): void;
}) {
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const { client } = host;
  const connectionRequested = useSyncExternalStore(
    host.connection.subscribe,
    host.connection.getSnapshot,
  );
  const connect = async (enabled: boolean) => {
    setBusy(true);
    try {
      if (enabled) await host.connect();
      else await host.disconnect();
    } catch (error) {
      reportError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="Your identity" onClose={onClose}>
      <p className="drive-hint">
        Tearleads server:{" "}
        <span data-api-url={host.apiBaseUrl}>
          {new URL(host.apiBaseUrl).host}
        </span>
      </p>
      <p>
        Drive uses your Tearleads identity. Keep your recovery phrase somewhere
        safe; it opens this identity on other devices.
      </p>
      <div className="drive-identity">
        <span>Identity fingerprint</span>
        <code>{client.identity.signingFingerprint}</code>
      </div>
      <button
        className="drive-secondary"
        type="button"
        onClick={() => setReveal(!reveal)}
      >
        {reveal ? "Hide recovery phrase" : "Show recovery phrase"}
      </button>
      {reveal && (
        <div className="drive-recovery">
          <p className="drive-hint">
            Anyone with these words can use your identity. Your unsynced files
            still need this browser’s local storage.
          </p>
          <code>
            {client.identity.seedPhrase ??
              "This identity does not have a recovery phrase."}
          </code>
          {client.identity.seedPhrase && (
            <button
              type="button"
              className="drive-text-button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(client.identity.seedPhrase ?? "")
                  .then(() => setCopied(true))
                  .catch((error) => reportError(errorMessage(error)));
              }}
            >
              {copied ? "Copied" : "Copy phrase"}
            </button>
          )}
        </div>
      )}
      <hr />
      <h3>
        {client.session.isAuthenticated
          ? "Connected to Tearleads"
          : connectionRequested
            ? "Waiting to connect"
            : "Connect your drive"}
      </h3>
      <p>
        Connecting registers a new identity or signs in to your existing one.
        Remote sync follows your organization’s Tearleads plan.
      </p>
      <button
        type="button"
        className="drive-primary"
        disabled={busy && !connectionRequested}
        onClick={() => void connect(!connectionRequested)}
      >
        {connectionRequested
          ? client.session.isAuthenticated
            ? "Disconnect"
            : "Pause connection"
          : busy
            ? "Working…"
            : "Connect to Tearleads"}
      </button>
      {connectionRequested && !client.session.isAuthenticated && (
        <button
          type="button"
          className="drive-text-button"
          disabled={busy}
          onClick={() => void connect(true)}
        >
          Retry connection
        </button>
      )}
      <p className="drive-hint">
        Disconnecting pauses remote sync. Your encrypted drive stays available
        to this browser profile. Clearing site data removes local files.
      </p>
    </Dialog>
  );
}
