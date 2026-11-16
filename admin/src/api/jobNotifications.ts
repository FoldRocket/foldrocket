import { api } from './client';
import { toast } from '../ui/toast';
import { useUiStore } from '../stores/ui';
import type { MediaAsset } from '../types';

type NotificationCopy = {
  success: string;
  failure: string;
};

type TrackedJob = {
  copy?: NotificationCopy;
  attachmentId?: number;
};

const tracked = new Map<number, TrackedJob>();
let timer: number | null = null;

function track(jobId: number, copy?: NotificationCopy, asset?: MediaAsset | null): void {
  if (jobId < 1) return;
  const current = tracked.get(jobId);
  if (asset && !current?.attachmentId) {
    useUiStore.getState().beginAssetEditing(asset);
  }
  tracked.set(jobId, {
    copy: copy ?? current?.copy,
    attachmentId: current?.attachmentId ?? asset?.attachmentId,
  });
  schedule(250);
}

export function trackJobNotification(
  jobId: number,
  copy: NotificationCopy,
  asset?: MediaAsset | null
): void {
  track(jobId, copy, asset);
}

/** Keep a library card loading until a background job reaches a terminal state. */
export function trackAssetJob(jobId: number, asset: MediaAsset | null | undefined): void {
  track(jobId, undefined, asset);
}

function schedule(delay = 1000): void {
  if (timer !== null || tracked.size === 0) return;
  timer = window.setTimeout(() => {
    timer = null;
    void poll();
  }, delay);
}

async function poll(): Promise<void> {
  await Promise.all(Array.from(tracked.entries()).map(async ([jobId, entry]) => {
    try {
      const job = await api.getJob(jobId);
      if (job.status === 'completed') {
        tracked.delete(jobId);
        if (entry.attachmentId) useUiStore.getState().endAssetEditing(entry.attachmentId);
        if (entry.copy) toast.success(entry.copy.success);
      } else if (job.status === 'failed') {
        tracked.delete(jobId);
        if (entry.attachmentId) useUiStore.getState().endAssetEditing(entry.attachmentId);
        if (entry.copy) toast.error(job.error || entry.copy.failure);
      } else if (job.status === 'cancelled') {
        tracked.delete(jobId);
        if (entry.attachmentId) useUiStore.getState().endAssetEditing(entry.attachmentId);
      }
    } catch {
      // Keep tracking temporary REST or network failures.
    }
  }));
  schedule();
}
