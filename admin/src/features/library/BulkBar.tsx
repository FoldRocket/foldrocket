import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type BulkAiField } from '../../api/client';
import { invalidateLibraryQueries, refreshDuplicatesAfterAttachmentChange } from '../../api/invalidate';
import { kickJobPump } from '../../api/jobPump';
import {
  cancelQueuedJobs,
  forEachWithProgress,
  waitUntilNotAnalyzing,
  withOperationProgress,
} from '../../api/operationProgress';
import { useI18n } from '../../i18n';
import { toastError, toastT } from '../../i18n/toastMessages';
import { useFeatureEnabled } from '../features/useFeature';
import { useUiStore } from '../../stores/ui';
import { FolderAssignControl } from '../folders/FolderAssignControl';
import { toast } from '../../ui/toast';
import { ConfirmModal } from '../../ui/Modal';
import type { MessageKey } from '../../i18n/catalogs';
import { rememberBulkConversion } from '../../api/bulkOperationState';
import { DownloadZipButton } from './DownloadZipButton';

const METADATA_FIELDS: BulkAiField[] = ['title', 'altText', 'caption', 'description'];
const AI_FIELDS: [BulkAiField, MessageKey][] = [['title', 'titleField'], ['altText', 'altText'], ['caption', 'caption'], ['description', 'description'], ['filename', 'bulkAiFilename']];
type ConvertFormat = 'jpeg' | 'png' | 'webp';

export function BulkBar() {
  const { t } = useI18n();
  const { selectedIds, clearSelection, folderId } = useUiStore();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [skipUsed, setSkipUsed] = useState(true);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeIds, setAnalyzeIds] = useState<number[]>([]);
  const [fields, setFields] = useState<BulkAiField[]>([...METADATA_FIELDS]);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertIds, setConvertIds] = useState<number[]>([]);
  const [convertFormat, setConvertFormat] = useState<ConvertFormat>('webp');
  const [convertQuality, setConvertQuality] = useState(100);
  const [folderBusy, setFolderBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const analysisEnabled = useFeatureEnabled('ai_analysis');
  const metadataEnabled = useFeatureEnabled('ai_metadata');
  const filenameEnabled = useFeatureEnabled('rename_file');
  const foldersEnabled = useFeatureEnabled('folders');
  const convertEnabled = useFeatureEnabled('format_convert');
  const downloadEnabled = useFeatureEnabled('download_zip');

  const analyze = useMutation({
    mutationFn: async ({ ids, fields }: { ids: number[]; fields: BulkAiField[] }) => {
      return withOperationProgress(
        {
          title: t('analyzingWithAi'),
          subtitle: t('waitAnalyze'),
          total: ids.length,
          pendingIds: ids,
          mode: 'docked',
        },
        async (update, control) => {
          const r = await api.bulkAnalyze(ids, fields);
          let cancelPromise: Promise<void> | null = null;
          const cancelJobs = () => {
            cancelPromise ??= cancelQueuedJobs(r.jobIds);
            return cancelPromise;
          };
          control.setCancelHandler(cancelJobs);

          const idSet = new Set(ids);
          const markAnalyzing = <T extends { attachmentId?: number; aiStatus?: string }>(item: T): T =>
            item.attachmentId && idSet.has(item.attachmentId)
              ? { ...item, aiStatus: 'analyzing' }
              : item;

          qc.setQueriesData({ queryKey: ['assets'] }, (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            const data = old as { items?: Array<{ attachmentId?: number; aiStatus?: string }> };
            if (!Array.isArray(data.items)) return old;
            return { ...data, items: data.items.map(markAnalyzing) };
          });

          for (const id of ids) {
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
          const completed = await waitUntilNotAnalyzing(ids, update, {
            failOnError: true,
            signal: control.signal,
          });
          if (!completed) {
            await cancelJobs();
            return { ...r, cancelled: true };
          }
          return { ...r, cancelled: false };
        }
      );
    },
    onSuccess: (r, { ids }) => {
      if (r.cancelled) {
        toast.info(toastT('toastAiCancelled'));
        void invalidateLibraryQueries(qc, ['asset', 'jobs', 'collections']);
        return;
      }
      toast.success(toastT('toastBulkAnalyzeQueued', { count: r.queued ?? ids.length }));
      void invalidateLibraryQueries(qc, ['asset', 'jobs', 'collections']);
      kickJobPump();
    },
    onError: (e: Error) =>
      toast.error(/api key/i.test(e.message) ? toastT('toastAiNoApiKey') : toastError('toastGenericError', e)),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const ids = [...selectedIds];
      const skip = skipUsed;
      setConfirmOpen(false);

      let deleted = 0;
      let skipped = 0;
      const removedIds: number[] = [];
      await forEachWithProgress(
        ids,
        {
          title: t('deletingMedia'),
          subtitle: t('removingSelected'),
        },
        async (id) => {
          const r = await api.bulkDelete([id], {
            confirmed: true,
            force: true,
            skipUsed: skip,
          });
          const gone = (r.deleted?.length ?? 0) + (r.trashed?.length ?? 0);
          deleted += gone;
          skipped += (r.skipped?.length ?? 0) + (r.blocked?.length ?? 0);
          if (gone > 0 || (r.skipped?.includes(id) && !(r.blocked?.includes(id)))) {
            removedIds.push(id);
          }
        }
      );
      return { deleted, skipped, removedIds };
    },
    onSuccess: async (r) => {
      const deleted = r.deleted;
      const skipped = r.skipped;
      toast.success(
        skipped > 0
          ? toastT('toastBulkTrashPartial', { trashed: deleted, skipped })
          : toastT('toastBulkTrashed', { count: deleted || selectedIds.length })
      );
      clearSelection();
      await Promise.all([
        refreshDuplicatesAfterAttachmentChange(qc, r.removedIds),
        invalidateLibraryQueries(qc, [
          'folders',
          'collections',
          'collection-assets',
          'unused',
          'asset',
        ]),
      ]);
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const convertMutation = useMutation({
    mutationFn: ({ ids, format, quality }: { ids: number[]; format: ConvertFormat; quality: number }) =>
      api.bulkConvert(ids, format, quality),
    onSuccess: (result) => {
      if (result.queued > 0) {
        rememberBulkConversion({
          operationId: result.operationId,
          jobIds: result.jobIds,
          total: result.queued,
        });
      }
      if (result.missing.length > 0) {
        toast.error(t('toastBulkConvertMissing', { count: result.missing.length }));
      }
      if (result.queued > 0) {
        toast.success(result.message);
        clearSelection();
      } else {
        toast.info(result.message);
      }
      void invalidateLibraryQueries(qc, ['asset', 'jobs', 'collections']);
      if (result.queued > 0) kickJobPump();
    },
    onError: (e: Error) => toast.error(toastError('toastConvertFailed', e)),
  });

  if (!selectedIds.length) return null;

  const busy = analyze.isPending || convertMutation.isPending || folderBusy || downloadBusy || remove.isPending;

  const openAnalyze = () => {
    setAnalyzeIds([...selectedIds]);
    setFields(metadataEnabled ? [...METADATA_FIELDS] : []);
    setAnalyzeOpen(true);
  };

  const openConvert = () => {
    setConvertIds([...selectedIds]);
    setConvertFormat('webp');
    setConvertQuality(100);
    setConvertOpen(true);
  };

  return (
    <>
      <div className="frkt-bulkbar" role="toolbar" aria-label={t('bulkActions')}>
        <div className="frkt-bulkbar__info">
          <strong>{selectedIds.length}</strong>
          <span>{t('selectedWord')}</span>
          <button type="button" className="button-link" onClick={clearSelection} disabled={busy}>
            {t('clear')}
          </button>
        </div>
        <div className="frkt-bulkbar__actions">
          {foldersEnabled ? <FolderAssignControl
            attachmentIds={selectedIds}
            defaultFolderId={folderId}
            variant="bulk"
            disabled={busy}
            onBusyChange={setFolderBusy}
            onAssigned={() => {
              clearSelection();
            }}
          /> : null}
          {analysisEnabled ? <button type="button" className="button" disabled={busy} onClick={openAnalyze}>
            {analyze.isPending ? t('analyzing') : t('analyzeAi')}
          </button> : null}
          {convertEnabled ? <button type="button" className="button" disabled={busy} onClick={openConvert}>
            {convertMutation.isPending ? t('converting') : t('convertFormat')}
          </button> : null}
          {downloadEnabled ? (
            <DownloadZipButton
              name={t('filesSelected', { count: selectedIds.length })}
              attachmentIds={selectedIds}
              disabled={busy}
              onBusyChange={setDownloadBusy}
            />
          ) : null}
          <button
            type="button"
            className="button frkt-btn-danger"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
          >
            {t('smartViewDelete')}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => !remove.isPending && setConfirmOpen(false)}
        onConfirm={() => remove.mutate()}
        title={t('deleteItemsTitle', { count: selectedIds.length })}
        confirmLabel={remove.isPending ? t('deleting') : t('deletePermanently')}
        cancelLabel={t('cancel')}
        busy={remove.isPending}
        danger
      >
        <p className="frkt-modal__copy">
          {t('deleteImmediate')}
        </p>
        <label className="frkt-check" style={{ marginTop: 12 }}>
          <span className="frkt-check__box">
            <input
              type="checkbox"
              checked={skipUsed}
              onChange={(e) => setSkipUsed(e.target.checked)}
              disabled={remove.isPending}
            />
            <span className="frkt-check__mark" aria-hidden="true" />
          </span>
          {t('skipUsedItems')}
        </label>
      </ConfirmModal>

      <ConfirmModal
        open={analyzeOpen}
        onClose={() => setAnalyzeOpen(false)}
        onConfirm={() => {
          if (!fields.length) return;
          setAnalyzeOpen(false);
          analyze.mutate({ ids: [...analyzeIds], fields: [...fields] });
        }}
        title={t('analyzeAi')}
        confirmLabel={t('analyzeAi')}
        confirmDisabled={!fields.length}
        busy={analyze.isPending}
      >
        <p className="frkt-modal__copy">{t('bulkAiChooseFields', { count: analyzeIds.length })}</p>
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {AI_FIELDS.map(([field, label]) => (
            <label className="frkt-check" key={field}>
              <span className="frkt-check__box">
                <input
                  type="checkbox"
                  checked={fields.includes(field)}
                  disabled={field === 'filename' ? !filenameEnabled : !metadataEnabled}
                  onChange={() => setFields((current) => current.includes(field) ? current.filter((f) => f !== field) : [...current, field])}
                />
                <span className="frkt-check__mark" aria-hidden="true" />
              </span>
              <span>{t(label)}</span>
            </label>
          ))}
        </div>
        {!filenameEnabled ? <p className="frkt-muted">{t('generateAllRenameUnavailable')}</p> : null}
      </ConfirmModal>

      <ConfirmModal
        open={convertOpen}
        onClose={() => !convertMutation.isPending && setConvertOpen(false)}
        onConfirm={() => {
          setConvertOpen(false);
          convertMutation.mutate({
            ids: [...convertIds],
            format: convertFormat,
            quality: convertFormat === 'png' ? 100 : convertQuality,
          });
        }}
        title={t('convertFormat')}
        confirmLabel={t('convertTo', { format: convertFormat === 'jpeg' ? 'JPG' : convertFormat.toUpperCase() })}
        busy={convertMutation.isPending}
      >
        <p className="frkt-modal__copy">
          {t('convertConfirm', { format: convertFormat === 'jpeg' ? 'JPG' : convertFormat.toUpperCase() })}
        </p>
        <p className="frkt-modal__copy" style={{ marginTop: 8 }}>
          <strong>{convertIds.length}</strong> {t('selectedWord')}. {t('onlyConvertNote')}
        </p>
        <label className="frkt-field" style={{ marginTop: 16 }}>
          <span>{t('targetFormat')}</span>
          <select value={convertFormat} onChange={(e) => setConvertFormat(e.target.value as ConvertFormat)}>
            <option value="jpeg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
        {convertFormat !== 'png' ? (
          <label className="frkt-field frkt-optimize__slider" style={{ marginTop: 12 }}>
            <div className="frkt-optimize__slider-head">
              <span>{t('quality')}</span>
              <strong>{convertQuality}%</strong>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={convertQuality}
              style={{ ['--frkt-range-pct' as string]: `${((convertQuality - 1) / 99) * 100}%` } as React.CSSProperties}
              onChange={(e) => setConvertQuality(Number(e.target.value))}
            />
            <span className="frkt-field__hint">{t('convertQualityHint')}</span>
          </label>
        ) : null}
        <p className="frkt-modal__copy" style={{ marginTop: 12 }}>{t('convertReferencesNotice')}</p>
      </ConfirmModal>
    </>
  );
}
