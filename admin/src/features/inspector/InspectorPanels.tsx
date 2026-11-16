import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Folder, X } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';
import { toastError, toastT } from '../../i18n/toastMessages';
import type { AssetDetails, MediaAsset } from '../../types';
import { iconPropsSm } from '../../ui/icons';
import { toast } from '../../ui/toast';
import { formatAspectRatio, isImageMime } from '../library/fileTypes';

function formatAiStatus(
  status: string | null | undefined,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
): string {
  const value = (status || '').toLowerCase();
  if (value === 'pending' || value === 'failed') return t('notAnalyzed');
  if (value === 'analyzing') return t('analyzing');
  if (value === 'analyzed') return t('analyzed');
  if (value === 'skipped') return t('skipped');
  return status || '—';
}

function formatCodedStatus(
  value: string | number | null | undefined,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
): string | number | null | undefined {
  if (typeof value !== 'string') return value;
  const key = (
    {
      unknown: 'statusUnknown',
      none: 'statusNone',
      unique: 'dupUnique',
      exact: 'dupExact',
      near: 'dupNear',
      optimized: 'optOptimized',
      skipped: 'optSkipped',
      failed: 'optFailed',
    } as Record<string, MessageKey>
  )[value.toLowerCase()];
  return key ? t(key) : value;
}

export function FolderMembership({
  folderIds,
  attachmentId,
  onRemoved,
}: {
  folderIds: number[];
  attachmentId?: number | null;
  onRemoved?: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['folders'], queryFn: () => api.listFolders() });
  const known = (data?.items || []).filter((folder) => folderIds.includes(folder.id));
  const remove = useMutation({
    mutationFn: (folderId: number) => {
      if (!attachmentId) throw new Error(t('missingAttachment'));
      return api.unassignAttachmentsFromFolder(folderId, [attachmentId]);
    },
    onSuccess: async () => {
      toast.success(toastT('toastRemovedFromFolder'));
      await onRemoved?.();
      void queryClient.invalidateQueries({ queryKey: ['folders'] });
      void queryClient.invalidateQueries({ queryKey: ['assets'] });
      if (attachmentId) void queryClient.invalidateQueries({ queryKey: ['asset', attachmentId] });
    },
    onError: (error: Error) => toast.error(toastError('toastFolderUnassignFailed', error)),
  });

  if (isLoading && folderIds.length) {
    return <p className="frkt-muted frkt-folder-membership__empty">{t('loadingFolders')}</p>;
  }
  if (!folderIds.length || !known.length) {
    return <p className="frkt-muted frkt-folder-membership__empty">{t('notInAnyFolder')}</p>;
  }

  return (
    <div className="frkt-folder-membership">
      <ul className="frkt-folder-chips">
        {known.map((folder) => (
          <li key={folder.id} className="frkt-folder-chip">
            <span className="frkt-folder-chip__icon" aria-hidden="true"><Folder {...iconPropsSm} /></span>
            <span className="frkt-folder-chip__name" title={folder.name}>{folder.name}</span>
            {attachmentId ? (
              <button
                type="button"
                className="frkt-folder-chip__remove"
                aria-label={t('removeFromNamed', { name: folder.name })}
                title={t('removeFromFolder')}
                disabled={remove.isPending}
                onClick={() => remove.mutate(folder.id)}
              >
                <X {...iconPropsSm} size={12} />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

type InfoRow = { label: string; value?: string | number | null; mono?: boolean; href?: string };

function InfoRows({ rows }: { rows: InfoRow[] }) {
  const visible = rows.filter((row) => row.value !== undefined && row.value !== null && String(row.value).trim() !== '');
  if (!visible.length) return null;
  return (
    <dl className="frkt-info-grid">
      {visible.map((row) => (
        <div key={row.label} className="frkt-info-grid__row">
          <dt>{row.label}</dt>
          <dd className={row.mono ? 'is-mono' : undefined}>
            {row.href ? <a href={row.href} target="_blank" rel="noreferrer">{String(row.value)}</a> : String(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AssetInfoPanel({ asset, loading }: { asset: MediaAsset | null; loading: boolean }) {
  const { t } = useI18n();
  if (!asset) return null;
  const details: AssetDetails | undefined = asset.details;
  const file = details?.file;
  const wp = details?.wordpress;
  const image = details?.image;
  const ai = details?.ai;
  const exif = details?.exif ?? [];
  const mimeType = file?.mimeType || asset.mimeType;
  const imageWidth = image?.width ?? asset.width;
  const imageHeight = image?.height ?? asset.height;
  const aspectRatio =
    isImageMime(mimeType) && imageWidth && imageHeight
      ? formatAspectRatio(imageWidth, imageHeight)
      : null;

  return (
    <div className="frkt-asset-info">
      {loading && !details ? <p className="frkt-muted">{t('loadingFileDetails')}</p> : null}
      <section className="frkt-inspector__form frkt-asset-info__section">
        <h3>{t('fileSection')}</h3><p className="frkt-inspector__desc">{t('fileSectionHint')}</p>
        <InfoRows rows={[
          { label: t('attachmentId'), value: wp?.attachmentId ?? asset.attachmentId, mono: true },
          { label: t('mimeType'), value: file?.mimeType || asset.mimeType },
          { label: t('extension'), value: file?.extension ? `.${file.extension}` : null },
          { label: t('colSize'), value: file?.fileSizeLabel || (asset.fileSize ? `${(asset.fileSize / 1024).toFixed(1)} KB` : null) },
          { label: t('colDimensions'), value: image?.dimensions || (asset.width && asset.height ? `${asset.width} × ${asset.height}` : null) },
          { label: t('aspectRatio'), value: aspectRatio },
          { label: t('megapixels'), value: image?.megapixels != null ? `${image.megapixels} MP` : null },
          { label: t('pathLabel'), value: file?.path, mono: true, href: file?.url },
          { label: t('onDisk'), value: file ? (file.exists ? t('yes') : t('missing')) : null },
        ]} />
      </section>
      <section className="frkt-inspector__form frkt-asset-info__section">
        <h3>{t('wpSection')}</h3><p className="frkt-inspector__desc">{t('attachmentRecord')}</p>
        <InfoRows rows={[
          { label: t('uploaded'), value: formatDate(wp?.uploadedAt) },
          { label: t('modified'), value: formatDate(wp?.modifiedAt) },
          { label: t('author'), value: wp?.author },
          { label: t('colStatus'), value: wp?.postStatus },
          { label: t('editInWp'), value: wp?.editUrl ? t('openAttachment') : null, href: wp?.editUrl || undefined },
        ]} />
      </section>
      {ai?.status ? (
        <section className="frkt-inspector__form frkt-asset-info__section">
          <h3>{t('aiAndIndex')}</h3><p className="frkt-inspector__desc">{t('aiIndexHint')}</p>
          <InfoRows rows={[
            { label: t('aiStatus'), value: formatAiStatus(ai.status || asset.aiStatus, t) },
            { label: t('provider'), value: ai.provider },
            { label: t('modelLabel'), value: ai.model },
            { label: t('analyzedAt'), value: formatDate(ai.analyzedAt) },
            { label: t('duplicate'), value: formatCodedStatus(ai.duplicate || asset.duplicateStatus, t) },
            { label: t('optimizeHeading'), value: formatCodedStatus(ai.optimization || asset.optimizationStatus, t) },
            { label: t('usageCountLabel'), value: ai.usageCount ?? asset.usageCount },
            { label: 'SHA-256', value: ai.sha256, mono: true },
            { label: t('perceptualHash'), value: ai.phash, mono: true },
          ]} />
        </section>
      ) : null}
      {image?.sizes?.length ? (
        <section className="frkt-inspector__form frkt-asset-info__section">
          <h3>{t('generatedSizes')}</h3><p className="frkt-inspector__desc">{t('generatedSizesHint')}</p>
          <ul className="frkt-size-list">
            {image.sizes.map((size) => {
              const label = <><strong>{size.name}</strong><span>{size.width && size.height ? `${size.width} × ${size.height}` : '—'}{size.file ? ` · ${size.file}` : ''}</span></>;
              return <li key={size.name}>{size.url ? <a className="frkt-size-list__link" href={size.url} target="_blank" rel="noreferrer" title={t('openSize', { name: size.name })}>{label}</a> : label}</li>;
            })}
          </ul>
        </section>
      ) : null}
      {isImageMime(mimeType) ? (
        <section className="frkt-inspector__form frkt-asset-info__section">
          <h3>{t('exifCamera')}</h3><p className="frkt-inspector__desc">{t('exifHint')}</p>
          {exif.length ? <InfoRows rows={exif.map((row) => ({ label: row.label, value: row.value, mono: row.key.includes('sha') }))} /> : (
            <p className="frkt-muted" style={{ margin: 0 }}>{file?.extension === 'png' || file?.extension === 'webp' || file?.extension === 'svg' ? t('noExifFormat') : t('noExif')}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
