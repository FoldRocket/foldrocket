import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { kickJobPump } from '../../api/jobPump';
import { useI18n } from '../../i18n';
import { useLibraryScan } from '../jobs/LibraryScanProgress';

/** The unused smart view uses the main paginated grid, not the legacy unused screen. */
export function UnusedScanControls() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const scan = useLibraryScan('references');
  const start = useMutation({
    mutationFn: () => api.rescanUnused(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library-scan', 'references'] });
      if (window.FRKT_BOOT.canManageJobs) kickJobPump();
    },
  });
  return (
    <div className="frkt-unused-controls">
      <p className="frkt-muted">{t(scan.data?.status === 'completed' ? 'unusedSafetyWarning' : 'unusedScanNeeded')}</p>
      <button type="button" className="button" disabled={start.isPending || scan.active} onClick={() => start.mutate()}>
        {start.isPending || scan.active ? t('scanning') : t('queueRescan')}
      </button>
      {start.error ? <p className="frkt-state--error">{start.error.message}</p> : null}
    </div>
  );
}
