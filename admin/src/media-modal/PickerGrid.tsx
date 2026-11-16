import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useI18n } from '../i18n';
import { useUiStore } from '../stores/ui';
import type { MediaAsset } from '../types';
import { AssetThumb } from '../features/library/AssetThumb';
import {
  flagsToAssetParams,
  formatAspectRatio,
  formatFileLabel,
  isImageMime,
  serializeListParam,
  serializeMimeFilter,
} from '../features/library/fileTypes';

type WpMediaController = {
  state: () => {
    get: (key: string) => {
      get?: (id: number) => unknown;
      add?: (attachment: unknown) => void;
      remove?: (attachment: unknown) => void;
      reset?: (attachments: unknown[]) => void;
      on?: (event: string, cb: () => void) => void;
      off?: (event: string, cb: () => void) => void;
    } & boolean;
  };
  select?: () => void;
  trigger?: (event: string) => void;
};

function formatBytes(n?: number | null) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function clampPerPage(n: number) {
  return Math.min(100, Math.max(1, Math.round(n) || 20));
}

function readWpSelectedIds(controller: WpMediaController): number[] {
  try {
    const selection = controller.state().get('selection') as {
      models?: Array<{ id?: number; get?: (k: string) => unknown }>;
      map?: (fn: (m: { id?: number }) => number) => number[];
    };
    if (!selection) return [];
    if (typeof selection.map === 'function') {
      return selection.map((m) => Number(m.id)).filter((id) => id > 0);
    }
    return (selection.models || [])
      .map((m) => Number(m.id))
      .filter((id) => id > 0);
  } catch {
    return [];
  }
}

function isMultiple(controller: WpMediaController): boolean {
  try {
    return Boolean(controller.state().get('multiple'));
  } catch {
    return false;
  }
}

export function PickerGrid({ controller }: { controller: WpMediaController }) {
  const { t } = useI18n();
  const {
    search,
    folderId,
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
  } = useUiStore();
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>(() => readWpSelectedIds(controller));

  useEffect(() => {
    const selection = controller.state().get('selection') as {
      on?: (e: string, cb: () => void) => void;
      off?: (e: string, cb: () => void) => void;
    };
    if (!selection?.on || !selection?.off) return;
    const sync = () => setSelectedIds(readWpSelectedIds(controller));
    selection.on('add remove reset', sync);
    sync();
    return () => {
      selection.off?.('add remove reset', sync);
    };
  }, [controller]);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });

  const perPage = clampPerPage(
    Number(
      (settingsQuery.data?.settings as { general?: { items_per_page?: number } } | undefined)?.general
        ?.items_per_page ??
        window.FRKT_BOOT.itemsPerPage ??
        20
    )
  );

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
      'picker',
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

  const selectAttachment = (attachmentId: number, closeIfSingle: boolean) => {
    const wpMedia = (window as unknown as { wp?: { media?: { attachment: (id: number) => {
      fetch: () => { done: (cb: () => void) => void };
    } } } }).wp?.media;
    if (!wpMedia) return;

    const selection = controller.state().get('selection') as {
      get?: (id: number) => unknown;
      add?: (a: unknown) => void;
      remove?: (a: unknown) => void;
      reset?: (a: unknown[]) => void;
    };
    if (!selection) return;

    const attachment = wpMedia.attachment(attachmentId);
    attachment.fetch().done(() => {
      if (isMultiple(controller)) {
        if (selection.get?.(attachmentId)) {
          selection.remove?.(attachment);
        } else {
          selection.add?.(attachment);
        }
      } else {
        selection.reset?.([attachment]);
        if (closeIfSingle) {
          try {
            if (typeof controller.select === 'function') controller.select();
            else controller.trigger?.('select');
          } catch {
            /* ignore */
          }
        }
      }
      setSelectedIds(readWpSelectedIds(controller));
    });
  };

  if (isLoading) {
    return (
      <div className="frkt-state">
        <h2>{t('loadingLibrary')}</h2>
        <p className="frkt-muted">{t('loading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="frkt-state frkt-state--error">
        <h2>{t('couldntLoadMedia')}</h2>
        <p>{(error as Error).message || t('error')}</p>
        <button type="button" className="button" onClick={() => refetch()}>
          {t('bulkAltRetry')}
        </button>
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <div className="frkt-state">
        <h2>{t('noMediaFound')}</h2>
        <p className="frkt-muted">
          {folderId ? t('pickerFolderEmpty') : t('pickerNoMatches')}
        </p>
      </div>
    );
  }

  const total = data.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  return (
    <>
      <div className={`frkt-select-row frkt-select-row--${viewMode}`}>
        <span className="frkt-muted">
          {t('rangeOf', { from, to, total: total.toLocaleString() })}
          {isFetching ? ' · …' : ''}
        </span>
      </div>
      <div className={`frkt-grid frkt-grid--${viewMode} frkt-grid--size-${gridPreviewSize}`}>
        {viewMode === 'list' ? (
          <div className="frkt-list-head">
            {/* Spacer matches library checkbox column so grid columns align. */}
            <span className="frkt-list-head__check" aria-hidden="true" />
            <span className="frkt-list-head__name">{t('smartViewName')}</span>
            <span>{t('colType')}</span>
            <span>{t('colSize')}</span>
            <span>{t('colDimensions')}</span>
            <span>{t('aspectRatio')}</span>
            <span>{t('colStatus')}</span>
          </div>
        ) : null}
        {data.items.map((asset) => (
          <PickerCard
            key={asset.attachmentId}
            asset={asset}
            viewMode={viewMode}
            selected={selectedIds.includes(asset.attachmentId)}
            onOpen={() => selectAttachment(asset.attachmentId, false)}
            onOpenAndClose={() => selectAttachment(asset.attachmentId, true)}
          />
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
        </nav>
      ) : null}
    </>
  );
}

function PickerCard({
  asset,
  selected,
  onOpen,
  onOpenAndClose,
  viewMode,
}: {
  asset: MediaAsset;
  selected: boolean;
  onOpen: () => void;
  onOpenAndClose: () => void;
  viewMode: 'grid' | 'list';
}) {
  const { t } = useI18n();
  const format = formatFileLabel(asset.mimeType, asset.filename);
  const dims = asset.width && asset.height ? `${asset.width}×${asset.height}` : format;
  const size = formatBytes(asset.fileSize);
  const aspectRatio = formatAspectRatio(asset.width, asset.height);
  const showAltStatus = isImageMime(asset.mimeType);
  const status = showAltStatus ? (asset.altText?.trim() ? 'good' : 'missing') : null;
  const previewEpoch = useUiStore((s) => s.mediaPreviewBust[asset.attachmentId] ?? 0);

  return (
    <div className={`frkt-card ${selected ? 'is-selected' : ''}`}>
      {/* Spacer keeps list grid columns aligned with the library (checkbox col). */}
      {viewMode === 'list' ? <span className="frkt-card__check" aria-hidden="true" /> : null}
      <button
        type="button"
        className="frkt-card__btn"
        onClick={onOpen}
        onDoubleClick={(e) => {
          e.preventDefault();
          onOpenAndClose();
        }}
      >
        <div className="frkt-card__thumb">
          <AssetThumb
            asset={asset}
            bustEpoch={previewEpoch}
            label={viewMode === 'grid' ? format : ''}
            sizes={viewMode === 'list' ? '40px' : '(max-width: 782px) calc(50vw - 24px), 240px'}
          />
          {status ? (
            <span
              className={`frkt-status-dot frkt-status-dot--${status}`}
              title={status === 'good' ? t('altPresent') : t('altMissing')}
            />
          ) : null}
        </div>
        <div className="frkt-card__meta">
          <div className="frkt-card__identity">
            <strong className="frkt-card__filename" title={asset.filename}>
              {asset.filename}
            </strong>
          </div>
          {viewMode === 'list' ? (
            <>
              <span className="frkt-card__type">{format}</span>
              <span className="frkt-card__size">{size}</span>
              <span className="frkt-card__dims">{dims}</span>
              <span className="frkt-card__aspect">{aspectRatio}</span>
              {status ? (
                <span
                  className={`frkt-status-dot frkt-status-dot--${status}`}
                  title={status === 'good' ? t('altPresent') : t('altMissing')}
                />
              ) : (
                <span />
              )}
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
