import {
  ArrowClockwiseIcon,
  CaretRightIcon,
  FileTextIcon,
  FolderPlusIcon,
  FolderSimpleIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import type { ContainerNode, DocumentSummary } from "@tearleads/client-sdk";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Dialog } from "./Dialog";
import { DocumentPanel } from "./DocumentPanel";
import type { DriveHost } from "./host";
import { folderItems, folderName, folderPath, formatDate } from "./model";
import { errorMessage } from "./profile";

export function Explorer({
  host,
  activeId,
  onNavigate,
  reportError,
}: {
  host: DriveHost;
  activeId: string | null;
  onNavigate(id: string | null): void;
  reportError(message: string): void;
}) {
  const snapshot = useSyncExternalStore(
    host.contents.view.subscribe,
    host.contents.view.getSnapshot,
  );
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<DocumentSummary | null>(null);
  const [dialog, setDialog] = useState<
    "folder" | "note" | ContainerNode | null
  >(null);
  const [name, setName] = useState("");
  const upload = useRef<HTMLInputElement>(null);
  const active = snapshot.containers.find((node) => node.id === activeId);
  const canWrite = !!active && active.effectiveAccessLevel !== "read";
  const { folders, documents } = folderItems(snapshot, activeId, search);
  const path = folderPath(snapshot.containers, activeId);
  useEffect(() => {
    host.contents.view.setActiveContainer(activeId);
    host.contents.reconciler.setActiveContainer(activeId);
    setSearch("");
  }, [host, activeId]);
  useEffect(() => {
    // Remote listings contain encrypted document shells. Opening the current
    // folder's documents hydrates their titles and makes them searchable.
    const update = () => {
      if (!activeId) return;
      for (const document of snapshot.documentSummariesByContainerId.get(
        activeId,
      ) ?? []) {
        host.client.documents.open({
          localId: document.id,
          documentId: document.documentId,
          containerId: activeId,
        });
      }
    };
    update();
    return host.client.runtime.subscribe(update);
  }, [activeId, host, snapshot.documentSummariesByContainerId]);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      reportError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const beginCreate = (kind: "folder" | "note") => {
    setName("");
    setDialog(kind);
  };
  const create = async () => {
    if (!dialog || !name.trim()) return;
    const title = name.trim();
    if (dialog === "folder") {
      if (!activeId) return;
      if (!(await host.contents.containerStore.createChild(activeId, title)))
        throw new Error(
          "This folder could not be created. Check your access and try again.",
        );
    } else if (dialog === "note") {
      if (!activeId) return;
      const localId = crypto.randomUUID();
      const store = host.client.documents.open({
        localId,
        containerId: activeId,
      });
      await store.setText(title);
      setSelected({
        id: localId,
        documentId: store.getSnapshot().documentId,
        containerId: activeId,
        title,
        updatedAt: new Date().toISOString(),
      });
    } else if (
      !(await host.contents.containerStore.renameContainer(dialog.id, title))
    ) {
      throw new Error(
        "This folder could not be renamed. Check your access and try again.",
      );
    }
    setDialog(null);
  };
  const uploadFiles = async (files: readonly File[]) => {
    if (!activeId) return;
    for (const file of files) {
      const store = host.client.documents.open({
        localId: crypto.randomUUID(),
        containerId: activeId,
      });
      await store.setText(file.name);
      // One document per file. The SDK's explicit-slot operation acknowledges
      // local persistence, so the upload stays busy until its bytes are durable.
      const slotId = crypto.randomUUID();
      await store.replaceAttachment(slotId, {
        name: file.name,
        mimeType: file.type || null,
        bytes: file,
      });
      if (
        !store
          .getSnapshot()
          .attachments.some((attachment) => attachment.slotId === slotId)
      )
        throw new Error(
          `Could not save ${file.name}. Its document is available for retry.`,
        );
    }
  };
  return (
    <main className="drive-main">
      <div className="drive-topbar">
        <nav aria-label="Folder path" className="drive-breadcrumbs">
          <button
            type="button"
            onClick={() => onNavigate(null)}
            aria-label="All drives"
          >
            <HouseIcon size={18} />
          </button>
          {path.map((node) => (
            <span key={node.id}>
              <CaretRightIcon size={12} />
              <button
                type="button"
                onClick={() => onNavigate(node.id)}
                aria-current={node.id === activeId ? "page" : undefined}
              >
                {folderName(node)}
              </button>
            </span>
          ))}
          {!activeId && <span>All drives</span>}
        </nav>
        <label className="drive-search">
          <MagnifyingGlassIcon size={18} />
          <span className="drive-sr-only">Search this folder</span>
          <input
            type="search"
            placeholder="Search this folder"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="drive-main-heading">
        <div>
          <p className="drive-eyebrow">YOUR LITTLE CORNER OF THE CLOUD</p>
          <h1>{active ? folderName(active) : "All drives"}</h1>
          <p>
            {activeId
              ? "A place for the things you’re working on."
              : "Your folders, ready when you are."}
          </p>
        </div>
        <button
          type="button"
          className="drive-primary"
          disabled={busy || !canWrite}
          onClick={() => upload.current?.click()}
        >
          <UploadSimpleIcon size={19} />
          Upload files
        </button>
        <input
          className="drive-sr-only"
          ref={upload}
          type="file"
          multiple
          tabIndex={-1}
          aria-label="Choose files to upload"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void run(() => uploadFiles(files));
          }}
        />
      </div>
      <div className="drive-tools">
        <div>
          <button
            type="button"
            className="drive-secondary"
            disabled={busy || !canWrite}
            onClick={() => beginCreate("folder")}
          >
            <FolderPlusIcon size={18} />
            New folder
          </button>
          <button
            type="button"
            className="drive-secondary"
            disabled={busy || !canWrite}
            onClick={() => beginCreate("note")}
          >
            <PlusIcon size={18} />
            New note
          </button>
        </div>
        <button
          type="button"
          className="drive-icon-button"
          disabled={busy}
          aria-label="Refresh files"
          onClick={() =>
            void run(async () => {
              await host.contents.containerStore.refreshLocalContainers();
              if (host.client.session.isAuthenticated)
                await host.contents.reconciler.reconcileNow();
            })
          }
        >
          <ArrowClockwiseIcon size={20} />
        </button>
      </div>
      {!snapshot.ready ? (
        <div className="drive-empty" role="status">
          <FolderSimpleIcon size={42} />
          <h2>Opening your files…</h2>
        </div>
      ) : folders.length + documents.length === 0 ? (
        <div className="drive-empty">
          <div className="drive-empty-icon">
            <FolderSimpleIcon size={52} weight="duotone" />
          </div>
          <h2>
            {search ? "Nothing by that name." : "Room for your next idea."}
          </h2>
          <p>
            {search
              ? "Try a different search in this folder."
              : canWrite
                ? "Drop an idea into a note, or give your files a new home."
                : "Connect your identity to find your Tearleads folders."}
          </p>
          {!search && canWrite && (
            <button
              className="drive-text-button"
              type="button"
              onClick={() => beginCreate("note")}
            >
              Make your first note <CaretRightIcon size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="drive-table-wrap">
          <table className="drive-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Modified</th>
                <th scope="col">
                  <span className="drive-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {folders.map((folder) => (
                <tr key={folder.id}>
                  <td>
                    <button
                      className="drive-file-name"
                      type="button"
                      onClick={() => onNavigate(folder.id)}
                    >
                      <span className="drive-file-icon drive-folder-icon">
                        <FolderSimpleIcon size={24} weight="duotone" />
                      </span>
                      <span>{folderName(folder)}</span>
                    </button>
                  </td>
                  <td>
                    Folder
                    {folder.syncState.status === "pending" ? " · Pending" : ""}
                    {folder.syncState.status === "error" ? " · Sync error" : ""}
                  </td>
                  <td>{formatDate(folder.updatedAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="drive-icon-button"
                      disabled={busy || folder.effectiveAccessLevel === "read"}
                      aria-label={`Rename ${folderName(folder)}`}
                      onClick={() => {
                        setName(folder.name);
                        setDialog(folder);
                      }}
                    >
                      <PencilSimpleIcon size={17} />
                    </button>
                  </td>
                </tr>
              ))}
              {documents.map((document) => (
                <tr key={document.id}>
                  <td>
                    <button
                      className="drive-file-name"
                      type="button"
                      onClick={() => setSelected(document)}
                    >
                      <span className="drive-file-icon">
                        <FileTextIcon size={23} />
                      </span>
                      <span>{document.title || "Untitled note"}</span>
                    </button>
                  </td>
                  <td>
                    {document.documentKind && document.documentKind !== "note"
                      ? document.documentKind
                      : "Document"}
                  </td>
                  <td>{formatDate(document.updatedAt)}</td>
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="drive-main-footer">
        <span>
          {folders.length + documents.length}{" "}
          {folders.length + documents.length === 1 ? "item" : "items"}
          {search ? " found" : ""}
        </span>
        <span>{busy ? "Working…" : "Encrypted on this device"}</span>
      </footer>
      {dialog && (
        <Dialog
          title={
            dialog === "folder"
              ? "New folder"
              : dialog === "note"
                ? "New note"
                : "Rename folder"
          }
          onClose={() => {
            if (!busy) setDialog(null);
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(create);
            }}
          >
            <label htmlFor="drive-item-name">
              {dialog === "note" ? "Title" : "Folder name"}
            </label>
            <input
              id="drive-item-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={200}
              disabled={busy}
            />
            <div className="drive-dialog-actions">
              <button
                type="button"
                className="drive-secondary"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="drive-primary"
                disabled={busy || !name.trim()}
              >
                {busy
                  ? "Saving…"
                  : typeof dialog === "object"
                    ? "Rename"
                    : "Create"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {selected && (
        <DocumentPanel
          key={selected.id}
          host={host}
          document={selected}
          onClose={() => setSelected(null)}
          reportError={reportError}
        />
      )}
    </main>
  );
}
