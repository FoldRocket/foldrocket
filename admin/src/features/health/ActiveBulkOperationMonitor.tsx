import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, type ActiveBulkOperation } from '../../api/client';
import { cancelQueuedJobs } from '../../api/operationProgress';
import { kickJobPump } from '../../api/jobPump';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { toast } from '../../ui/toast';
import {
  clearRememberedBulkConversion,
  readRememberedBulkConversion,
  rememberBulkConversion,
} from '../../api/bulkOperationState';

const POLL_MS = 1000;

/** Rebuild a durable bulk progress view after refresh or returning to FoldRocket. */
export function ActiveBulkOperationMonitor() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const restoredId = useRef<string | null>(null);
  const restoredJobIds = useRef<number[]>([]);
  const restoredKind = useRef<'analyze' | 'convert' | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer = 0;

    const clearRestoredProgress = async () => {
      const operationId = restoredId.current;
      const hadRestoredOperation = Boolean(
        operationId ||
        restoredJobIds.current.length ||
        restoredKind.current ||
        useUiStore.getState().indexProgress?.operationId
      );
      if (!hadRestoredOperation) return;
      if (operationId) {
        const state = useUiStore.getState();
        if (state.indexProgress?.operationId === operationId) {
          state.setIndexProgress(null);
          state.clearBulkPending();
        }
      }
      restoredId.current = null;
      restoredJobIds.current = [];
      restoredKind.current = null;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assets'] }),
        qc.invalidateQueries({ queryKey: ['jobs'] }),
        qc.invalidateQueries({ queryKey: ['collections'] }),
        qc.invalidateQueries({ queryKey: ['health'] }),
      ]);
    };

    const show = (operation: ActiveBulkOperation) => {
      restoredId.current = operation.operationId;
      restoredJobIds.current = operation.jobIds;
      restoredKind.current = operation.kind;
      if (operation.kind === 'convert') {
        rememberBulkConversion({
          operationId: operation.operationId,
          jobIds: operation.jobIds,
          total: operation.total,
        });
      }
      const state = useUiStore.getState();
      state.setBulkPendingIds(operation.openAttachmentIds);
      const cancel = () => {
        const current = useUiStore.getState().indexProgress;
        if (!current || current.operationId !== operation.operationId || current.cancelRequested) return;
        useUiStore.getState().setIndexProgress({ ...current, cancelRequested: true });
        void cancelQueuedJobs(operation.openJobIds);
      };
      state.setIndexProgress({
        current: operation.current,
        total: operation.total,
        title: operation.kind === 'convert' ? t('converting') : t('analyzingWithAi'),
        subtitle: operation.kind === 'analyze' ? t('waitAnalyze') : t('indexWaitFinish'),
        mode: 'docked',
        onCancel: cancel,
        cancelRequested: state.indexProgress?.operationId === operation.operationId
          ? state.indexProgress.cancelRequested
          : false,
        operationId: operation.operationId,
      });
    };

    const poll = async () => {
      try {
        const { operation } = await api.getActiveBulkOperation();
        if (stopped) return;
        if (!operation) {
          const remembered = readRememberedBulkConversion();
          const operationId = restoredId.current ?? remembered?.operationId ?? null;
          const jobIds = restoredJobIds.current.length ? restoredJobIds.current : remembered?.jobIds ?? [];
          const kind = restoredKind.current ?? (remembered ? 'convert' : null);
          if (operationId && kind === 'convert' && jobIds.length) {
            const jobs = await Promise.allSettled(jobIds.map((id) => api.getJob(id)));
            const statuses = jobs
              .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof api.getJob>>> => item.status === 'fulfilled')
              .map((item) => item.value.status);
            const stillOpen = statuses.some((status) => ['pending', 'running', 'retrying'].includes(status));
            if (!stillOpen && statuses.length === jobIds.length) {
              const failed = statuses.filter((status) => status === 'failed').length;
              if (failed > 0) {
                toast.error(t('toastBulkConvertPartial', { failed, total: remembered?.total ?? jobIds.length }));
              }
              clearRememberedBulkConversion(operationId);
            }
          }
          await clearRestoredProgress();
          timer = window.setTimeout(poll, POLL_MS);
          return;
        }

        const current = useUiStore.getState().indexProgress;
        if (!current || current.operationId === operation.operationId) {
          show(operation);
          kickJobPump();
        }
        timer = window.setTimeout(poll, POLL_MS);
      } catch {
        if (!stopped) timer = window.setTimeout(poll, POLL_MS * 2);
      }
    };

    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [qc, t]);

  return null;
}
