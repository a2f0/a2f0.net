import { afterAll, beforeAll, expect, mock, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type {
  DocumentSnapshot,
  DocumentStore,
  DocumentSummary,
} from "@tearleads/client-sdk";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { DocumentPanel } from "./DocumentPanel";
import type { DriveHost } from "./host";

beforeAll(() => {
  GlobalRegistrator.register();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});
afterAll(() => GlobalRegistrator.unregister());

async function downloadScenario(cached: boolean, mismatch: boolean) {
  const attachment = {
    slotId: "slot",
    name: "example.txt",
    mimeType: "text/plain",
    byteLength: 4,
    contentSha256: "expected-content-hash",
  };
  const summary: DocumentSummary = {
    id: "local-document",
    documentId: "remote-document",
    containerId: "folder",
    title: "Example",
    updatedAt: "2026-10-11T00:00:00Z",
  };
  let snapshot: DocumentSnapshot = {
    attachments: [attachment],
    attachmentStorageKeyBySlotId: cached ? { slot: "blob-key" } : {},
    attachmentStatusBySlotId:
      cached && mismatch ? { slot: "intent-mismatch" } : {},
    canAttach: false,
    canWrite: false,
    currentAuthorId: null,
    documentId: summary.documentId,
    documentKind: "note",
    effectiveAccessLevel: "read",
    fieldValidationIssues: [],
    ready: true,
    rows: [],
    structuredFields: {},
    text: "Example",
    title: "Example",
    syncing: false,
  };
  const sync = mock(async () => {
    snapshot = {
      ...snapshot,
      attachmentStorageKeyBySlotId: { slot: "blob-key" },
      attachmentStatusBySlotId: mismatch ? { slot: "intent-mismatch" } : {},
    };
    return true;
  });
  const store = {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    updateRuntime: () => undefined,
    requestRemoteSyncAndWait: sync,
  } satisfies Pick<
    DocumentStore,
    "getSnapshot" | "subscribe" | "updateRuntime" | "requestRemoteSyncAndWait"
  >;
  const readBytes = mock(async () => new Uint8Array([100, 97, 116, 97]));
  const host = {
    client: {
      documents: { open: () => store, workflowRuntime: () => ({}) },
      runtime: { subscribe: () => () => undefined },
      blobs: { store: { readBytes } },
    },
  } as unknown as DriveHost;
  const reportError = mock(() => undefined);
  const createUrl = spyOn(URL, "createObjectURL").mockReturnValue(
    "blob:download-test",
  );
  const click = spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined,
  );
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () =>
      root.render(
        <DocumentPanel
          host={host}
          document={summary}
          onClose={() => undefined}
          reportError={reportError}
        />,
      ),
    );
    const button = element.querySelector<HTMLButtonElement>(
      "button[aria-label='Download example.txt']",
    );
    expect(button).not.toBeNull();
    await act(async () => button?.click());
    expect(sync).toHaveBeenCalledTimes(cached ? 0 : 1);
    expect(button?.disabled).toBe(false);
    if (mismatch) {
      expect(reportError).toHaveBeenCalledWith(
        "This file is waiting for a verified update. Refresh and try again.",
      );
      expect(readBytes).not.toHaveBeenCalled();
      expect(createUrl).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
    } else {
      expect(reportError).not.toHaveBeenCalled();
      expect(readBytes).toHaveBeenCalledWith("blob-key");
      expect(createUrl).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
    }
  } finally {
    await act(async () => root.unmount());
    element.remove();
    createUrl.mockRestore();
    click.mockRestore();
  }
}

test("a cached attachment with mismatched intent cannot be downloaded", async () => {
  await downloadScenario(true, true);
});

test("an attachment whose intent mismatches after remote sync cannot be downloaded", async () => {
  await downloadScenario(false, true);
});

test("a verified attachment discovered during remote sync can be downloaded", async () => {
  await downloadScenario(false, false);
});
