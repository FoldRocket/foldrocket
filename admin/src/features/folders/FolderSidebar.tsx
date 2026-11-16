import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type DragEvent } from 'react';
import { Folder as FolderIcon, FolderOpen } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { toastError, toastT } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { iconPropsSm } from '../../ui/icons';
import { PromptModal } from '../../ui/Modal';
import { isFeatureEnabled } from '../features/useFeature';
import { SmartViewsNav } from '../library/SmartViewsNav';
import {
  acceptsFolderDrag,
  acceptsMediaDrag,
  clearFolderDrag,
  draggingFolderId,
  readFolderDrag,
  readMediaDrag,
  writeFolderDrag,
} from './mediaDrag';
import { canDropFolder, descendantIds, folderTree, relocateFolder, type FolderNode } from './folderTree';
import type { Folder } from '../../types';

function inkOn(hex: string): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((part) => part + part).join('') : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length !== 6) return '#1a1a1a';
  const channel = (shift: number) => {
    const unit = ((value >> shift) & 255) / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  return luminance > 0.45 ? '#1a1a1a' : '#fff';
}

export function FolderSidebar({
  readOnly = false,
  onLayerClose,
}: {
  readOnly?: boolean;
  onLayerClose?: () => void;
}) {
  const { t } = useI18n();
  const foldersOn = isFeatureEnabled('folders');
  const smartOn = isFeatureEnabled('smart_views');
  const { folderId, setFolderId } = useUiStore();
  const qc = useQueryClient();
  const i18n = window.FRKT_BOOT.i18n;
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [dropId, setDropId] = useState<number | 'root' | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const assignDrop = useMutation({
    mutationFn: async ({
      folderId: id,
      ids,
      fromFolderId,
    }: {
      folderId: number;
      ids: number[];
      fromFolderId: number | null;
    }) => {
      const res = await api.assignAttachmentsToFolder(id, ids);
      if (fromFolderId != null && fromFolderId !== id) {
        await api.unassignAttachmentsFromFolder(fromFolderId, ids);
      }
      return res;
    },
    onMutate: async ({ ids, fromFolderId, folderId: destId }) => {
      if (fromFolderId == null || fromFolderId === destId) return;
      await qc.cancelQueries({ queryKey: ['assets'] });
      const previous = qc.getQueriesData({ queryKey: ['assets'] });
      const moving = new Set(ids);
      for (const [key, data] of previous) {
        if (key[0] !== 'assets' || key[2] !== fromFolderId) continue;
        if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) continue;
        const list = data as { items: Array<{ attachmentId?: number }>; total?: number };
        const items = list.items.filter((item) => !item.attachmentId || !moving.has(item.attachmentId));
        const removed = list.items.length - items.length;
        qc.setQueryData(key, {
          ...list,
          items,
          total: typeof list.total === 'number' ? Math.max(0, list.total - removed) : list.total,
        });
      }
      return { previous };
    },
    onSuccess: (res, vars) => {
      const count = res.assigned ?? vars.ids.length;
      const moved = vars.fromFolderId != null && vars.fromFolderId !== vars.folderId;
      toast.success(
        count === 1 ? toastT('toastAddedToFolder') : toastT('toastAddedToFolderMany', { count })
      );
      if (moved) {
        const active = useUiStore.getState().activeAsset;
        if (active && vars.ids.includes(active.attachmentId)) {
          const folderIds = active.folderIds.filter((id) => id !== vars.fromFolderId);
          if (!folderIds.includes(vars.folderId)) folderIds.push(vars.folderId);
          useUiStore.getState().setActiveAsset({ ...active, folderIds });
        }
      }
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset'] });
    },
    onError: (e: Error, _vars, context) => {
      context?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(toastError('toastFolderAssignFailed', e));
    },
  });

  const moveFolder = useMutation({
    mutationFn: ({ id, parentId }: { id: number; parentId: number | null }) =>
      api.updateFolder(id, { parentId }),
    onMutate: async ({ id, parentId }) => {
      await qc.cancelQueries({ queryKey: ['folders'] });
      const previous = qc.getQueryData<{ items: Folder[] }>(['folders']);
      qc.setQueryData<{ items: Folder[] }>(['folders'], (current) =>
        current ? { ...current, items: relocateFolder(current.items, id, parentId) } : current
      );
      return { previous };
    },
    onSuccess: () => {
      toast.success(toastT('toastFolderMoved'));
    },
    onError: (e: Error, _vars, context) => {
      if (context?.previous) qc.setQueryData(['folders'], context.previous);
      toast.error(toastError('toastFolderMoveFailed', e));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['folders'] });
    },
  });

  const allowFolderDrop = (event: DragEvent, parentId: number | null) => {
    if (readOnly || !acceptsFolderDrag(event.dataTransfer)) return false;
    const moving = draggingFolderId();
    if (moving == null || !canDropFolder(folders, moving, parentId)) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return true;
  };

  const allowMediaDrop = (event: DragEvent, targetId: number) => {
    if (readOnly || !acceptsMediaDrag(event.dataTransfer)) return false;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return true;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
    enabled: foldersOn,
  });

  const { data: allMedia } = useQuery({
    queryKey: ['assets', 'total'],
    queryFn: () => api.listAssets({ page: 1, per_page: 1 }),
    staleTime: 30_000,
    enabled: foldersOn,
  });

  const folders = data?.items || [];
  const allCount = allMedia?.total ?? null;
  const draggingBranch = new Set<number>();
  if (draggingId != null) {
    draggingBranch.add(draggingId);
    descendantIds(folders, draggingId).forEach((id) => draggingBranch.add(id));
  }

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createFolder(name, createParentId),
    onSuccess: (folder) => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      if (folder?.id) setFolderId(folder.id);
      setCreateOpen(false);
      setCreateParentId(null);
      toast.success(toastT('toastFolderCreated'));
    },
    onError: (e: Error) => {
      toast.error(toastError('toastFolderCreateFailed', e));
    },
  });

  const openCreate = (parentId: number | null) => {
    setCreateParentId(parentId);
    setCreateOpen(true);
  };

  const tree = folderTree(folders);
  const createParent = createParentId ? folders.find((folder) => folder.id === createParentId) ?? null : null;

  if (!foldersOn && !smartOn) return null;

  return (
    <aside className="frkt-sidebar">
      {onLayerClose ? (
        <div className="frkt-layer-close">
          <button type="button" className="button" onClick={onLayerClose}>
            {t('dismiss')}
          </button>
        </div>
      ) : null}
      {smartOn ? <SmartViewsNav readOnly={readOnly} /> : null}

      {foldersOn ? (
        <>
          {smartOn || !readOnly ? (
            <div className={`frkt-sidebar__head${smartOn ? ' frkt-sidebar__section' : ''}`}>
              {smartOn ? <h2>{t('foldersNav')}</h2> : null}
              {!readOnly ? (
                <button
                  type="button"
                  className="button button-small"
                  disabled={createMutation.isPending}
                  onClick={() => openCreate(null)}
                >
                  + {t('newFolder')}
                </button>
              ) : null}
            </div>
          ) : null}

          <nav className="frkt-subnav" aria-label={t('foldersNav')} data-frkt-tour="folders">
            <button
              type="button"
              className={`frkt-folder ${folderId === null ? 'is-active' : ''} ${dropId === 'root' ? 'is-drop' : ''}`}
              onClick={() => setFolderId(null)}
              onDragOver={(event) => {
                if (allowFolderDrop(event, null)) setDropId('root');
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setDropId((current) => (current === 'root' ? null : current));
              }}
              onDrop={(event) => {
                if (!allowFolderDrop(event, null)) return;
                setDropId(null);
                const moving = readFolderDrag(event.dataTransfer);
                if (moving == null || moveFolder.isPending) return;
                moveFolder.mutate({ id: moving, parentId: null });
              }}
            >
              <span className="frkt-folder__name">{t('allMedia')}</span>
              {allCount != null ? <span className="frkt-count">{allCount}</span> : null}
            </button>

            {isLoading && <p className="frkt-muted">{i18n.loading}</p>}
            {!isLoading && !folders.length && (
              <p className="frkt-muted">{t('noFoldersYet')}</p>
            )}

            <ul className="frkt-folder-list">
              {tree.map((node) => (
                <FolderBranch
                  key={node.id}
                  node={node}
                  activeId={folderId}
                  dropId={dropId}
                  draggingId={draggingId}
                  draggingBranch={draggingBranch}
                  readOnly={readOnly}
                  onOpen={setFolderId}
                  onDragStart={(id, event) => {
                    if (readOnly) {
                      event.preventDefault();
                      return;
                    }
                    setDraggingId(id);
                    writeFolderDrag(event.dataTransfer, id);
                  }}
                  onDragEnd={() => {
                    clearFolderDrag();
                    setDraggingId(null);
                    setDropId(null);
                  }}
                  onDragOver={(id, event) => {
                    if (allowFolderDrop(event, id) || allowMediaDrop(event, id)) setDropId(id);
                  }}
                  onDragLeave={(id, event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setDropId((current) => (current === id ? null : current));
                  }}
                  onDrop={(id, event) => {
                    setDropId(null);
                    if (allowFolderDrop(event, id)) {
                      const moving = readFolderDrag(event.dataTransfer);
                      if (moving == null || moveFolder.isPending) return;
                      moveFolder.mutate({ id: moving, parentId: id });
                      return;
                    }
                    if (!allowMediaDrop(event, id)) return;
                    const ids = readMediaDrag(event.dataTransfer);
                    if (!ids.length || assignDrop.isPending || id === folderId) return;
                    assignDrop.mutate({
                      folderId: id,
                      ids,
                      fromFolderId: folderId,
                    });
                  }}
                />
              ))}
            </ul>
          </nav>

          {!readOnly ? (
            <PromptModal
              open={createOpen}
              onClose={() => {
                if (createMutation.isPending) return;
                setCreateOpen(false);
                setCreateParentId(null);
              }}
              onSubmit={(name) => createMutation.mutate(name)}
              title={
                createParent
                  ? t('newSubfolderTitle', { name: createParent.name })
                  : i18n.newFolder || t('newFolder')
              }
              label={t('folderName')}
              placeholder={t('folderNamePlaceholder')}
              confirmLabel={createParent ? t('newSubfolder') : t('createFolder')}
              busy={createMutation.isPending}
            />
          ) : null}
        </>
      ) : null}
    </aside>
  );
}

function FolderBranch({
  node,
  activeId,
  dropId,
  draggingId,
  draggingBranch,
  readOnly,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  node: FolderNode;
  activeId: number | null;
  dropId: number | 'root' | null;
  draggingId: number | null;
  draggingBranch: Set<number>;
  readOnly: boolean;
  onOpen: (id: number) => void;
  onDragStart: (id: number, event: DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (id: number, event: DragEvent) => void;
  onDragLeave: (id: number, event: DragEvent) => void;
  onDrop: (id: number, event: DragEvent) => void;
}) {
  return (
    <li className="frkt-folder-item">
      <div className="frkt-folder-row" style={{ ['--frkt-folder-depth' as string]: node.depth }}>
        <button
          type="button"
          draggable={!readOnly}
          className={`frkt-folder ${activeId === node.id ? 'is-active' : ''} ${dropId === node.id ? 'is-drop' : ''} ${draggingId === node.id ? 'is-dragging' : ''} ${draggingId !== node.id && draggingBranch.has(node.id) ? 'is-dragging-with' : ''}`}
          title={node.name}
          onClick={() => onOpen(node.id)}
          onDragStart={(event) => {
            event.stopPropagation();
            const branch = event.currentTarget.closest('.frkt-folder-item');
            if (branch instanceof HTMLElement && getComputedStyle(branch).display !== 'contents') {
              const ghost = branch.cloneNode(true) as HTMLElement;
              ghost.style.position = 'absolute';
              ghost.style.top = '-1000px';
              ghost.style.left = '0';
              ghost.style.width = `${branch.offsetWidth}px`;
              ghost.style.pointerEvents = 'none';
              document.body.appendChild(ghost);
              event.dataTransfer.setDragImage(ghost, 16, 16);
              requestAnimationFrame(() => ghost.remove());
            }
            onDragStart(node.id, event);
          }}
          onDragEnd={onDragEnd}
          onDragOver={(event) => onDragOver(node.id, event)}
          onDragLeave={(event) => onDragLeave(node.id, event)}
          onDrop={(event) => onDrop(node.id, event)}
        >
          <span className="frkt-folder__label">
            {activeId === node.id ? <FolderOpen {...iconPropsSm} /> : <FolderIcon {...iconPropsSm} />}
            <span
              className={`frkt-folder__name ${node.color ? 'is-colored' : ''}`}
              style={node.color ? { background: node.color, color: inkOn(node.color) } : undefined}
            >
              {node.name}
            </span>
          </span>
          <span className="frkt-count">{node.count}</span>
        </button>
      </div>
      {node.children.length ? (
        <ul className="frkt-folder-list">
          {node.children.map((child) => (
            <FolderBranch
              key={child.id}
              node={child}
              activeId={activeId}
              dropId={dropId}
              draggingId={draggingId}
              draggingBranch={draggingBranch}
              readOnly={readOnly}
              onOpen={onOpen}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
