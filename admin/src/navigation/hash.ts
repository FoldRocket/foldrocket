import type { Page } from '../stores/ui';
import { parseListParam, serializeListParam } from '../features/library/fileTypes';

export const HASH_PAGES = [
  'library',
  'duplicates',
  'health',
  'system',
  'settings',
  'features',
] as const satisfies readonly Page[];

/** Legacy SPA hashes → current pages */
const LEGACY_PAGE_MAP: Record<string, Page> = {
  review: 'duplicates',
  collections: 'library',
  unused: 'library',
  insights: 'library',
  duplicates: 'duplicates',
  jobs: 'library',
};

export type HashParams = {
  page: Page;
  search: string;
  folderId: number | null;
  assetId: number | null;
  mime: string[];
  flags: string[];
  aiStatus: string[];
  orientation: string[];
  authorIds: string[];
  dateFrom: string;
  dateTo: string;
  view: 'grid' | 'list';
};

function isPage(value: string): value is Page {
  return (HASH_PAGES as readonly string[]).includes(value);
}

/** Parse `#library?q=…&folder=1&asset=12` (also accepts `#/library`). */
export function parseHash(hash = window.location.hash): HashParams {
  const raw = hash.replace(/^#\/?/, '').trim();
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = (pathPart || 'library').replace(/\/+$/, '') || 'library';
  const params = new URLSearchParams(queryPart);

  let page: Page = 'library';

  if (isPage(path)) {
    page = path;
  } else if (LEGACY_PAGE_MAP[path]) {
    page = LEGACY_PAGE_MAP[path];
  }

  // Legacy Review tabs → library filters or duplicates page.
  const tabParam = params.get('tab');
  let flags = parseListParam(params.get('flags'));
  if (path === 'review' || path === 'unused' || path === 'duplicates') {
    if (path === 'duplicates' || tabParam === 'duplicates') {
      page = 'duplicates';
    } else if (tabParam === 'unused' || path === 'unused') {
      page = 'library';
      if (!flags.includes('unused')) flags = [...flags, 'unused'];
    } else if (tabParam === 'missing_alt') {
      page = 'library';
      if (!flags.includes('missing_alt')) flags = [...flags, 'missing_alt'];
    } else if (tabParam === 'large_files') {
      page = 'library';
      if (!flags.includes('large_files')) flags = [...flags, 'large_files'];
    } else if (path === 'review') {
      page = 'duplicates';
    }
  }

  const folderRaw = params.get('folder');
  const assetRaw = params.get('asset');
  const viewRaw = params.get('view');
  const allowedOrientation = new Set(['landscape', 'portrait', 'square']);
  const orientation = parseListParam(params.get('orientation')).filter((v) =>
    allowedOrientation.has(v.toLowerCase())
  );
  const authorIds = parseListParam(params.get('author')).filter((v) => /^\d+$/.test(v));
  const aiRaw = parseListParam(params.get('ai')).map((v) => (v === 'failed' ? 'pending' : v));
  let aiStatus = aiRaw.filter((v) => v === 'pending' || v === 'analyzed');
  if (tabParam === 'analyzed' && !aiStatus.length) aiStatus = ['analyzed'];

  return {
    page,
    search: params.get('q') || '',
    folderId: folderRaw && /^\d+$/.test(folderRaw) ? Number(folderRaw) : null,
    assetId: assetRaw && /^\d+$/.test(assetRaw) ? Number(assetRaw) : null,
    mime: parseListParam(params.get('mime')),
    flags,
    aiStatus,
    orientation,
    authorIds,
    dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(params.get('from') || '') ? (params.get('from') as string) : '',
    dateTo: /^\d{4}-\d{2}-\d{2}$/.test(params.get('to') || '') ? (params.get('to') as string) : '',
    view: viewRaw === 'list' ? 'list' : 'grid',
  };
}

export function buildHash(state: {
  page: Page;
  search?: string;
  folderId?: number | null;
  assetId?: number | null;
  mime?: string[];
  flags?: string[];
  aiStatus?: string[];
  orientation?: string[];
  authorIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  view?: 'grid' | 'list';
}): string {
  const params = new URLSearchParams();

  if (state.page === 'library') {
    if (state.search?.trim()) params.set('q', state.search.trim());
    if (state.folderId != null && state.folderId > 0) params.set('folder', String(state.folderId));
    const mime = serializeListParam(state.mime ?? []);
    if (mime) params.set('mime', mime);
    const flags = serializeListParam(state.flags ?? []);
    if (flags) params.set('flags', flags);
    const ai = serializeListParam(state.aiStatus ?? []);
    if (ai) params.set('ai', ai);
    const orientation = serializeListParam(state.orientation ?? []);
    if (orientation) params.set('orientation', orientation);
    const authors = serializeListParam(state.authorIds ?? []);
    if (authors) params.set('author', authors);
    if (state.dateFrom) params.set('from', state.dateFrom);
    if (state.dateTo) params.set('to', state.dateTo);
    if (state.view && state.view !== 'grid') params.set('view', state.view);
  }

  if (state.assetId != null && state.assetId > 0) params.set('asset', String(state.assetId));

  const query = params.toString();
  return query ? `#${state.page}?${query}` : `#${state.page}`;
}

export function writeHash(
  state: Parameters<typeof buildHash>[0],
  mode: 'push' | 'replace' = 'push'
): void {
  const next = buildHash(state);
  if (window.location.hash === next) return;
  if (mode === 'replace') {
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.replaceState(null, '', url);
  } else {
    window.location.hash = next;
  }
}
