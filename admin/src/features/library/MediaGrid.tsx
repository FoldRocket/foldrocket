import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Grid3X3, Images, LayoutGrid, List, Search, SlidersHorizontal, Square, X } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { toastError } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { EmptyState } from '../../ui/EmptyState';
import type { MessageKey } from '../../i18n/catalogs';
import { useUiStore } from '../../stores/ui';
import type { MediaAsset } from '../../types';
import { FileTypeFilter } from './FileTypeFilter';
import { FlagsFilter } from './FlagsFilter';
import { AiStatusFilter } from './AiStatusFilter';
import { SortFilter } from './SortFilter';
import { UnusedScanControls } from '../unused/UnusedScanControls';
import { ExtraFilters } from './ExtraFilters';
import { flagsToAssetParams, formatAspectRatio, formatFileLabel, isImageMime, serializeListParam, serializeMimeFilter } from './fileTypes';
import { AssetContextMenu, type AssetContextMenuRequest } from './AssetContextMenu';
import { AssetThumb } from './AssetThumb';
import { settleMediaPreviewRefresh } from '../../api/refreshMedia';
import { UploadButton } from './UploadMedia';
import { BulkBar } from './BulkBar';
import { isFeatureEnabled, useFeaturesMap } from '../features/useFeature';
import { acceptsMediaDrag, clearMediaDrag, draggingMediaIds, readMediaDrag, writeMediaDrag } from '../folders/mediaDrag';
import { iconProps } from '../../ui/icons';

function formatBytes(n?: number | null) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function metaStatus(asset: MediaAsset): 'good' | 'missing' {
  return Boolean(asset.altText?.trim()) ? 'good' : 'missing';
}

function metaStatusLabel(
  status: 'good' | 'missing',
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
) {
  return status === 'good' ? t('altPresent') : t('altMissing');
}

function clampPerPage(n: number) {
  return Math.min(100, Math.max(1, Math.round(n) || 20));
}

function MediaGridSkeleton({ label }: { label: string }) {
  return (
    <div className="frkt-grid frkt-grid--loading" aria-busy="true" aria-label={label}>
      {Array.from({ length: 12 }, (_, index) => (
        <div className="frkt-card frkt-card--skeleton" aria-hidden="true" key={index}>
          <span className="frkt-card__skeleton-image" />
          <span className="frkt-card__skeleton-copy">
            <span />
            <span />
          </span>
        </div>
      ))}
    </div>
  );
}

function slotFromPoint(
  grid: HTMLElement,
  x: number,
  y: number,
  moving: number[],
  items: MediaAsset[],
  list: boolean
): { id: number; place: 'before' | 'after' } | null {
  const cards = grid.querySelectorAll<HTMLElement>('.frkt-card:not(.is-dragging)');
  let best: { id: number; rect: DOMRect; dist: number } | null = null;
  cards.forEach((el) => {
    const id = Number(el.dataset.attachmentId);
    if (!Number.isInteger(id) || id <= 0) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const cx = Math.max(rect.left, Math.min(x, rect.right));
    const cy = Math.max(rect.top, Math.min(y, rect.bottom));
    const dist = (x - cx) ** 2 + (y - cy) ** 2;
    if (!best || dist < best.dist) best = { id, rect, dist };
  });
  if (!best) return null;
  const hit = best as { id: number; rect: DOMRect; dist: number };
  const place: 'before' | 'after' = list
    ? y > hit.rect.top + hit.rect.height / 2
      ? 'after'
      : 'before'
    : x > hit.rect.left + hit.rect.width / 2
      ? 'after'
      : 'before';
  if (moving.includes(hit.id) || reorderSlotIsCurrent(items, moving, hit.id, place)) return null;
  return { id: hit.id, place };
}

function reorderSlotIsCurrent(
  items: MediaAsset[],
  moving: number[],
  targetId: number,
  place: 'before' | 'after'
): boolean {
  if (moving.length !== 1) return false;
  const dragged = items.findIndex((item) => item.attachmentId === moving[0]);
  const target = items.findIndex((item) => item.attachmentId === targetId);
  if (dragged < 0 || target < 0) return false;
  return (place === 'before' && dragged === target - 1) || (place === 'after' && dragged === target + 1);
}

function moveAssets(
  items: MediaAsset[],
  moving: Set<number>,
  targetId: number,
  place: 'before' | 'after'
): MediaAsset[] {
  if (moving.has(targetId)) return items;
  const block = items.filter((item) => moving.has(item.attachmentId));
  if (!block.length) return items;
  const rest = items.filter((item) => !moving.has(item.attachmentId));
  const index = rest.findIndex((item) => item.attachmentId === targetId);
  if (index < 0) return items;
  rest.splice(place === 'after' ? index + 1 : index, 0, ...block);
  return rest;
}

export function MediaGrid() {
  const { t } = useI18n();
  useFeaturesMap();
  const {
    search,
    folderId,
    selectedIds,
    toggleSelected,
    setActiveAsset,
    setSelectedIds,
    viewMode,
    gridPreviewSize,
    mimeFilter,
    flagsFilter,
    aiStatusFilter,
    orientationFilter,
    authorFilter,
    dateFromFilter,
    dateToFilter,
    sortOrder,
    editingAssets,
  } = useUiStore();
  const i18n = window.FRKT_BOOT.i18n;
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<AssetContextMenuRequest | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');
  const [reorderSlot, setReorderSlot] = useState<{ id: number; place: 'before' | 'after' } | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const reorderSlotRef = useRef(reorderSlot);
  const keyboardRangeRef = useRef<{
    anchorId: number;
    focusedId: number;
    baseSelectedIds: number[];
  } | null>(null);
  useEffect(() => {
    const clear = () => {
      reorderSlotRef.current = null;
      setReorderSlot(null);
    };
    window.addEventListener('dragend', clear);
    return () => window.removeEventListener('dragend', clear);
  }, []);
  const qc = useQueryClient();
  const reorder = useMutation({
    mutationFn: (input: { attachmentIds: number[]; targetAttachmentId: number; place: 'before' | 'after'; announcement?: string }) => {
      if (folderId == null) throw new Error('folder');
      return api.reorderFolderAttachments(folderId, input.attachmentIds, input.targetAttachmentId, input.place);
    },
    onMutate: async (input) => {
      if (folderId == null) return;
      await qc.cancelQueries({ queryKey: ['assets'] });
      const previous = qc.getQueriesData({ queryKey: ['assets'] });
      const moving = new Set(input.attachmentIds);
      for (const [key, data] of previous) {
        if (key[0] !== 'assets' || key[2] !== folderId) continue;
        if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) continue;
        const list = data as { items: MediaAsset[] };
        qc.setQueryData(key, { ...list, items: moveAssets(list.items, moving, input.targetAttachmentId, input.place) });
      }
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      context?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(toastError('toastGenericError', error));
    },
    onSuccess: (_result, input) => {
      if (input.announcement) setReorderAnnouncement(input.announcement);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });

  const perPage = clampPerPage(
    Number(
      (settingsQuery.data?.settings as { general?: { items_per_page?: number } } | undefined)?.general?.items_per_page ??
        window.FRKT_BOOT.itemsPerPage ??
        20
    )
  );

  useEffect(() => {
    keyboardRangeRef.current = null;
  }, [
    page,
    viewMode,
    search,
    folderId,
    mimeFilter,
    flagsFilter,
    aiStatusFilter,
    orientationFilter,
    authorFilter,
    dateFromFilter,
    dateToFilter,
    sortOrder,
    perPage,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    folderId,
    mimeFilter,
    flagsFilter,
    aiStatusFilter,
    orientationFilter,
    authorFilter,
    dateFromFilter,
    dateToFilter,
    sortOrder,
    perPage,
  ]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [
      'assets',
      search,
      folderId,
      mimeFilter,
      flagsFilter,
      aiStatusFilter,
      orientationFilter,
      authorFilter,
      dateFromFilter,
      dateToFilter,
    sortOrder,
      page,
      perPage,
    ],
    queryFn: () =>
      api.listAssets({
        search: search || undefined,
        folder_id: folderId ?? undefined,
        mime: serializeMimeFilter(mimeFilter) || undefined,
        ai_status: serializeListParam(aiStatusFilter) || undefined,
        orientation: serializeListParam(orientationFilter) || undefined,
        author_id: serializeListParam(authorFilter) || undefined,
        date_from: dateFromFilter || undefined,
        date_to: dateToFilter || undefined,
        sort: sortOrder.split(':')[0],
        direction: sortOrder.split(':')[1],
        page,
        per_page: perPage,
        ...flagsToAssetParams(
          flagsFilter,
          (settingsQuery.data?.settings as { general?: { large_file_mb?: number } } | undefined)?.general
            ?.large_file_mb
        ),
      }),
  });

  if (isLoading) {
    return <MediaGridSkeleton label={t('loadingLibrary')} />;
  }

  if (isError) {
    return (
      <div className="frkt-state frkt-state--error">
        <h2>{t('couldntLoadMedia')}</h2>
        <p>{(error as Error).message || i18n.error}</p>
        <button type="button" className="button" onClick={() => refetch()}>
          {t('bulkAltRetry')}
        </button>
      </div>
    );
  }

  const listedItems = data?.items ?? [];
  const listedIds = new Set(listedItems.map((item) => item.attachmentId));
  const displayedItems = [
    ...listedItems,
    ...Object.values(editingAssets)
      .map((entry) => entry.asset)
      .filter((asset) => !listedIds.has(asset.attachmentId)),
  ];

  if (!displayedItems.length) {
    return (
      <EmptyState
        title={t(flagsFilter.includes('unused') ? 'empty' : 'noMediaYet')}
        description={
          flagsFilter.includes('unused') ? t('unusedScanNeeded') : folderId ? t('folderEmptyUpload') : t('uploadToStart')
        }
        icon={<Images {...iconProps} size={24} />}
        action={!flagsFilter.includes('unused') ? <UploadButton showIcon /> : null}
        tourTarget="grid"
      />
    );
  }

  const orderedIds = displayedItems.map((a) => a.attachmentId);
  const allSelected = orderedIds.every((id) => selectedIds.includes(id));
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  const extendSelectionWithKeyboard = (
    attachmentId: number,
    key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  ) => {
    const currentIndex = orderedIds.indexOf(attachmentId);
    if (currentIndex < 0) return;

    const grid = gridRef.current;
    const columns =
      viewMode === 'grid' && grid
        ? Math.max(1, getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length)
        : 1;
    const offset =
      key === 'ArrowLeft'
        ? -1
        : key === 'ArrowRight'
          ? 1
          : key === 'ArrowUp'
            ? -columns
            : columns;
    const targetId = orderedIds[currentIndex + offset];
    if (!targetId) return;

    let range = keyboardRangeRef.current;
    if (
      !range ||
      range.focusedId !== attachmentId ||
      !orderedIds.includes(range.anchorId)
    ) {
      range = {
        anchorId: attachmentId,
        focusedId: attachmentId,
        baseSelectedIds: selectedIds.filter((id) => id !== attachmentId),
      };
    }

    const anchorIndex = orderedIds.indexOf(range.anchorId);
    const targetIndex = orderedIds.indexOf(targetId);
    if (anchorIndex < 0 || targetIndex < 0) return;

    const from = Math.min(anchorIndex, targetIndex);
    const to = Math.max(anchorIndex, targetIndex);
    const selectedRange = orderedIds.slice(from, to + 1);
    setSelectedIds(Array.from(new Set([...range.baseSelectedIds, ...selectedRange])));
    keyboardRangeRef.current = { ...range, focusedId: targetId };
    requestAnimationFrame(() => {
      gridRef.current
        ?.querySelector<HTMLInputElement>(`[data-attachment-id="${targetId}"] input[type="checkbox"]`)
        ?.focus();
    });
  };

  return (
    <>
      <div className={`frkt-select-row frkt-select-row--${viewMode}`}>
        <label className="frkt-check">
          <span className="frkt-check__box">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                keyboardRangeRef.current = null;
                setSelectedIds(allSelected ? [] : orderedIds);
              }}
            />
            <span className="frkt-check__mark" aria-hidden="true" />
          </span>
          {t('selectAllPage')}
        </label>
        <span className="frkt-muted">
          {t('rangeOf', { from, to, total: total.toLocaleString() })}
          {isFetching ? ' · …' : ''}
        </span>
      </div>
      <span className="frkt-sr-only" role="status" aria-live="polite">{reorderAnnouncement}</span>
      <div
        ref={gridRef}
        className={`frkt-grid frkt-grid--${viewMode} frkt-grid--size-${gridPreviewSize}`}
        data-frkt-tour="grid"
        onDragOver={(event) => {
          if (folderId == null || !sortOrder.startsWith('default:') || !isFeatureEnabled('folders') || !acceptsMediaDrag(event.dataTransfer)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          const moving = draggingMediaIds();
          const next = moving.length
            ? slotFromPoint(event.currentTarget, event.clientX, event.clientY, moving, listedItems, viewMode === 'list')
            : null;
          reorderSlotRef.current = next;
          setReorderSlot((current) => {
            if (!next) return null;
            if (current && current.id === next.id && current.place === next.place) return current;
            return next;
          });
        }}
        onDrop={(event) => {
          if (folderId == null || !sortOrder.startsWith('default:') || !isFeatureEnabled('folders') || !acceptsMediaDrag(event.dataTransfer)) return;
          event.preventDefault();
          const ids = readMediaDrag(event.dataTransfer);
          const slot = reorderSlotRef.current;
          reorderSlotRef.current = null;
          setReorderSlot(null);
          if (!slot || !ids.length || ids.includes(slot.id)) return;
          reorder.mutate({ attachmentIds: ids, targetAttachmentId: slot.id, place: slot.place });
        }}
        onDragLeave={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && event.currentTarget.contains(next)) return;
          if (!next && event.target !== event.currentTarget) return;
          reorderSlotRef.current = null;
          setReorderSlot(null);
        }}
      >
        {viewMode === 'list' ? (
          <div className="frkt-list-head">
            <label className="frkt-list-head__check frkt-check">
              <span className="frkt-check__box">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => {
                    keyboardRangeRef.current = null;
                    setSelectedIds(allSelected ? [] : orderedIds);
                  }}
                  aria-label={t('selectAllPage')}
                />
                <span className="frkt-check__mark" aria-hidden="true" />
              </span>
            </label>
            <span className="frkt-list-head__name">{t('smartViewName')}</span>
            <span>{t('colType')}</span>
            <span>{t('colSize')}</span>
            <span>{t('colDimensions')}</span>
            <span>{t('aspectRatio')}</span>
            <span>{t('colStatus')}</span>
          </div>
        ) : null}
        {displayedItems.map((asset) => (
          <Fragment key={asset.attachmentId}>
          {reorderSlot?.id === asset.attachmentId && reorderSlot.place === 'before' ? (
            <div className="frkt-reorder-slot" aria-hidden="true" />
          ) : null}
          <MediaCard
            asset={asset}
            viewMode={viewMode}
            selected={selectedIds.includes(asset.attachmentId)}
            onOpen={() => {
              setActiveAsset(asset, displayedItems);
            }}
            onOpenMenu={(point) => {
              const inSelection = selectedIds.includes(asset.attachmentId) && selectedIds.length > 1;
              setMenu({
                ...point,
                asset,
                queue: displayedItems,
                ids: inSelection ? [...selectedIds] : [asset.attachmentId],
              });
            }}
            onToggleCheck={() => {
              keyboardRangeRef.current = null;
              toggleSelected(asset.attachmentId, {
                multi: true,
                range: false,
                orderedIds,
              });
            }}
            onExtendSelection={(key) => extendSelectionWithKeyboard(asset.attachmentId, key)}
          />
          {reorderSlot?.id === asset.attachmentId && reorderSlot.place === 'after' ? (
            <div className="frkt-reorder-slot" aria-hidden="true" />
          ) : null}
          </Fragment>
        ))}
      </div>
      {totalPages > 1 ? (
        <nav className="frkt-pagination" aria-label={t('pagination')}>
          <span className="frkt-pagination__status">
            {t('pageOf', { current: currentPage, total: totalPages })}
          </span>
          <div className="frkt-pagination__controls">
            <button
              type="button"
              className="frkt-page-btn"
              disabled={currentPage <= 1 || isFetching}
              aria-label={t('prevPage')}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
              .reduce<number[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - arr[idx - 1]! > 1) acc.push(-1);
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n < 0 ? (
                  <span key={`e-${i}`} className="frkt-page-ellipsis">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`frkt-page-btn ${n === currentPage ? 'is-active' : ''}`}
                    disabled={isFetching}
                    aria-current={n === currentPage ? 'page' : undefined}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
            <button
              type="button"
              className="frkt-page-btn"
              disabled={currentPage >= totalPages || isFetching}
              aria-label={t('nextPage')}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
          <span className="frkt-pagination__perpage">{perPage} {t('itemsPerPage')}</span>
        </nav>
      ) : null}
      <AssetContextMenu
        request={menu}
        onClose={() => setMenu(null)}
        onReorder={
          menu && folderId != null && sortOrder.startsWith('default:') && menu.ids.length === 1
            ? (action) => {
                const current = listedItems.findIndex((item) => item.attachmentId === menu.asset.attachmentId);
                if (current < 0) return;
                const targetIndex = action === 'start'
                  ? 0
                  : action === 'end'
                    ? listedItems.length - 1
                    : action === 'before'
                      ? current - 1
                      : current + 1;
                const target = listedItems[targetIndex];
                if (!target || target.attachmentId === menu.asset.attachmentId) return;
                const place = action === 'after' || action === 'end' ? 'after' : 'before';
                const finalPosition = action === 'start'
                  ? 1
                  : action === 'end'
                    ? listedItems.length
                    : targetIndex + 1;
                reorder.mutate({
                  attachmentIds: [menu.asset.attachmentId],
                  targetAttachmentId: target.attachmentId,
                  place,
                  announcement: t('reorderMoved', { name: menu.asset.filename, position: finalPosition }),
                });
              }
            : undefined
        }
      />
    </>
  );
}

function MediaCard({
  asset,
  selected,
  onOpen,
  onOpenMenu,
  onToggleCheck,
  onExtendSelection,
  viewMode,
}: {
  asset: MediaAsset;
  selected: boolean;
  onOpen: () => void;
  onOpenMenu: (point: { x: number; y: number }) => void;
  onToggleCheck: () => void;
  onExtendSelection: (key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void;
  viewMode: 'grid' | 'list';
}) {
  const { t } = useI18n();
  const format = formatFileLabel(asset.mimeType, asset.filename);
  const dims = asset.width && asset.height ? `${asset.width}×${asset.height}` : format;
  const size = formatBytes(asset.fileSize);
  const aspectRatio = formatAspectRatio(asset.width, asset.height);
  const showAltStatus = isImageMime(asset.mimeType);
  const status = showAltStatus ? metaStatus(asset) : null;
  const previewEpoch = useUiStore((s) => s.mediaPreviewBust[asset.attachmentId] ?? 0);
  const gridPreviewSize = useUiStore((s) => s.gridPreviewSize);
  const bulkPending = useUiStore((s) => s.bulkPendingIds.includes(asset.attachmentId));
  const editingState = useUiStore((s) => s.editingAssets[asset.attachmentId]);
  const editing = Boolean(editingState);
  const pending = bulkPending || editing;
  const selectedIds = useUiStore((s) => s.selectedIds);
  const canDrag = isFeatureEnabled('folders') && !pending;
  const inFolder = useUiStore((s) => s.folderId != null);
  const [dragging, setDragging] = useState(false);
  const didDrag = useRef(false);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      className={`frkt-card ${selected ? 'is-selected' : ''} ${bulkPending ? 'is-bulk-pending' : ''} ${editing ? 'is-editing' : ''} ${canDrag ? 'is-draggable' : ''} ${dragging && inFolder ? 'is-dragging' : ''}`}
      data-attachment-id={asset.attachmentId}
      aria-busy={pending}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu({ x: event.clientX, y: event.clientY });
      }}
    >
      <label
        className={`frkt-check frkt-card__check ${selected ? 'is-checked' : ''}`}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <span className="frkt-check__box">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleCheck}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(event) => {
              if (
                !event.shiftKey ||
                !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
              ) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              onExtendSelection(event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
            }}
            aria-label={t('selectItem', { name: asset.filename })}
            disabled={pending}
          />
          <span className="frkt-check__mark" aria-hidden="true" />
        </span>
      </label>
      <button
        type="button"
        className="frkt-card__btn"
        draggable={canDrag}
        disabled={bulkPending}
        onDragStart={(event) => {
          const ids =
            selected && selectedIds.includes(asset.attachmentId) ? selectedIds : [asset.attachmentId];
          writeMediaDrag(event.dataTransfer, ids);
          ghostRef.current?.remove();
          const ghost = document.createElement('div');
          ghost.className = 'frkt-drag-ghost';
          const preview = event.currentTarget.querySelector('.frkt-card__thumb img');
          if (preview instanceof HTMLImageElement && (preview.currentSrc || preview.src)) {
            const img = document.createElement('img');
            img.src = preview.currentSrc || preview.src;
            img.alt = '';
            img.draggable = false;
            ghost.appendChild(img);
          } else {
            const placeholder = event.currentTarget.querySelector('.frkt-card__placeholder');
            if (placeholder) ghost.appendChild(placeholder.cloneNode(true));
          }
          if (ids.length > 1) {
            const count = document.createElement('span');
            count.className = 'frkt-drag-ghost__count';
            count.textContent = String(ids.length);
            ghost.appendChild(count);
          }
          document.body.appendChild(ghost);
          ghostRef.current = ghost;
          event.dataTransfer.setDragImage(ghost, 14, 14);
          didDrag.current = true;
          // Hide the source on the next frame. Doing it during dragstart
          // makes the browser cancel the drag, so neither folders nor reorder receive the drop.
          requestAnimationFrame(() => setDragging(true));
        }}
        onDragEnd={() => {
          ghostRef.current?.remove();
          ghostRef.current = null;
          clearMediaDrag();
          setDragging(false);
        }}
        onClick={(event) => {
          if (didDrag.current) {
            didDrag.current = false;
            event.preventDefault();
            return;
          }
          onOpen();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          onOpenMenu({ x: rect.left + 12, y: rect.bottom });
        }}
      >
        <div className="frkt-card__thumb">
          <AssetThumb
            asset={asset}
            bustEpoch={previewEpoch}
            label={viewMode === 'grid' ? format : ''}
            sizes={viewMode === 'list'
              ? '40px'
              : gridPreviewSize === 'small'
                ? '(max-width: 782px) calc(50vw - 24px), 180px'
                : gridPreviewSize === 'large'
                  ? '(max-width: 782px) calc(50vw - 24px), 360px'
                  : '(max-width: 782px) calc(50vw - 24px), 240px'}
            onPreviewSettled={(epoch) =>
              settleMediaPreviewRefresh(asset.attachmentId, epoch)
            }
          />
          {status ? (
            <span
              className={`frkt-alt-badge frkt-alt-badge--${status}`}
              title={metaStatusLabel(status, t)}
              aria-label={metaStatusLabel(status, t)}
            >
              ALT
            </span>
          ) : null}
          {pending ? (
            <div
              className={`frkt-card__busy ${editingState?.phase === 'refreshing' ? 'is-refreshing' : ''}`}
              role="status"
              aria-label={editingState?.phase === 'refreshing' ? t('refreshing') : t('loading')}
            >
              <span className="frkt-card__busy-spinner" aria-hidden="true" />
              <span className="frkt-card__busy-label">
                {editingState?.phase === 'refreshing' ? t('refreshing') : t('loading')}
              </span>
            </div>
          ) : null}
        </div>
        <div className="frkt-card__meta">
          <div className="frkt-card__identity">
            <strong className="frkt-card__filename" title={asset.filename}>
              {asset.filename}
            </strong>
            {viewMode === 'list' ? (
              <span className="frkt-card__id">{t('idLabel', { id: asset.attachmentId })}</span>
            ) : null}
          </div>
          {viewMode === 'list' ? (
            <>
              <span className="frkt-card__type">{format}</span>
              <span className="frkt-card__size">{size}</span>
              <span className="frkt-card__dims">{dims}</span>
              <span className="frkt-card__aspect">{aspectRatio}</span>
              {status ? (
                <span
                  className={`frkt-alt-badge frkt-alt-badge--${status}`}
                  title={metaStatusLabel(status, t)}
                  aria-label={metaStatusLabel(status, t)}
                >
                  ALT
                </span>
              ) : null}
            </>
          ) : (
            <span className="frkt-card__sub">
              {[size, dims, aspectRatio].filter((value) => value !== '—').join(' · ')}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

export function LibraryToolbar({
  variant = 'library',
  onFiltersClose,
}: {
  variant?: 'library' | 'picker';
  onFiltersClose?: () => void;
}) {
  const { t } = useI18n();
  useFeaturesMap();
  const {
    search,
    setSearch,
    viewMode,
    setViewMode,
    gridPreviewSize,
    setGridPreviewSize,
    flagsFilter,
    aiStatusFilter,
    orientationFilter,
    authorFilter,
    dateFromFilter,
    dateToFilter,
    setFlagsFilter,
    setAiStatusFilter,
    setOrientationFilter,
    setAuthorFilter,
    setDateFromFilter,
    setDateToFilter,
  } = useUiStore();
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const showBulk = variant === 'library' && isFeatureEnabled('bulk_actions');
  const secondaryFilters = [
    { key: 'flags', label: t('flags'), count: flagsFilter.length, clear: () => setFlagsFilter([]) },
    { key: 'ai', label: t('aiStatus'), count: aiStatusFilter.length, clear: () => setAiStatusFilter([]) },
    { key: 'orientation', label: t('orientation'), count: orientationFilter.length, clear: () => setOrientationFilter([]) },
    { key: 'author', label: t('author'), count: authorFilter.length, clear: () => setAuthorFilter([]) },
    { key: 'date-from', label: t('uploadedFrom'), count: dateFromFilter ? 1 : 0, clear: () => setDateFromFilter('') },
    { key: 'date-to', label: t('uploadedTo'), count: dateToFilter ? 1 : 0, clear: () => setDateToFilter('') },
  ].filter((item) => item.count > 0);

  return (
    <div className="frkt-library-chrome" data-frkt-tour="filters">
      <div className="frkt-toolbar frkt-toolbar--primary">
        <div className="frkt-search-wrap">
          <input
            className="frkt-search"
            type="text"
            role="searchbox"
            inputMode="search"
            autoComplete="off"
            placeholder={t('search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="frkt-search__icon" aria-hidden="true">
            <Search {...iconProps} />
          </span>
        </div>
        <div className="frkt-view-toggle" role="group" aria-label={t('viewMode')}>
          <button
            type="button"
            className={viewMode === 'grid' ? 'is-active' : ''}
            aria-pressed={viewMode === 'grid'}
            aria-label={t('gridView')}
            title={t('gridView')}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid {...iconProps} />
          </button>
          <button
            type="button"
            className={viewMode === 'list' ? 'is-active' : ''}
            aria-pressed={viewMode === 'list'}
            aria-label={t('listView')}
            title={t('listView')}
            onClick={() => setViewMode('list')}
          >
            <List {...iconProps} />
          </button>
        </div>
      </div>
      {isFeatureEnabled('advanced_filters') ? (
        <div className="frkt-toolbar frkt-toolbar--filters" role="group" aria-label={t('filtersLabel')}>
          {onFiltersClose ? (
            <div className="frkt-layer-close">
              <button type="button" className="button" onClick={onFiltersClose}>
                {t('dismiss')}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className={`button frkt-more-filters__trigger${secondaryFilters.length ? ' is-active' : ''}`}
            aria-expanded={moreFiltersOpen}
            aria-controls="frkt-more-filters"
            onClick={() => setMoreFiltersOpen((value) => !value)}
          >
            <SlidersHorizontal {...iconProps} />
            <span>{t('filtersLabel')}{secondaryFilters.length ? ` (${secondaryFilters.length})` : ''}</span>
          </button>
          {viewMode === 'grid' ? (
            <div className="frkt-grid-size-toggle" role="group" aria-label={t('previewSize')}>
              {([
                ['small', Grid3X3, t('previewSmall')],
                ['medium', LayoutGrid, t('previewMedium')],
                ['large', Square, t('previewLarge')],
              ] as const).map(([size, Icon, label]) => (
                <button
                  key={size}
                  type="button"
                  className={gridPreviewSize === size ? 'is-active' : ''}
                  aria-label={label}
                  title={label}
                  aria-pressed={gridPreviewSize === size}
                  onClick={() => setGridPreviewSize(size)}
                >
                  <Icon {...iconProps} />
                </button>
              ))}
            </div>
          ) : null}
          <SortFilter />
          <div
            id="frkt-more-filters"
            className={`frkt-more-filters${moreFiltersOpen ? ' is-open' : ''}`}
          >
            <FileTypeFilter />
            <FlagsFilter />
            <AiStatusFilter />
            <ExtraFilters />
          </div>
        </div>
      ) : null}
      {secondaryFilters.length ? (
        <div className="frkt-active-filters" aria-label={t('filtersLabel')}>
          {secondaryFilters.map((filter) => (
            <button key={filter.key} type="button" className="frkt-filter-chip" onClick={filter.clear}>
              <span>{filter.label}{filter.count > 1 ? ` ${filter.count}` : ''}</span>
              <X size={13} aria-hidden="true" />
              <span className="frkt-sr-only">{t('clear')}</span>
            </button>
          ))}
        </div>
      ) : null}
      {variant === 'library' && flagsFilter.includes('unused') && isFeatureEnabled('unused_detection') ? <UnusedScanControls /> : null}
      {showBulk ? <BulkBar /> : null}
    </div>
  );
}
