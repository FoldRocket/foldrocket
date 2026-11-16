import type { Folder } from '../../types';

export type FolderNode = Folder & {
  depth: number;
  children: FolderNode[];
};

/** Roots first, then each folder's children. Orphans and cycle members still render. */
export function folderTree(folders: Folder[]): FolderNode[] {
  const ids = new Set(folders.map((folder) => folder.id));
  const byParent = new Map<number | null, Folder[]>();

  for (const folder of folders) {
    const parent = folder.parentId != null && ids.has(folder.parentId) ? folder.parentId : null;
    const list = byParent.get(parent) ?? [];
    list.push(folder);
    byParent.set(parent, list);
  }

  const placed = new Set<number>();
  const walk = (parentId: number | null, depth: number): FolderNode[] =>
    (byParent.get(parentId) ?? []).flatMap((folder) => {
      if (placed.has(folder.id)) return [];
      placed.add(folder.id);
      return [
        {
          ...folder,
          depth,
          children: walk(folder.id, depth + 1),
        },
      ];
    });

  const roots = walk(null, 0);
  for (const folder of folders) {
    if (placed.has(folder.id)) continue;
    placed.add(folder.id);
    roots.push({
      ...folder,
      depth: 0,
      children: walk(folder.id, 1),
    });
  }
  return roots;
}

/** Move one folder. Descendants stay attached through their existing parent id. */
export function relocateFolder(folders: Folder[], id: number, parentId: number | null): Folder[] {
  return folders.map((folder) => (folder.id === id ? { ...folder, parentId } : folder));
}

export function descendantIds(folders: Folder[], id: number): Set<number> {
  const byParent = new Map<number, number[]>();
  for (const folder of folders) {
    if (folder.parentId == null) continue;
    const list = byParent.get(folder.parentId) ?? [];
    list.push(folder.id);
    byParent.set(folder.parentId, list);
  }
  const out = new Set<number>();
  const walk = (current: number) => {
    for (const child of byParent.get(current) ?? []) {
      if (out.has(child)) continue;
      out.add(child);
      walk(child);
    }
  };
  walk(id);
  return out;
}

/** False when the move would be a no-op, a self-drop, or a drop into a descendant. */
export function canDropFolder(folders: Folder[], folderId: number, parentId: number | null): boolean {
  if (folderId === parentId) return false;
  const folder = folders.find((item) => item.id === folderId);
  if (!folder) return false;
  if ((folder.parentId ?? null) === parentId) return false;
  if (parentId != null && descendantIds(folders, folderId).has(parentId)) return false;
  return true;
}

export function flattenFolderTree(nodes: FolderNode[]): FolderNode[] {
  const flat: FolderNode[] = [];
  const visit = (node: FolderNode) => {
    flat.push(node);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return flat;
}
