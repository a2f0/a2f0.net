import {
  ArrowRightIcon,
  FolderSimpleIcon,
  KeyIcon,
  LockKeyIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { OpenDriveInput } from "./host";

export function Welcome({
  busy,
  onOpen,
}: {
  busy: boolean;
  onOpen(input: OpenDriveInput): void;
}) {
  const [importing, setImporting] = useState(false);
  const [phrase, setPhrase] = useState("");
  return (
    <div className="drive-welcome">
      <div className="drive-welcome-art" aria-hidden="true">
        <FolderSimpleIcon weight="duotone" size={96} />
        <span>01 / A LITTLE SPACE OF YOUR OWN</span>
      </div>
      <h1>
        Your files.
        <br />
        <span>Your space.</span>
      </h1>
      <p>
        A home for notes, files, and whatever comes next. Encrypted on your
        device, with Tearleads when you want to connect.
      </p>
      {importing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onOpen({ kind: "import", seedPhrase: phrase.trim() });
          }}
        >
          <label htmlFor="drive-recovery">Tearleads recovery phrase</label>
          <textarea
            id="drive-recovery"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            rows={4}
            autoComplete="off"
            spellCheck={false}
            required
            disabled={busy}
          />
          <p className="drive-hint">
            Use the recovery phrase from your Tearleads identity. Drive keeps
            its own encrypted copy in this browser.
          </p>
          <button
            className="drive-primary"
            type="submit"
            disabled={busy || !phrase.trim()}
          >
            {busy ? "Opening…" : "Open my drive"}
            <ArrowRightIcon size={18} />
          </button>
          <button
            className="drive-text-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setPhrase("");
              setImporting(false);
            }}
          >
            Back
          </button>
        </form>
      ) : (
        <div className="drive-welcome-actions">
          <button
            className="drive-primary"
            type="button"
            disabled={busy}
            onClick={() => onOpen({ kind: "create" })}
          >
            {busy ? "Creating…" : "Create a drive"}
            <ArrowRightIcon size={18} />
          </button>
          <button
            className="drive-secondary"
            type="button"
            disabled={busy}
            onClick={() => setImporting(true)}
          >
            <KeyIcon size={18} />
            Use an existing identity
          </button>
        </div>
      )}
      <div className="drive-welcome-foot">
        <LockKeyIcon size={16} />
        <span>Local first. Your recovery phrase is your key.</span>
      </div>
    </div>
  );
}
