// Run in a separate Bun process: React detects input event support on import,
// so the DOM must exist before react-dom loads.
import { afterAll, expect, mock, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { DocumentSnapshot, DocumentSummary } from "@tearleads/client-sdk";
import { act } from "react";
import type { DriveHost } from "../src/host";

GlobalRegistrator.register();
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const summary: DocumentSummary = {
  id: "local-note",
  documentId: "remote-note",
  containerId: "folder",
  title: "Original",
  updatedAt: "2026-10-11T00:00:00Z",
};
const snapshot: DocumentSnapshot = {
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
const subscribe = () => () => undefined;
const view = { containers: [], ready: true };
const crashed = Promise.withResolvers<void>();
const host = {
  client: {
    session: {
      subscribe,
      snapshot: { containerId: null, isAuthenticated: false },
    },
    network: { subscribe, online: true },
    syncBillingGate: { subscribe, isBlocked: false },
    runtime: { subscribe },
    documents: {
      open: () => ({
        getSnapshot: () => snapshot,
        subscribe,
        updateRuntime: () => undefined,
        setText: async () => undefined,
      }),
      workflowRuntime: () => ({}),
    },
  },
  contents: { view: { subscribe, getSnapshot: () => view } },
  closed: crashed.promise,
  close: async () => undefined,
} as unknown as DriveHost;
let opens = 0;
let finishReopen: (value: null) => void = () => undefined;
mock.module("../src/host", () => ({
  openDrive() {
    opens += 1;
    if (opens === 1) return Promise.resolve(host);
    return new Promise((resolve) => {
      finishReopen = resolve;
    });
  },
}));
const { DocumentPanel } = await import("../src/DocumentPanel");
// Stands in for the explorer with a note already open in its panel.
function ExplorerWithOpenNote(props: {
  host: DriveHost;
  reportError(message: string): void;
}) {
  return (
    <DocumentPanel
      host={props.host}
      document={summary}
      onClose={() => undefined}
      reportError={props.reportError}
    />
  );
}
mock.module("../src/Explorer", () => ({ Explorer: ExplorerWithOpenNote }));
const { createRoot } = await import("react-dom/client");
const { default: DriveApp } = await import("../src/DriveApp");
afterAll(() => GlobalRegistrator.unregister());

test("a drive that closes under an edited note keeps the draft and offers to reopen", async () => {
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  const confirm = spyOn(window, "confirm").mockReturnValue(true);
  try {
    await act(async () => root.render(<DriveApp />));
    const editor = element.querySelector<HTMLTextAreaElement>("textarea");
    if (!editor) throw new Error("Note editor missing");
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set?.call(editor, "My draft");
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(element.textContent).toContain("Unsaved changes");
    await act(async () => crashed.resolve());
    // The note and its draft stay, so the text can still be copied.
    expect(element.querySelector("textarea")).toBe(editor);
    expect(editor.value).toBe("My draft");
    const notice = element.querySelector(".drive-dialog .drive-error");
    expect(notice?.textContent).toContain("Copy any unsaved text");
    const reopen = [...element.querySelectorAll("button")].find(
      (button) => button.textContent === "Reopen Drive",
    );
    if (!reopen) throw new Error("No Reopen Drive button");
    await act(async () => reopen.click());
    expect(opens).toBe(2);
    await act(async () => finishReopen(null));
    expect(element.textContent).toContain("Create a drive");
  } finally {
    await act(async () => root.unmount());
    element.remove();
    confirm.mockRestore();
  }
});
