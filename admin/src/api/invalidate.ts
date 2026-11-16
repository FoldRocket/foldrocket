import type { QueryClient, InvalidateQueryFilters, InvalidateOptions } from '@tanstack/react-query';
import type { MediaAsset } from '../types';

/** Queries that should refresh whenever library media or indexes change. */
const LIBRARY_QUERY_ROOTS = [
  'assets',
  'asset',
  'folders',
  'collections',
  'collection-assets',
  'unused',
  'duplicates',
  'health',
  'jobs',
] as const;

type LibraryRoot = (typeof LIBRARY_QUERY_ROOTS)[number];

type DuplicatesQueryData = {
  items: Array<{
    hash: string;
    count: number;
    type: string;
    suggestedKeepId: number;
    reason: string;
    items: MediaAsset[];
  }>;
  total: number;
  page?: number;
  per_page?: number;
  exactTotal?: number;
  nearTotal?: number;
};

function rootOf(filters?: InvalidateQueryFilters): string | undefined {
  const key = filters?.queryKey;
  if (!Array.isArray(key) || key.length === 0) return undefined;
  return typeof key[0] === 'string' ? key[0] : undefined;
}

/**
 * Drop a deleted attachment from cached duplicate groups immediately,
 * then refetch so pagination / totals stay correct.
 */
export function refreshDuplicatesAfterAttachmentChange(
  qc: QueryClient,
  attachmentIds: number | number[]
): Promise<void> {
  const ids = new Set(
    (Array.isArray(attachmentIds) ? attachmentIds : [attachmentIds])
      .map((id) => Number(id))
      .filter((id) => id > 0)
  );
  if (ids.size === 0) {
    return qc.refetchQueries({ queryKey: ['duplicates'] }).then(() => undefined);
  }

  qc.setQueriesData<DuplicatesQueryData>({ queryKey: ['duplicates'] }, (old) => {
    if (!old || !Array.isArray(old.items)) {
      return old;
    }
    const before = old.items.length;
    const items = old.items
      .map((group) => {
        const nextItems = group.items.filter((a) => !ids.has(Number(a.attachmentId)));
        return {
          ...group,
          items: nextItems,
          count: nextItems.length,
        };
      })
      .filter((group) => group.items.length >= 2);
    return {
      ...old,
      items,
      total: Math.max(0, (old.total ?? before) - (before - items.length)),
    };
  });

  return Promise.all([
    qc.invalidateQueries({ queryKey: ['duplicates'] }),
    qc.refetchQueries({ queryKey: ['duplicates'] }),
  ]).then(() => undefined);
}

/**
 * Invalidate library-related queries. Always refreshes Health so vitals stay current
 * after analyze, delete, upload, optimize, duplicates, etc.
 */
export function invalidateLibraryQueries(
  qc: QueryClient,
  extra: LibraryRoot[] = []
): Promise<void> {
  const roots = new Set<string>(['assets', 'health', ...extra]);
  return Promise.all(
    [...roots].map((queryKey) => qc.invalidateQueries({ queryKey: [queryKey] }))
  ).then(() => undefined);
}

/**
 * When any media/index query is invalidated, also invalidate Health (and Unused when relevant).
 * Call once after creating the QueryClient.
 */
export function installHealthInvalidationBridge(qc: QueryClient): void {
  const original = qc.invalidateQueries.bind(qc);

  qc.invalidateQueries = ((
    filters?: InvalidateQueryFilters,
    options?: InvalidateOptions
  ) => {
    const result = original(filters, options);
    const root = rootOf(filters);

    if (
      root &&
      root !== 'health' &&
      root !== 'system' &&
      root !== 'settings' &&
      (LIBRARY_QUERY_ROOTS as readonly string[]).includes(root)
    ) {
      void original({ queryKey: ['health'] });
    }

    return result;
  }) as typeof qc.invalidateQueries;
}
