import type { QueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { MediaAsset } from '../types';
import { useUiStore } from '../stores/ui';

type PreviewWaiter = {
  expectedEpoch: number;
  resolve: () => void;
  timer: ReturnType<typeof globalThis.setTimeout>;
};

const previewWaiters = new Map<number, Set<PreviewWaiter>>();

/** Called by library thumbnails once the cache-busted image has loaded (or failed). */
export function settleMediaPreviewRefresh(attachmentId: number, epoch: number): void {
  const waiters = previewWaiters.get(attachmentId);
  if (!waiters) return;
  for (const waiter of [...waiters]) {
    if (epoch < waiter.expectedEpoch) continue;
    globalThis.clearTimeout(waiter.timer);
    waiters.delete(waiter);
    waiter.resolve();
  }
  if (waiters.size === 0) previewWaiters.delete(attachmentId);
}

function waitForMediaPreview(attachmentId: number, expectedEpoch: number): Promise<void> {
  return new Promise((resolve) => {
    const waiters = previewWaiters.get(attachmentId) ?? new Set<PreviewWaiter>();
    const waiter = {
      expectedEpoch,
      resolve,
      timer: globalThis.setTimeout(() => {
        waiters.delete(waiter);
        if (waiters.size === 0) previewWaiters.delete(attachmentId);
        resolve();
      }, 5000),
    } satisfies PreviewWaiter;
    waiters.add(waiter);
    previewWaiters.set(attachmentId, waiters);
  });
}

function queryUsesMissingFileFilter(queryKey: readonly unknown[]): boolean {
  const flags = queryKey[4];
  return Array.isArray(flags) && flags.includes('missing_file');
}

function removeAssetFromCachedList(data: unknown, attachmentId: number): unknown {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) {
    return data;
  }

  const list = data as { items: MediaAsset[]; total?: number };
  const items = list.items.filter((item) => item.attachmentId !== attachmentId);
  if (items.length === list.items.length) return data;

  return {
    ...list,
    items,
    total: typeof list.total === 'number' ? Math.max(0, list.total - 1) : list.total,
  };
}

function updateAssetInCachedList(data: unknown, updated: MediaAsset): unknown {
  if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) {
    return data;
  }
  const list = data as { items: MediaAsset[] };
  let found = false;
  const items = list.items.map((item) => {
    if (item.attachmentId !== updated.attachmentId) return item;
    found = true;
    return updated;
  });
  return found ? { ...list, items } : data;
}

function cachedAsset(qc: QueryClient, attachmentId: number): MediaAsset | null {
  for (const [, data] of qc.getQueriesData({ queryKey: ['assets'] })) {
    if (!data || typeof data !== 'object') continue;
    const items = (data as { items?: MediaAsset[] }).items;
    const match = items?.find((item) => item.attachmentId === attachmentId);
    if (match) return match;
  }
  return null;
}

/**
 * After a binary rewrite (optimize / crop / convert / replace / restore):
 * bump preview cache-bust, refresh the open asset, invalidate related queries.
 */
export async function refreshMediaAfterFileChange(
  qc: QueryClient,
  attachmentId: number,
  opts?: { asset?: MediaAsset | null }
): Promise<MediaAsset | null> {
  const initialState = useUiStore.getState();
  const editingSnapshot =
    initialState.editingAssets[attachmentId]?.asset ??
    opts?.asset ??
    (initialState.activeAsset?.attachmentId === attachmentId ? initialState.activeAsset : null) ??
    cachedAsset(qc, attachmentId);
  let previewSettled: Promise<void> | null = null;
  if (editingSnapshot) {
    initialState.beginAssetEditing(editingSnapshot);
    initialState.setAssetEditingPhase(attachmentId, 'refreshing');
  }

  try {
    let updated: MediaAsset | null = opts?.asset ?? null;
    if (!updated) {
      try {
        updated = await api.getAsset(attachmentId);
      } catch {
        updated = null;
      }
    }

    if (updated) {
      useUiStore.getState().setAssetEditingAsset(updated);
      const current = useUiStore.getState().activeAsset;
      if (current?.attachmentId === attachmentId) {
        useUiStore.getState().setActiveAsset(updated);
      }

      for (const [queryKey, data] of qc.getQueriesData({ queryKey: ['assets'] })) {
        qc.setQueryData(queryKey, updateAssetInCachedList(data, updated));
      }

      if (updated.missingFile === false) {
        for (const [queryKey, data] of qc.getQueriesData({ queryKey: ['assets'] })) {
          if (!queryUsesMissingFileFilter(queryKey)) continue;
          qc.setQueryData(queryKey, removeAssetFromCachedList(data, attachmentId));
        }

        const state = useUiStore.getState();
        if (state.flagsFilter.includes('missing_file') && state.selectedIds.includes(attachmentId)) {
          state.setSelectedIds(state.selectedIds.filter((id) => id !== attachmentId));
        }
      }
    }

    const previewAsset = updated ?? editingSnapshot;
    const stateBeforeBust = useUiStore.getState();
    const previousEpoch = stateBeforeBust.mediaPreviewBust[attachmentId] ?? 0;
    if (previewAsset?.mimeType?.startsWith('image/')) {
      previewSettled = waitForMediaPreview(attachmentId, previousEpoch + 1);
    }
    stateBeforeBust.bumpMediaPreview(attachmentId);

    await Promise.all([
      qc.invalidateQueries({ queryKey: ['asset', attachmentId] }),
      qc.invalidateQueries({ queryKey: ['assets'] }),
      qc.invalidateQueries({ queryKey: ['collections'] }),
      qc.invalidateQueries({ queryKey: ['duplicates'] }),
      qc.invalidateQueries({ queryKey: ['unused'] }),
      qc.invalidateQueries({ queryKey: ['health'] }),
      qc.invalidateQueries({ queryKey: ['optimize-preview', attachmentId] }),
      qc.invalidateQueries({ queryKey: ['image-edit', attachmentId] }),
      qc.invalidateQueries({ queryKey: ['image-resize', attachmentId] }),
      qc.invalidateQueries({ queryKey: ['image-convert', attachmentId] }),
      qc.invalidateQueries({ queryKey: ['remove-background', attachmentId] }),
    ]);

    // Keep the old bitmap covered until the cache-busted thumbnail has actually
    // settled in the browser. The waiter has a fallback for hidden/filtered cards.
    if (previewSettled) await previewSettled;

    return updated;
  } finally {
    if (editingSnapshot) useUiStore.getState().endAssetEditing(attachmentId);
  }
}
