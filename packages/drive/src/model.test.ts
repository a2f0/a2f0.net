import { expect, test } from "bun:test";
import type {
  ContainerNode,
  LocalProjectionSnapshot,
} from "@tearleads/client-sdk";
import { folderItems, folderPath, rootFolders } from "./model";

const folder = (
  id: string,
  parentId: string | null,
  name = id,
): ContainerNode => ({
  id,
  parentId,
  name,
  organizationId: "org",
  kind: "container",
  syncState: {
    status: "local-only",
    lastError: null,
    pendingAttachmentBytes: 0,
    pendingAttachmentCount: 0,
    pendingUpdateCount: 0,
  },
});

test("directly shared folders remain navigable without their inaccessible parents", () => {
  const nodes = [
    folder("home", null),
    folder("shared", "unavailable"),
    folder("child", "home"),
  ];
  expect(rootFolders(nodes).map((node) => node.id)).toEqual(["home", "shared"]);
  expect(folderPath(nodes, "child").map((node) => node.id)).toEqual([
    "home",
    "child",
  ]);
  expect(folderPath(nodes, "shared").map((node) => node.id)).toEqual([
    "shared",
  ]);
});

test("a malformed cached cycle cannot hang breadcrumb rendering", () => {
  expect(folderPath([folder("a", "b"), folder("b", "a")], "a")).toHaveLength(2);
});

test("folder search respects placement and excludes organization metadata", () => {
  const snapshot: LocalProjectionSnapshot = {
    ready: true,
    containers: [
      folder("home", null),
      folder("one", "home", "Projects"),
      folder("other", "elsewhere", "Projects"),
    ],
    linkedContainerIdsByDocumentId: new Map(),
    documentSummariesByContainerId: new Map([
      [
        "home",
        [
          {
            id: "note",
            containerId: "home",
            documentId: null,
            title: "Project plan",
            updatedAt: "2026-10-11",
          },
          {
            id: "meta",
            containerId: "home",
            documentId: null,
            title: "Project org",
            documentKind: "organization_profile",
            updatedAt: "2026-10-11",
          },
        ],
      ],
    ]),
  };
  expect(
    folderItems(snapshot, "home", " PROJECT ").documents.map((doc) => doc.id),
  ).toEqual(["note"]);
  expect(
    folderItems(snapshot, "home", "project").folders.map((node) => node.id),
  ).toEqual(["one"]);
  expect(folderItems(snapshot, "one", "").documents).toEqual([]);
});
