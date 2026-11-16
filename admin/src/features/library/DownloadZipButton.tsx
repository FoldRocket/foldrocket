import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api } from '../../api/client';
import { kickJobPump } from '../../api/jobPump';
import { useI18n } from '../../i18n';
import { toast } from '../../ui/toast';
import { useUiStore } from '../../stores/ui';
import { useFeatureEnabled } from '../features/useFeature';
import { flagsToAssetParams, serializeListParam, serializeMimeFilter } from './fileTypes';

type Props = {
  name: string;
  attachmentIds?: number[];
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

export function DownloadZipButton({ name, attachmentIds, disabled = false, onBusyChange }: Props) {
  const { t } = useI18n();
  const enabled = useFeatureEnabled('download_zip');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<number | null>(null);
  const cancelRequested = useRef(false);
  const search = useUiStore((s) => s.search);
  const folderId = useUiStore((s) => s.folderId);
  const mimeFilter = useUiStore((s) => s.mimeFilter);
  const flagsFilter = useUiStore((s) => s.flagsFilter);
  const aiStatusFilter = useUiStore((s) => s.aiStatusFilter);
  const orientationFilter = useUiStore((s) => s.orientationFilter);
  const authorFilter = useUiStore((s) => s.authorFilter);
  const dateFromFilter = useUiStore((s) => s.dateFromFilter);
  const dateToFilter = useUiStore((s) => s.dateToFilter);

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
    enabled,
  });

  if (!enabled) return null;

  const download = async () => {
    setBusy(true);
    onBusyChange?.(true);
    setProgress(0);
    cancelRequested.current = false;
    try {
      const largeMb = (settings.data?.settings as { general?: { large_file_mb?: number } } | undefined)?.general
        ?.large_file_mb;
      const result = await api.downloadZip(
        attachmentIds?.length
          ? { name, attachmentIds: [...attachmentIds] }
          : {
              name,
              search: search || undefined,
              folder_id: folderId ?? undefined,
              mime: serializeMimeFilter(mimeFilter) || undefined,
              ai_status: serializeListParam(aiStatusFilter) || undefined,
              orientation: serializeListParam(orientationFilter) || undefined,
              author_id: serializeListParam(authorFilter) || undefined,
              date_from: dateFromFilter || undefined,
              date_to: dateToFilter || undefined,
              ...flagsToAssetParams(flagsFilter, largeMb),
            }
      );
      setJobId(result.jobId);
      kickJobPump();
      for (let attempt = 0; attempt < 600 && !cancelRequested.current; attempt += 1) {
        const job = await api.getJob(result.jobId);
        setProgress(Math.max(0, Math.min(100, Math.round(job.progress || 0))));
        if (job.status === 'completed') {
          const payload = job.payload as { result?: { url?: string } } | undefined;
          if (!payload?.result?.url) throw new Error(t('downloadZipFailed'));
          window.location.assign(payload.result.url);
          return;
        }
        if (job.status === 'failed') throw new Error(job.error || t('downloadZipFailed'));
        if (job.status === 'cancelled') return;
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      if (!cancelRequested.current) throw new Error(t('downloadZipFailed'));
    } catch (error) {
      if (cancelRequested.current) return;
      const code = (error as { code?: string }).code;
      if (code === 'download_empty') toast.error(t('downloadZipEmpty'));
      else if (code === 'download_too_many') toast.error(t('downloadZipTooMany'));
      else toast.error((error as Error).message || t('downloadZipFailed'));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      setJobId(null);
      setProgress(0);
    }
  };

  const cancel = async () => {
    cancelRequested.current = true;
    if (jobId) {
      try {
        await api.cancelJob(jobId);
      } catch {
        // The worker may have completed between the status poll and this click.
      }
    }
    setBusy(false);
    onBusyChange?.(false);
    setJobId(null);
    setProgress(0);
  };

  return (
    <span className="frkt-inline-actions">
      <button type="button" className="button" disabled={disabled || busy} onClick={() => void download()}>
        {busy ? `${t('downloadZipBusy')} ${progress}%` : t('downloadZip')}
      </button>
      {busy && jobId ? (
        <button type="button" className="button" onClick={() => void cancel()}>
          {t('cancel')}
        </button>
      ) : null}
    </span>
  );
}
