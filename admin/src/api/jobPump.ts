import type { QueryClient } from '@tanstack/react-query';
import { api } from './client';

/**
 * Browser queue nudge.
 *
 * WP-Cron on small PHP-FPM pools (Local: 2 workers) picks jobs up minutes late and its
 * The SPA only asks the server to dispatch durable actions. Heavy handlers always run
 * through Action Scheduler or cron, never inside this REST request.
 */

const MAX_ITERATIONS = 60;
const LOCKED_RETRY_MS = 3000;
const IDLE_RECHECK_MS = 1500;

let queryClient: QueryClient | null = null;
let loop: Promise<void> | null = null;
let requestedWhileRunning = false;
let lastRefresh = 0;

export function installJobPump(qc: QueryClient): void {
  queryClient = qc;
}

/** Start the pump if idle; no-op (but remembered) while a loop is already running. */
export function kickJobPump(): void {
  if (loop) {
    requestedWhileRunning = true;
    return;
  }
  loop = run().finally(() => {
    loop = null;
    if (requestedWhileRunning) {
      requestedWhileRunning = false;
      kickJobPump();
    }
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function refreshAfterJob(type: string | undefined, force = false): void {
  if (!queryClient || (!force && Date.now() - lastRefresh < 1500)) return;
  lastRefresh = Date.now();
  queryClient.invalidateQueries({ queryKey: ['jobs'] });
  queryClient.invalidateQueries({ queryKey: ['asset'] });
  queryClient.invalidateQueries({ queryKey: ['assets'] });
  queryClient.invalidateQueries({ queryKey: ['collections'] });
  if (type === 'scan_duplicates') queryClient.invalidateQueries({ queryKey: ['duplicates'] });
  if (type === 'rebuild_index') queryClient.invalidateQueries({ queryKey: ['health'] });
  queryClient.invalidateQueries({ queryKey: ['library-scan'] });
  if (type === 'scan_references' || type === 'rebuild_references') queryClient.invalidateQueries({ queryKey: ['unused'] });
}

async function run(): Promise<void> {
  let idleChecks = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let res: Awaited<ReturnType<typeof api.runJob>>;
    try {
      res = await api.runJob();
    } catch {
      // Network hiccup / nonce refresh failure: don't hammer the server.
      return;
    }

    if (res.scheduled > 0) {
      await sleep(IDLE_RECHECK_MS);
      refreshAfterJob(undefined, res.pending <= 0);
      idleChecks = 0;
      if (res.pending <= 0) return;
      continue;
    }

    if (res.locked) {
      // Another runner (WP-Cron or a second tab) holds the job. Wait for it.
      await sleep(LOCKED_RETRY_MS);
      continue;
    }

    if (res.pending <= 0) {
      // Give a just-queued job (race with the mutation response) one more chance.
      if (idleChecks++ >= 1) return;
      await sleep(IDLE_RECHECK_MS);
    }
  }
  // Yield to the UI, then resume instead of abandoning a library after 60 batches.
  await sleep(IDLE_RECHECK_MS);
  requestedWhileRunning = true;
}
