import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { api } from '../../api/client';
import { kickJobPump } from '../../api/jobPump';
import { useI18n } from '../../i18n';
import { iconPropsSm } from '../../ui/icons';

function dismissedScanKey(kind: string, jobId: number): string {
  return `frkt-dismissed-scan:${kind}:${jobId}`;
}

function isScanDismissed(kind: string, jobId: number): boolean {
  try {
    return window.localStorage.getItem(dismissedScanKey(kind, jobId)) === '1';
  } catch {
    return false;
  }
}

function setScanDismissed(kind: string, jobId: number, dismissed: boolean): void {
  try {
    const key = dismissedScanKey(kind, jobId);
    if (dismissed) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch {
    // Dismiss still works for the current render if storage is unavailable.
  }
}

export function useLibraryScan(kind: 'index' | 'references' | 'duplicates') {
  const qc = useQueryClient();
  const previous = useRef('');
  const query = useQuery({
    queryKey: ['library-scan', kind],
    queryFn: () => api.getLibraryScan(kind),
    refetchInterval: (q) => ['pending', 'running', 'retrying'].includes(q.state.data?.status ?? '') ? 3000 : false,
  });
  const status = query.data?.status ?? 'idle';
  const active = ['pending', 'running', 'retrying'].includes(status);
  useEffect(() => {
    if (active && window.FRKT_BOOT.canManageJobs) kickJobPump();
    if (previous.current && previous.current !== status && status === 'completed') {
      for (const key of ['assets', 'unused', 'duplicates', 'health']) void qc.invalidateQueries({ queryKey: [key] });
    }
    previous.current = status;
  }, [active, status, qc]);
  return { ...query, active };
}

export function LibraryScanProgress({ kind }: { kind: 'index' | 'references' | 'duplicates' }) {
  const { t } = useI18n();
  const { data, active, error } = useLibraryScan(kind);
  const qc = useQueryClient();
  const [dismissedJobId, setDismissedJobId] = useState<number | null>(null);
  const action = useMutation({
    mutationFn: async (retry: boolean) => { if (retry) await api.retryJob(data!.jobId); else await api.cancelJob(data!.jobId); },
    onSuccess: (_result, retry) => {
      if (retry && data) {
        setScanDismissed(kind, data.jobId, false);
        setDismissedJobId(null);
      }
      void qc.invalidateQueries({ queryKey: ['library-scan', kind] });
      kickJobPump();
    },
  });
  if (error) return <p className="frkt-notice frkt-state--error">{(error as Error).message}</p>;
  if (!data || data.status === 'idle') return null;
  if (data.status === 'failed' || data.status === 'cancelled') {
    if (dismissedJobId === data.jobId || isScanDismissed(kind, data.jobId)) return null;
    return (
      <div className="frkt-scan-interrupted" role="status">
        <span className="frkt-scan-interrupted__icon" aria-hidden="true">
          <CircleAlert {...iconPropsSm} />
        </span>
        <div className="frkt-scan-interrupted__content">
          <strong>{t('scanInterruptedTitle')}</strong>
          <p>{t('scanInterruptedBody')}</p>
          {action.error ? <p className="frkt-state--error">{action.error.message}</p> : null}
          <div className="frkt-scan-interrupted__actions">
            {window.FRKT_BOOT.canManageJobs ? (
              <button
                className="button button-primary"
                type="button"
                disabled={action.isPending}
                onClick={() => action.mutate(true)}
              >
                <RotateCcw {...iconPropsSm} />
                {t('resumeScan')}
              </button>
            ) : null}
            <button
              className="button frkt-scan-interrupted__dismiss"
              type="button"
              onClick={() => {
                setScanDismissed(kind, data.jobId, true);
                setDismissedJobId(data.jobId);
              }}
            >
              <X {...iconPropsSm} />
              {t('dismiss')}
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!active) return <p className="frkt-muted">{t('scanCompleteBackground')}</p>;
  const scanLabel = data.phase === 'compare'
    ? t('scanComparingTitle')
    : kind === 'index' && data.mode === 'differential'
      ? t('scanLibrary')
    : data.includesUsage
      ? `${t('indexLibrary')} · ${t('rebuildUsage')}`
      : t(kind === 'index' ? 'indexLibrary' : kind === 'references' ? 'rebuildUsage' : 'scanLibrary');
  const progress = Math.max(0, Math.min(100, data.progress));
  return (
    <div className="frkt-scan-progress" role="status">
      <div className="frkt-scan-progress__header">
        <span className="frkt-scan-progress__icon" aria-hidden="true">
          <LoaderCircle {...iconPropsSm} />
        </span>
        <div className="frkt-scan-progress__heading">
          <strong>{scanLabel}</strong>
          <span>{t('scanBackgroundHint')}</span>
        </div>
        <strong className="frkt-scan-progress__percent">{progress}%</strong>
      </div>
      <div
        className="frkt-scan-progress__track"
        role="progressbar"
        aria-label={scanLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="frkt-scan-progress__footer">
        <span>{t('scanProgressCount', {
          current: data.processed.toLocaleString(),
          total: data.total.toLocaleString(),
        })}</span>
        {window.FRKT_BOOT.canManageJobs ? (
          <button
            className="button frkt-scan-progress__cancel"
            type="button"
            disabled={action.isPending}
            onClick={() => action.mutate(false)}
          >
            <X {...iconPropsSm} />
            {t('cancel')}
          </button>
        ) : null}
      </div>
      {action.error ? <p className="frkt-state--error">{action.error.message}</p> : null}
    </div>
  );
}
