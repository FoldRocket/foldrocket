import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useUiStore } from '../../stores/ui';
import { useI18n } from '../../i18n';
import { toastError } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { LibraryScanProgress, useLibraryScan } from '../jobs/LibraryScanProgress';
import { runFullLibraryIndex } from './runFullLibraryIndex';

/** Global index status. Active progress is always visible; the idle warning is optional. */
export function IndexIncompleteBanner({
  showIncomplete = true,
}: {
  showIncomplete?: boolean;
}) {
  const { t } = useI18n();
  const scan = useLibraryScan('index');
  const indexProgress = useUiStore((s) => s.indexProgress);
  const qc = useQueryClient();
  const [indexing, setIndexing] = useState(false);

  const { data } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    staleTime: 30_000,
  });

  const attachments = Number(data?.totals?.attachments ?? 0);
  const indexed = Math.min(Number(data?.totals?.indexed ?? 0), attachments);
  const needsIndex = attachments > 0 && indexed < attachments;
  const indexingBusy = indexing || scan.active || Boolean(indexProgress);

  if ((!needsIndex || !showIncomplete) && !indexingBusy) return null;

  const startFullIndex = async () => {
    if (indexingBusy) return;
    setIndexing(true);
    try {
      await runFullLibraryIndex({ indexed, attachments });
      void qc.invalidateQueries({ queryKey: ['library-scan', 'index'] });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['health'] }),
        qc.invalidateQueries({ queryKey: ['assets'] }),
        qc.invalidateQueries({ queryKey: ['system'] }),
        qc.invalidateQueries({ queryKey: ['jobs'] }),
      ]);
      toast.success(t('scanQueuedBackground'));
    } catch (e) {
      toast.error(toastError('toastGenericError', e as Error));
    } finally {
      setIndexing(false);
    }
  };

  if ((!needsIndex || !showIncomplete) && !scan.active) return null;

  if (scan.active) {
    return (
      <div className="frkt-index-progress-banner">
        <LibraryScanProgress kind="index" />
      </div>
    );
  }

  return (
    <div className="frkt-index-banner" role="status">
      <div>
        <strong>{t('indexIncomplete')}</strong>
        <p className="frkt-muted">
          {t('indexIncompleteBody', {
            indexed: indexed.toLocaleString(),
            total: attachments.toLocaleString(),
          })}
        </p>
      </div>
      <button
        type="button"
        className="button button-primary"
        disabled={indexingBusy}
        onClick={() => void startFullIndex()}
      >
        {indexingBusy ? t('indexing') : t('indexLibrary')}
      </button>
    </div>
  );
}
