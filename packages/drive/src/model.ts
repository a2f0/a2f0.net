import type {
  ContainerNode,
  DocumentSummary,
  LocalProjectionSnapshot,
} from "@tearleads/client-sdk";

export function rootFolders(
  nodes: readonly ContainerNode[],
): readonly ContainerNode[] {
  const ids = new Set(nodes.map((node) => node.id));
  return nodes.filter(
    (node) => !node.systemSlot && (!node.parentId || !ids.has(node.parentId)),
  );
}

export function folderName(node: ContainerNode): string {
  return node.name === "/" && node.parentId === null ? "My drive" : node.name;
}

export function folderPath(
  nodes: readonly ContainerNode[],
  id: string | null,
): ContainerNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const path: ContainerNode[] = [];
  let next = id;
  while (next && !seen.has(next)) {
    seen.add(next);
    const node = byId.get(next);
    if (!node) break;
    path.unshift(node);
    next = node.parentId;
  }
  return path;
}

export function folderItems(
  snapshot: LocalProjectionSnapshot,
  id: string | null,
  search: string,
) {
  const query = search.trim().toLocaleLowerCase();
  const matches = (name: string) => name.toLocaleLowerCase().includes(query);
  const folders = (
    id
      ? snapshot.containers.filter((node) => node.parentId === id)
      : rootFolders(snapshot.containers)
  )
    .filter((node) => !node.systemSlot && matches(folderName(node)))
    .toSorted((a, b) => a.name.localeCompare(b.name, "en"));
  const documents: readonly DocumentSummary[] = id
    ? (snapshot.documentSummariesByContainerId.get(id) ?? [])
    : [];
  return {
    folders,
    documents: documents
      .filter(
        (doc) =>
          doc.documentKind !== "organization_profile" && matches(doc.title),
      )
      .toSorted((a, b) => a.title.localeCompare(b.title, "en")),
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
