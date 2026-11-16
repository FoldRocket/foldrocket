import { api } from './client';
import { toastT } from '../i18n/toastMessages';
import { kickJobPump } from './jobPump';
import { useUiStore } from '../stores/ui';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type ProgressOpts = {
  title: string;
  subtitle?: string;
  total: number;
  /** When set, those cards show a loading layer until each id is marked done. */
  pendingIds?: number[];
  mode?: 'blocking' | 'docked';
  cancellable?: boolean;
};

export type OperationControl = {
  signal: AbortSignal;
  setCancelHandler: (handler: () => void | Promise<void>) => void;
};

/** Show progress (+ optional per-card pending layers) for the duration of `run`. */
export async function withOperationProgress<T>(
  opts: ProgressOpts,
  run: (
    update: (current: number, processedId?: number) => void,
    control: OperationControl
  ) => Promise<T>
): Promise<T> {
  const store = useUiStore.getState();
  const total = Math.max(0, opts.total);
  const mode = opts.mode ?? (opts.pendingIds?.length ? 'docked' : 'blocking');
  const cancellable = opts.cancellable ?? Boolean(opts.pendingIds?.length);
  const controller = new AbortController();
  let cancelHandler: (() => void | Promise<void>) | null = null;
  let cancelHandlerStarted = false;

  const runCancelHandler = () => {
    if (!cancelHandler || cancelHandlerStarted) return;
    cancelHandlerStarted = true;
    void Promise.resolve(cancelHandler()).catch(() => {
      // The operation still stops locally if a job finished before cancellation reached it.
    });
  };

  const cancel = () => {
    if (controller.signal.aborted) return;
    controller.abort();
    runCancelHandler();
    const current = useUiStore.getState().indexProgress;
    if (current) {
      useUiStore.getState().setIndexProgress({ ...current, cancelRequested: true });
    }
  };

  if (opts.pendingIds?.length) {
    store.setBulkPendingIds(opts.pendingIds);
  }

  const push = (current: number, processedId?: number) => {
    const s = useUiStore.getState();
    if (processedId != null) {
      s.removeBulkPendingId(processedId);
    }
    s.setIndexProgress({
      current: Math.min(Math.max(0, current), total || 1),
      total: total || 1,
      title: opts.title,
      subtitle: opts.subtitle,
      mode,
      onCancel: cancellable ? cancel : undefined,
      cancelRequested: controller.signal.aborted,
    });
  };

  const control: OperationControl = {
    signal: controller.signal,
    setCancelHandler: (handler) => {
      cancelHandler = handler;
      if (controller.signal.aborted) runCancelHandler();
    },
  };

  push(0);
  try {
    return await run(push, control);
  } finally {
    useUiStore.getState().setIndexProgress(null);
    useUiStore.getState().clearBulkPending();
  }
}

/** Run `each` for every id, updating progress and clearing each card’s loading layer. */
export async function forEachWithProgress<T>(
  ids: number[],
  opts: { title: string; subtitle?: string; mode?: 'blocking' | 'docked' },
  each: (id: number, index: number) => Promise<T>
): Promise<T[]> {
  return withOperationProgress(
    { ...opts, total: ids.length, pendingIds: ids, mode: opts.mode ?? 'docked' },
    async (update, control) => {
      const out: T[] = [];
      for (let i = 0; i < ids.length; i++) {
        if (control.signal.aborted) break;
        update(i);
        out.push(await each(ids[i], i));
        update(i + 1, ids[i]);
      }
      return out;
    }
  );
}

/**
 * After AI analysis jobs are queued, keep progress alive until none of the
 * selected assets are still `analyzing` (job pump drives completion).
 */
export async function waitUntilNotAnalyzing(
  ids: number[],
  update: (done: number, processedId?: number) => void,
  opts?: { timeoutMs?: number; failOnError?: boolean; signal?: AbortSignal }
): Promise<boolean> {
  if (!ids.length) {
    update(0);
    return true;
  }

  const pending = new Set(ids);
  const failed = new Set<number>();
  const deadline = Date.now() + (opts?.timeoutMs ?? 15 * 60 * 1000);
  update(0);
  kickJobPump();

  while (pending.size > 0 && Date.now() < deadline && !opts?.signal?.aborted) {
    const sample = [...pending].slice(0, 10);
    const finished: number[] = [];
    await Promise.all(
      sample.map(async (id) => {
        try {
          const asset = await api.getAsset(id);
          const status = (asset.aiStatus || '').toLowerCase();
          if (status === 'failed') failed.add(id);
          if (status !== 'analyzing') {
            pending.delete(id);
            finished.push(id);
          }
        } catch {
          failed.add(id);
          pending.delete(id);
          finished.push(id);
        }
      })
    );
    const done = ids.length - pending.size;
    if (finished.length) {
      for (const id of finished) {
        update(done, id);
      }
    } else {
      update(done);
    }
    if (pending.size === 0) break;
    kickJobPump();
    if (!opts?.signal?.aborted) await sleep(450);
  }

  if (opts?.signal?.aborted) return false;

  if (opts?.failOnError && pending.size) throw new Error(toastT('jobRunnerTimeout'));
  if (opts?.failOnError && failed.size) throw new Error(toastT('toastAiFailed'));

  for (const id of pending) {
    update(ids.length, id);
  }
  update(ids.length);
  return true;
}

/** Cancel every still-open durable job. Finished jobs are intentionally ignored. */
export async function cancelQueuedJobs(jobIds: number[]): Promise<void> {
  await Promise.allSettled(jobIds.map((jobId) => api.cancelJob(jobId)));
}
