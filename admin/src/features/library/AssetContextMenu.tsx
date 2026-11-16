import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Download,
  File as FileIcon,
  Folder,
  FolderPlus,
  Link,
  PanelRight,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../api/client';
import { invalidateLibraryQueries, refreshDuplicatesAfterAttachmentChange } from '../../api/invalidate';
import { kickJobPump } from '../../api/jobPump';
import {
  cancelQueuedJobs,
  forEachWithProgress,
  waitUntilNotAnalyzing,
  withOperationProgress,
} from '../../api/operationProgress';
import { refreshMediaAfterFileChange } from '../../api/refreshMedia';
import { isFreeBuild } from '../../edition';
import { useI18n } from '../../i18n';
import { toastError, toastT } from '../../i18n/toastMessages';
import { useUiStore } from '../../stores/ui';
import type { MediaAsset } from '../../types';
import { ConfirmModal } from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { iconPropsMd } from '../../ui/icons';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { isFeatureEnabled, useFeaturesMap } from '../features/useFeature';
import { flattenFolderTree, folderTree } from '../folders/folderTree';
import { BulkAltPreviewModal } from './BulkAltPreviewModal';
import { isImageMime } from './fileTypes';

const BULK_ALT_MAX = 20;

const MENU_ICONS: Record<string, LucideIcon> = {
  open: PanelRight,
  folder: FolderPlus,
  'copy-url': Link,
  'copy-filename': FileIcon,
  download: Download,
  'generate-alt': Type,
  analyze: Sparkles,
  restore: RotateCcw,
  delete: Trash2,
};

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

export type AssetContextMenuRequest = {
  x: number;
  y: number;
  asset: MediaAsset;
  queue: MediaAsset[];
  /** One id, or the current multi-selection when the click landed inside it. */
  ids: number[];
};

type MenuItem = {
  id: string;
  label: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  submenu?: boolean;
  run: () => void;
};

type MenuRow =
  | { kind: 'label'; id: string; label: string }
  | { kind: 'sep'; id: string }
  | { kind: 'item'; item: MenuItem };

function isOptimizableMime(mime?: string | null): boolean {
  const value = (mime || '').toLowerCase();
  return value === 'image/jpeg' || value === 'image/jpg' || value === 'image/png' || value === 'image/webp';
}

function needsAnalysis(status?: string | null): boolean {
  const value = (status || '').toLowerCase();
  return value === '' || value === 'pending' || value === 'failed';
}

/** The single action worth putting first, based on what the file is missing. */
export function primaryActionId(
  asset: MediaAsset,
  flags: { aiMetadata: boolean; aiAnalysis: boolean }
): 'generate-alt' | 'analyze' | 'copy-url' {
  const image = isImageMime(asset.mimeType);
  const hasAlt = Boolean(asset.altText?.trim());
  if (image && !hasAlt && flags.aiMetadata) return 'generate-alt';
  if (image && hasAlt && needsAnalysis(asset.aiStatus) && flags.aiAnalysis) return 'analyze';
  return 'copy-url';
}

function portalRoot(): HTMLElement {
  return document.getElementById('frkt-admin-root') || document.body;
}

function clampToViewport(x: number, y: number, width: number, height: number) {
  const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - height - 8));
  return { left, top };
}

export function AssetContextMenu({
  request,
  onClose,
  onReorder,
}: {
  request: AssetContextMenuRequest | null;
  onClose: () => void;
  onReorder?: (action: 'before' | 'after' | 'start' | 'end') => void;
}) {
  const { t } = useI18n();
  useFeaturesMap();
  const qc = useQueryClient();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const folderBtnRef = useRef<HTMLButtonElement | null>(null);
  const folderMenuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [folderPos, setFolderPos] = useState({ left: 0, top: 0 });
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [folderCols, setFolderCols] = useState(1);
  const [deleteIds, setDeleteIds] = useState<number[] | null>(null);
  const [skipUsed, setSkipUsed] = useState(true);
  const [restoreId, setRestoreId] = useState<number | null>(null);
  const [altIds, setAltIds] = useState<number[] | null>(null);
  const [altClearsSelection, setAltClearsSelection] = useState(false);

  const ids = request?.ids ?? [];
  const asset = request?.asset ?? null;
  const isGroup = ids.length > 1;
  const pro = !isFreeBuild;
  const foldersOn = isFeatureEnabled('folders');
  const aiMetadata = pro && isFeatureEnabled('ai_metadata');
  const aiAnalysis = pro && isFeatureEnabled('ai_analysis');
  const bulkAlt = pro && isFeatureEnabled('bulk_alt');
  const optimizable = asset ? isOptimizableMime(asset.mimeType) : false;

  const foldersQuery = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
    enabled: Boolean(request) && foldersOn,
    staleTime: 30_000,
  });

  const backupQuery = useQuery({
    queryKey: ['context-menu-backup', asset?.attachmentId],
    queryFn: () => api.optimizeAsset(asset!.attachmentId, { preview: true, quality: 100 }),
    enabled: Boolean(request) && !isGroup && pro && optimizable && isFeatureEnabled('optimize'),
    staleTime: 30_000,
  });
  const backup = backupQuery.data as { canRestore?: boolean; hasBackup?: boolean } | undefined;
  const canRestore = Boolean(backup?.canRestore ?? backup?.hasBackup);

  useEffect(() => {
    setFoldersOpen(false);
    setFolderCols(1);
  }, [request?.asset.attachmentId, request?.x, request?.y, request?.ids.join(',')]);

  const closeMenu = () => {
    setFoldersOpen(false);
    onClose();
  };

  const openDetails = () => {
    if (!asset || !request || isGroup) return;
    useUiStore.getState().setInspectorFocus({ attachmentId: asset.attachmentId, tab: 'details' });
    useUiStore.getState().setActiveAsset(asset, request.queue);
    closeMenu();
  };

  const copyText = async (value: string, okKey: 'toastUrlCopied' | 'toastFilenameCopied', failKey: 'toastUrlCopyFailed' | 'toastFilenameCopyFailed') => {
    const ok = value ? await copyToClipboard(value) : false;
    if (ok) toast.success(toastT(okKey));
    else toast.error(toastT(failKey));
    closeMenu();
  };

  const download = () => {
    if (!asset?.url) return;
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.filename || '';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    closeMenu();
  };

  const analyze = useMutation({
    mutationFn: async (targetIds: number[]) => {
      return withOperationProgress(
        {
          title: t('analyzingWithAi'),
          subtitle: t('waitAnalyze'),
          total: targetIds.length,
          pendingIds: targetIds,
          mode: 'docked',
        },
        async (update, control) => {
          const result = await api.bulkAnalyze(targetIds);
          let cancelPromise: Promise<void> | null = null;
          const cancelJobs = () => {
            cancelPromise ??= cancelQueuedJobs(result.jobIds);
            return cancelPromise;
          };
          control.setCancelHandler(cancelJobs);
          const idSet = new Set(targetIds);
          const mark = <T extends { attachmentId?: number; aiStatus?: string }>(item: T): T =>
            item.attachmentId && idSet.has(item.attachmentId) ? { ...item, aiStatus: 'analyzing' } : item;
          qc.setQueriesData({ queryKey: ['assets'] }, (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            const data = old as { items?: Array<{ attachmentId?: number; aiStatus?: string }> };
            if (!Array.isArray(data.items)) return old;
            return { ...data, items: data.items.map(mark) };
          });
          for (const id of targetIds) {
            qc.setQueryData(['asset', id], (old: unknown) => {
              if (!old || typeof old !== 'object') return old;
              return { ...(old as object), aiStatus: 'analyzing' };
            });
          }
          const active = useUiStore.getState().activeAsset;
          if (active && idSet.has(active.attachmentId)) {
            useUiStore.getState().setActiveAsset({ ...active, aiStatus: 'analyzing' });
          }
          kickJobPump();
          const completed = await waitUntilNotAnalyzing(targetIds, update, {
            signal: control.signal,
          });
          if (!completed) {
            await cancelJobs();
            return { ...result, cancelled: true };
          }
          return { ...result, cancelled: false };
        }
      );
    },
    onSuccess: (result, targetIds) => {
      if (result.cancelled) {
        toast.info(toastT('toastAiCancelled'));
        void invalidateLibraryQueries(qc, ['asset', 'jobs', 'collections']);
        return;
      }
      toast.success(toastT('toastBulkAnalyzeQueued', { count: result.queued ?? targetIds.length }));
      void invalidateLibraryQueries(qc, ['asset', 'jobs', 'collections']);
      kickJobPump();
    },
    onError: (error: Error) =>
      toast.error(/api key/i.test(error.message) ? toastT('toastAiNoApiKey') : toastError('toastGenericError', error)),
  });

  const assign = useMutation({
    mutationFn: async ({ folderId, targetIds }: { folderId: number; targetIds: number[] }) => {
      if (targetIds.length === 1) {
        const res = await api.assignAttachmentsToFolder(folderId, targetIds);
        return res.assigned ?? 1;
      }
      let assigned = 0;
      await forEachWithProgress(
        targetIds,
        { title: t('addingToFolder'), subtitle: t('assigningToFolder') },
        async (attachmentId) => {
          const res = await api.assignAttachmentsToFolder(folderId, [attachmentId]);
          assigned += res.assigned ?? 1;
        }
      );
      return assigned;
    },
    onSuccess: (count, vars) => {
      toast.success(count === 1 ? toastT('toastAddedToFolder') : toastT('toastAddedToFolderMany', { count }));
      void qc.invalidateQueries({ queryKey: ['folders'] });
      void invalidateLibraryQueries(qc, ['asset']);
      if (vars.targetIds.length > 1) useUiStore.getState().clearSelection();
    },
    onError: (error: Error) => toast.error(toastError('toastFolderAssignFailed', error)),
  });

  const remove = useMutation({
    mutationFn: async ({ targetIds, skip }: { targetIds: number[]; skip: boolean }) => {
      let deleted = 0;
      let skipped = 0;
      const removedIds: number[] = [];
      const take = (id: number, res: Awaited<ReturnType<typeof api.bulkDelete>>) => {
        const gone = (res.deleted?.length ?? 0) + (res.trashed?.length ?? 0);
        deleted += gone;
        skipped += (res.skipped?.length ?? 0) + (res.blocked?.length ?? 0);
        if (gone > 0) removedIds.push(id);
      };
      if (targetIds.length === 1) {
        const id = targetIds[0]!;
        take(id, await api.bulkDelete([id], { confirmed: true, force: true, skipUsed: false }));
        return { deleted, skipped, removedIds };
      }
      await forEachWithProgress(
        targetIds,
        { title: t('deletingMedia'), subtitle: t('removingSelected') },
        async (id) => {
          take(id, await api.bulkDelete([id], { confirmed: true, force: true, skipUsed: skip }));
        }
      );
      return { deleted, skipped, removedIds };
    },
    onSuccess: async (result, vars) => {
      setDeleteIds(null);
      const active = useUiStore.getState().activeAsset;
      if (active && result.removedIds.includes(active.attachmentId)) {
        useUiStore.getState().setInspectorOpen(false);
      }
      if (vars.targetIds.length > 1) {
        useUiStore.getState().clearSelection();
        toast.success(
          result.skipped > 0
            ? toastT('toastBulkTrashPartial', { trashed: result.deleted, skipped: result.skipped })
            : toastT('toastBulkTrashed', { count: result.deleted || vars.targetIds.length })
        );
      } else {
        const selected = useUiStore.getState().selectedIds.filter((id) => !result.removedIds.includes(id));
        useUiStore.getState().setSelectedIds(selected);
        toast.success(result.deleted > 0 ? toastT('toastTrashed') : toastT('toastTrashed'));
      }
      await Promise.all([
        refreshDuplicatesAfterAttachmentChange(qc, result.removedIds),
        invalidateLibraryQueries(qc, ['folders', 'collections', 'collection-assets', 'unused', 'asset']),
      ]);
      for (const id of result.removedIds) qc.removeQueries({ queryKey: ['asset', id] });
    },
    onError: (error: Error) => {
      toast.error(toastError('toastTrashFailed', error));
      setDeleteIds(null);
    },
  });

  const restore = useMutation({
    mutationFn: (id: number) => api.restoreOptimizedAsset(id),
    onSuccess: async (_res, id) => {
      setRestoreId(null);
      toast.success(toastT('toastRestored'));
      await refreshMediaAfterFileChange(qc, id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['optimize-preview', id] }),
        qc.invalidateQueries({ queryKey: ['context-menu-backup', id] }),
        qc.invalidateQueries({ queryKey: ['image-edit', id] }),
      ]);
    },
    onError: (error: Error) => {
      toast.error(toastError('toastRestoreFailed', error));
      setRestoreId(null);
    },
  });

  const askAlt = (targetIds: number[], clearSelection: boolean) => {
    if (targetIds.length > BULK_ALT_MAX) {
      toast.error(t('bulkAltTooMany', { max: BULK_ALT_MAX }));
      closeMenu();
      return;
    }
    setAltClearsSelection(clearSelection);
    setAltIds(targetIds);
    closeMenu();
  };

  const askDelete = (targetIds: number[]) => {
    setSkipUsed(targetIds.length > 1);
    setDeleteIds(targetIds);
    closeMenu();
  };

  const pendingHere = (targetIds: number[]) =>
    targetIds.some((id) => useUiStore.getState().bulkPendingIds.includes(id));

  const rows: MenuRow[] = [];
  if (request && asset) {
    const busy = pendingHere(ids);
    if (isGroup) {
      rows.push({ kind: 'label', id: 'count', label: `${ids.length} ${t('selectedWord')}` });
      if (foldersOn) {
        rows.push({
          kind: 'item',
          item: {
            id: 'folder',
            label: t('addToFolder'),
            submenu: true,
            disabled: busy,
            run: () => setFoldersOpen((open) => !open),
          },
        });
      }
      if (aiAnalysis) {
        rows.push({
          kind: 'item',
          item: {
            id: 'analyze',
            label: t('analyzeAi'),
            disabled: busy,
            run: () => {
              closeMenu();
              analyze.mutate(ids);
            },
          },
        });
      }
      if (bulkAlt) {
        rows.push({
          kind: 'item',
          item: {
            id: 'generate-alt',
            label: t('bulkAltAction'),
            disabled: busy,
            run: () => askAlt(ids, true),
          },
        });
      }
      rows.push({ kind: 'sep', id: 'danger-sep' });
      rows.push({
        kind: 'item',
        item: {
          id: 'delete',
          label: t('deleteMedia'),
          danger: true,
          disabled: busy,
          run: () => askDelete(ids),
        },
      });
    } else {
      const primary = primaryActionId(asset, { aiMetadata, aiAnalysis });
      const items: MenuItem[] = [
        { id: 'open', label: t('openDetails'), run: openDetails },
      ];
      if (foldersOn) {
        items.push({
          id: 'folder',
          label: t('addToFolder'),
          submenu: true,
          disabled: busy,
          run: () => setFoldersOpen((open) => !open),
        });
      }
      items.push({
        id: 'copy-url',
        label: t('inspectorCopyUrl'),
        disabled: !asset.url,
        run: () => void copyText(asset.url || '', 'toastUrlCopied', 'toastUrlCopyFailed'),
      });
      items.push({
        id: 'copy-filename',
        label: t('copyFilename'),
        disabled: !asset.filename,
        run: () => void copyText(asset.filename || '', 'toastFilenameCopied', 'toastFilenameCopyFailed'),
      });
      if (asset.url) {
        items.push({ id: 'download', label: t('inspectorDownload'), run: download });
      }
      if (onReorder) {
        items.push(
          { id: 'reorder-before', label: t('reorderBefore'), run: () => { closeMenu(); onReorder('before'); } },
          { id: 'reorder-after', label: t('reorderAfter'), run: () => { closeMenu(); onReorder('after'); } },
          { id: 'reorder-start', label: t('reorderStart'), run: () => { closeMenu(); onReorder('start'); } },
          { id: 'reorder-end', label: t('reorderEnd'), run: () => { closeMenu(); onReorder('end'); } },
        );
      }
      if (primary === 'generate-alt') {
        items.push({
          id: 'generate-alt',
          label: t('bulkAltAction'),
          disabled: busy,
          run: () => askAlt(ids, false),
        });
      }
      if (primary === 'analyze') {
        items.push({
          id: 'analyze',
          label: t('analyzeAi'),
          disabled: busy,
          run: () => {
            closeMenu();
            analyze.mutate(ids);
          },
        });
      }
      const danger: MenuItem[] = [];
      if (canRestore) {
        danger.push({
          id: 'restore',
          label: t('restoreOriginal'),
          disabled: busy || restore.isPending,
          run: () => {
            setRestoreId(asset.attachmentId);
            closeMenu();
          },
        });
      }
      danger.push({
        id: 'delete',
        label: t('deleteMedia'),
        danger: true,
        disabled: busy,
        run: () => askDelete(ids),
      });

      const primaryItem = items.find((item) => item.id === primary);
      const rest = items.filter((item) => item.id !== primary);
      if (primaryItem) {
        rows.push({ kind: 'item', item: { ...primaryItem, primary: true } });
        rows.push({ kind: 'sep', id: 'primary-sep' });
      }
      for (const item of rest) rows.push({ kind: 'item', item });
      rows.push({ kind: 'sep', id: 'danger-sep' });
      for (const item of danger) rows.push({ kind: 'item', item });
    }
  }

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!request || !el) return;
    const rect = el.getBoundingClientRect();
    setPos(clampToViewport(request.x, request.y, rect.width, rect.height));
  }, [request, rows.length, canRestore, foldersOpen]);

  useLayoutEffect(() => {
    const anchor = folderBtnRef.current;
    const menu = folderMenuRef.current;
    if (!foldersOpen || !anchor || !menu) return;
    const count = menu.querySelectorAll('[role="menuitem"]').length;
    const sample = menu.querySelector('[role="menuitem"]');
    const itemH = sample ? sample.getBoundingClientRect().height : 28;
    const availableH = window.innerHeight - 16;
    const rowsFit = Math.max(1, Math.floor((availableH - 12) / Math.max(itemH, 1)));
    const neededCols = Math.max(1, Math.ceil(count / rowsFit));
    const itemW = Math.max(sample?.getBoundingClientRect().width ?? 200, 180);
    const maxCols = Math.max(1, Math.floor((window.innerWidth - 16) / itemW));
    const cols = Math.min(maxCols, neededCols);
    if (cols !== folderCols) {
      setFolderCols(cols);
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let left = anchorRect.right + 4;
    if (left + menuRect.width > window.innerWidth - 8) {
      left = Math.max(8, anchorRect.left - menuRect.width - 4);
    }
    setFolderPos(clampToViewport(left, anchorRect.top, menuRect.width, menuRect.height));
  }, [foldersOpen, foldersQuery.data, folderCols]);

  useEffect(() => {
    if (!request) return;
    const openedAt = Date.now();
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus();
    });
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target) || folderMenuRef.current?.contains(target)) return;
      closeMenu();
    };
    const onScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (
        target &&
        (target === menuRef.current ||
          target === folderMenuRef.current ||
          menuRef.current?.contains(target) ||
          folderMenuRef.current?.contains(target))
      ) {
        return;
      }
      if (Date.now() - openedAt < 300) return;
      closeMenu();
    };
    document.addEventListener('pointerdown', onPointer, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', closeMenu);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointer, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', closeMenu);
    };
  }, [request?.asset.attachmentId, request?.x, request?.y]);

  useEffect(() => {
    if (!foldersOpen) return;
    const frame = window.requestAnimationFrame(() => {
      folderMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [foldersOpen]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const root = event.currentTarget;
    const items = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (foldersOpen) {
        setFoldersOpen(false);
        folderBtnRef.current?.focus();
        return;
      }
      closeMenu();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      event.stopPropagation();
      if (!items.length) return;
      if (event.key === 'Home') items[0]?.focus();
      else if (event.key === 'End') items[items.length - 1]?.focus();
      else if (event.key === 'ArrowDown') items[(index + 1) % items.length]?.focus();
      else items[(index - 1 + items.length) % items.length]?.focus();
      return;
    }
    if (event.key === 'ArrowRight') {
      const current = document.activeElement as HTMLButtonElement | null;
      if (current?.getAttribute('aria-haspopup') === 'menu') {
        event.preventDefault();
        event.stopPropagation();
        setFoldersOpen(true);
      }
    }
    if (event.key === 'ArrowLeft' && foldersOpen && folderMenuRef.current?.contains(document.activeElement)) {
      event.preventDefault();
      event.stopPropagation();
      setFoldersOpen(false);
      folderBtnRef.current?.focus();
    }
  };

  const folders = foldersQuery.data?.items ?? [];
  const flatFolders = flattenFolderTree(folderTree(folders));

  const menu =
    request && asset
      ? createPortal(
          <>
          <div
            ref={menuRef}
            className="frkt-context-menu"
            role="menu"
            aria-label={t('contextMenuLabel', { name: isGroup ? `${ids.length} ${t('selectedWord')}` : asset.filename })}
            style={{ left: pos.left, top: pos.top }}
            onKeyDown={onMenuKeyDown}
            onContextMenu={(event) => event.preventDefault()}
          >
            {rows.map((row) => {
              if (row.kind === 'label') {
                return (
                  <div key={row.id} className="frkt-context-menu__label">
                    {row.label}
                  </div>
                );
              }
              if (row.kind === 'sep') {
                return <div key={row.id} className="frkt-context-menu__sep" role="separator" />;
              }
              const item = row.item;
              const Icon = MENU_ICONS[item.id];
              return (
                <button
                  key={item.id}
                  ref={item.submenu ? folderBtnRef : undefined}
                  type="button"
                  role="menuitem"
                  className={`frkt-context-menu__item${item.primary ? ' is-primary' : ''}${item.danger ? ' is-danger' : ''}`}
                  disabled={item.disabled}
                  aria-haspopup={item.submenu ? 'menu' : undefined}
                  aria-expanded={item.submenu ? foldersOpen : undefined}
                  onClick={() => item.run()}
                >
                  <span className="frkt-context-menu__lead">
                    {Icon ? <Icon {...iconPropsMd} /> : null}
                    <span>{item.label}</span>
                  </span>
                  {item.submenu ? <ChevronRight {...iconPropsMd} /> : null}
                </button>
              );
            })}
          </div>
          {foldersOpen ? (
              <div
                ref={folderMenuRef}
                className={`frkt-context-menu frkt-context-menu--sub${folderCols > 1 ? ' is-columns' : ''}`}
                role="menu"
                aria-label={t('addToFolder')}
                style={{
                  left: folderPos.left,
                  top: folderPos.top,
                  gridTemplateRows: folderCols > 1 ? `repeat(${Math.ceil(flatFolders.length / folderCols)}, auto)` : undefined,
                }}
                onKeyDown={onMenuKeyDown}
              >
                {foldersQuery.isLoading ? (
                  <button type="button" role="menuitem" className="frkt-context-menu__item" disabled>
                    <span className="frkt-context-menu__lead">
                      <Folder {...iconPropsMd} />
                      <span>{t('loadingFolders')}</span>
                    </span>
                  </button>
                ) : flatFolders.length === 0 ? (
                  <button type="button" role="menuitem" className="frkt-context-menu__item" disabled>
                    <span className="frkt-context-menu__lead">
                      <Folder {...iconPropsMd} />
                      <span>{t('createFolderFirst')}</span>
                    </span>
                  </button>
                ) : (
                  flatFolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      role="menuitem"
                      className="frkt-context-menu__item"
                      onClick={() => {
                        closeMenu();
                        assign.mutate({ folderId: folder.id, targetIds: ids });
                      }}
                    >
                      <span className="frkt-context-menu__lead" style={{ marginLeft: folder.depth * 12 }}>
                        <Folder
                          {...iconPropsMd}
                          style={folder.color ? { color: inkOn(folder.color) === '#fff' ? folder.color : inkOn(folder.color) } : undefined}
                        />
                        <span
                          className={folder.color ? 'frkt-context-menu__name is-colored' : undefined}
                          style={folder.color ? { background: folder.color, color: inkOn(folder.color) } : undefined}
                        >
                          {folder.name}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
          ) : null}
        </>,
          portalRoot()
        )
      : null;

  return (
    <>
      {menu}
      <ConfirmModal
        open={deleteIds !== null}
        onClose={() => !remove.isPending && setDeleteIds(null)}
        onConfirm={() => deleteIds && remove.mutate({ targetIds: deleteIds, skip: skipUsed })}
        title={
          deleteIds && deleteIds.length > 1
            ? t('deleteItemsTitle', { count: deleteIds.length })
            : t('deleteMediaTitle')
        }
        confirmLabel={remove.isPending ? t('deleting') : t('deletePermanently')}
        cancelLabel={t('cancel')}
        busy={remove.isPending}
        danger
      >
        <p className="frkt-modal__copy">
          {deleteIds && deleteIds.length > 1 ? t('deleteImmediate') : t('deleteMediaBody')}
        </p>
        {deleteIds && deleteIds.length > 1 ? (
          <label className="frkt-check" style={{ marginTop: 12 }}>
            <span className="frkt-check__box">
              <input
                type="checkbox"
                checked={skipUsed}
                onChange={(event) => setSkipUsed(event.target.checked)}
                disabled={remove.isPending}
              />
              <span className="frkt-check__mark" aria-hidden="true" />
            </span>
            {t('skipUsedItems')}
          </label>
        ) : null}
      </ConfirmModal>
      <ConfirmModal
        open={restoreId !== null}
        onClose={() => !restore.isPending && setRestoreId(null)}
        onConfirm={() => restoreId && restore.mutate(restoreId)}
        title={t('restoreOriginalTitle')}
        confirmLabel={restore.isPending ? t('restoring') : t('restoreOriginal')}
        cancelLabel={t('cancel')}
        busy={restore.isPending}
      >
        <p className="frkt-modal__copy">{t('restoreBody')}</p>
      </ConfirmModal>
      {bulkAlt ? (
        <BulkAltPreviewModal
          open={altIds !== null}
          attachmentIds={altIds ?? []}
          onClose={() => setAltIds(null)}
          onApplied={() => {
            if (altClearsSelection) useUiStore.getState().clearSelection();
            setAltIds(null);
            void invalidateLibraryQueries(qc, ['asset', 'collections']);
          }}
        />
      ) : null}
    </>
  );
}
