import { ArrowDownIcon, PaperclipIcon } from "@phosphor-icons/react";
import type { DocumentSummary } from "@tearleads/client-sdk";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Dialog } from "./Dialog";
import type { DriveHost } from "./host";
import { formatBytes } from "./model";
import { errorMessage } from "./profile";

export function DocumentPanel({
  host,
  document,
  onClose,
  reportError,
}: {
  host: DriveHost;
  document: DocumentSummary;
  onClose(): void;
  reportError(message: string): void;
}) {
  const store = useMemo(
    () =>
      host.client.documents.open({
        localId: document.id,
        documentId: document.documentId,
        containerId: document.containerId,
      }),
    [host, document.id, document.documentId, document.containerId],
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [draft, setDraft] = useState<string | null>(null);
  const draftBase = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (draft === null) return;
    const preventLoss = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [draft]);
  useEffect(() => {
    const update = () =>
      store.updateRuntime(
        host.client.documents.workflowRuntime(document.containerId),
      );
    update();
    return host.client.runtime.subscribe(update);
  }, [host, store, document.containerId]);
  const save = async () => {
    if (draft === null) return;
    if (
      store.getSnapshot().text !== draftBase.current &&
      !window.confirm(
        "This note changed while you were editing. Replace the updated note with your draft? Cancel to keep your draft without changing the saved note.",
      )
    )
      return;
    setSaving(true);
    try {
      await store.setText(draft);
      setDraft(null);
      draftBase.current = null;
      setSaved(true);
    } catch (error) {
      reportError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  const download = async (
    slotId: string,
    name: string,
    mimeType: string | null,
  ) => {
    setDownloading(slotId);
    try {
      let key = store.getSnapshot().attachmentStorageKeyBySlotId[slotId];
      if (!key) {
        await store.requestRemoteSyncAndWait();
        key = store.getSnapshot().attachmentStorageKeyBySlotId[slotId];
      }
      if (
        store.getSnapshot().attachmentStatusBySlotId[slotId] ===
        "intent-mismatch"
      )
        throw new Error(
          "This file is waiting for a verified update. Refresh and try again.",
        );
      const bytes = key ? await host.client.blobs.store.readBytes(key) : null;
      if (!bytes)
        throw new Error(
          "This file is not available on this device yet. Connect and refresh to download it.",
        );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: mimeType ?? "application/octet-stream" }),
      );
      const link = window.document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      reportError(errorMessage(error));
    } finally {
      setDownloading(null);
    }
  };
  const close = () => {
    if (
      !saving &&
      (draft === null || window.confirm("Discard your unsaved text changes?"))
    )
      onClose();
  };
  return (
    <Dialog
      title={snapshot.title || document.title || "Untitled note"}
      onClose={close}
      wide
    >
      {!snapshot.ready ? (
        <p role="status">Opening document…</p>
      ) : (
        <>
          <div className="drive-document-meta">
            <span>
              {snapshot.documentKind === "note"
                ? "Note"
                : snapshot.documentKind}
            </span>
            <span>
              {snapshot.syncing
                ? "Syncing…"
                : snapshot.canWrite
                  ? "Editable"
                  : "Read only"}
            </span>
          </div>
          {snapshot.documentKind === "note" ? (
            <>
              <label className="drive-sr-only" htmlFor="drive-note-text">
                Note text
              </label>
              <textarea
                id="drive-note-text"
                className="drive-note-editor"
                value={draft ?? snapshot.text}
                onChange={(event) => {
                  if (draft === null) draftBase.current = snapshot.text;
                  setDraft(event.target.value);
                  setSaved(false);
                }}
                readOnly={!snapshot.canWrite}
                disabled={saving}
                placeholder="Start with a title, then make yourself at home."
              />
            </>
          ) : (
            <dl className="drive-fields">
              {Object.entries(snapshot.structuredFields).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {snapshot.attachments.length > 0 && (
            <div className="drive-attachments">
              <h3>Files</h3>
              {snapshot.attachments.map((file) => (
                <div className="drive-attachment" key={file.slotId}>
                  <PaperclipIcon size={20} />
                  <div>
                    <strong>{file.name}</strong>
                    <span>
                      {formatBytes(file.byteLength)}
                      {snapshot.attachmentStatusBySlotId[file.slotId] ===
                      "syncing"
                        ? " · Upload pending"
                        : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="drive-icon-button"
                    aria-label={`Download ${file.name}`}
                    disabled={downloading !== null}
                    onClick={() =>
                      void download(file.slotId, file.name, file.mimeType)
                    }
                  >
                    <ArrowDownIcon size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="drive-dialog-actions">
            <span role="status">
              {saving
                ? "Saving…"
                : saved
                  ? "Saved on this device"
                  : draft !== null
                    ? "Unsaved changes"
                    : ""}
            </span>
            <button
              type="button"
              className="drive-primary"
              disabled={saving || draft === null || !snapshot.canWrite}
              onClick={() => void save()}
            >
              Save note
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
