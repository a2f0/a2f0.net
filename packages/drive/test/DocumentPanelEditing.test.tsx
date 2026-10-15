import { afterAll, expect, mock, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type {
  DocumentSnapshot,
  DocumentStore,
  DocumentSummary,
} from "@tearleads/client-sdk";
import { act } from "react";
import type { DriveHost } from "../src/host";

// React detects input event support on import; initialize its DOM first.
GlobalRegistrator.register();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { DocumentPanel } = await import("../src/DocumentPanel");
afterAll(() => GlobalRegistrator.unregister());

async function editScenario(remoteChange: boolean, replace: boolean) {
  const summary: DocumentSummary = {
    id: "local-note",
    documentId: "remote-note",
    containerId: "folder",
    title: "Original",
    updatedAt: "2026-10-11T00:00:00Z",
  };
  let snapshot: DocumentSnapshot = {
    attachments: [],
    attachmentStorageKeyBySlotId: {},
    attachmentStatusBySlotId: {},
    canAttach: true,
    canWrite: true,
    currentAuthorId: null,
    documentId: summary.documentId,
    documentKind: "note",
    effectiveAccessLevel: "write",
    fieldValidationIssues: [],
    ready: true,
    rows: [],
    structuredFields: {},
    text: "Original",
    title: "Original",
    syncing: false,
  };
  const listeners = new Set<() => void>();
  const setText = mock(async (_text: string) => undefined);
  const store = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    updateRuntime: () => undefined,
    setText,
  } satisfies Pick<
    DocumentStore,
    "getSnapshot" | "subscribe" | "updateRuntime" | "setText"
  >;
  const host = {
    client: {
      documents: { open: () => store, workflowRuntime: () => ({}) },
      runtime: { subscribe: () => () => undefined },
    },
  } as unknown as DriveHost;
  const confirm = spyOn(window, "confirm").mockReturnValue(replace);
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
          reportError={() => undefined}
        />,
      ),
    );
    const editor = element.querySelector<HTMLTextAreaElement>("textarea");
    if (!editor) throw new Error("Note editor missing");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(editor, "My draft");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(element.textContent).toContain("Unsaved changes");
    if (remoteChange)
      await act(async () => {
        snapshot = { ...snapshot, text: "Remote edit" };
        for (const listener of listeners) listener();
      });
    expect(editor.value).toBe("My draft");
    const button = element.querySelector<HTMLButtonElement>(
      ".drive-dialog-actions button",
    );
    await act(async () => button?.click());
    expect(confirm).toHaveBeenCalledTimes(remoteChange ? 1 : 0);
    if (remoteChange && !replace) {
      expect(setText).not.toHaveBeenCalled();
      expect(editor.value).toBe("My draft");
      expect(snapshot.text).toBe("Remote edit");
      expect(element.textContent).toContain("Unsaved changes");
    } else {
      expect(setText).toHaveBeenCalledWith("My draft");
      expect(element.textContent).toContain("Saved on this device");
    }
  } finally {
    await act(async () => root.unmount());
    element.remove();
    confirm.mockRestore();
  }
}

test("cancelling replacement preserves the draft and the remotely updated note", async () => {
  await editScenario(true, false);
});
test("replacing a remotely updated note requires explicit confirmation", async () => {
  await editScenario(true, true);
});
test("saving an unchanged base requires no conflict confirmation", async () => {
  await editScenario(false, false);
});
