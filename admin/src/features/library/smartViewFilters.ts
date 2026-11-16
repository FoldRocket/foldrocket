import {
  flagsToAssetParams,
  largeFileMinBytes,
  resolveLargeFileMb,
  serializeListParam,
  serializeMimeFilter,
} from './fileTypes';

/** Snapshot of library UI filters that can be stored on a smart view. */
export type SmartViewUiFilters = {
  mimeFilter: string[];
  flagsFilter: string[];
  aiStatusFilter: string[];
  orientationFilter: string[];
  authorFilter: string[];
  dateFromFilter: string;
  dateToFilter: string;
  search?: string;
  folderId?: number | null;
  largeMb?: number | null;
};

/** AssetRepository list args stored in collection.filters. */
export type SmartViewStoredFilters = Record<string, string | number | boolean>;

export function uiFiltersToStored(
  ui: SmartViewUiFilters
): SmartViewStoredFilters {
  const out: SmartViewStoredFilters = {};
  const mime = serializeMimeFilter(ui.mimeFilter);
  if (mime) out.mime = mime;

  const ai = serializeListParam(ui.aiStatusFilter);
  if (ai) out.ai_status = ai;

  const orientation = serializeListParam(ui.orientationFilter);
  if (orientation) out.orientation = orientation;

  const author = serializeListParam(ui.authorFilter);
  if (author) out.author_id = author;

  if (ui.dateFromFilter) out.date_from = ui.dateFromFilter;
  if (ui.dateToFilter) out.date_to = ui.dateToFilter;
  if (ui.search?.trim()) out.search = ui.search.trim();
  if (ui.folderId != null && ui.folderId > 0) out.folder_id = ui.folderId;

  Object.assign(out, flagsToAssetParams(ui.flagsFilter, ui.largeMb));

  return out;
}

export function storedFiltersHaveCriteria(filters: SmartViewStoredFilters): boolean {
  return Object.keys(filters).length > 0;
}

/**
 * Apply stored collection filters back onto the library UI store setters.
 */
export function storedFiltersToUi(
  filters: Record<string, unknown>,
  largeMb?: number | null
): {
  mimeFilter: string[];
  flagsFilter: string[];
  aiStatusFilter: string[];
  orientationFilter: string[];
  authorFilter: string[];
  dateFromFilter: string;
  dateToFilter: string;
  search: string;
  folderId: number | null;
} {
  const mime =
    typeof filters.mime === 'string'
      ? filters.mime.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  const aiStatus =
    typeof filters.ai_status === 'string'
      ? filters.ai_status.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  const orientation =
    typeof filters.orientation === 'string'
      ? filters.orientation.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  const author =
    typeof filters.author_id === 'string' || typeof filters.author_id === 'number'
      ? String(filters.author_id)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const flags: string[] = [];
  if (filters.missing_alt) flags.push('missing_alt');
  if (Number(filters.usage_min) >= 1) flags.push('used');
  if (filters.usage_max === 0 || filters.usage_max === '0') flags.push('unused');
  if (typeof filters.min_size === 'number' && filters.min_size > 0) {
    const threshold = largeFileMinBytes(largeMb);
    // Treat any min_size near the configured large-file threshold as the large_files flag.
    if (Math.abs(filters.min_size - threshold) < threshold * 0.05 || filters.min_size >= threshold * 0.5) {
      flags.push('large_files');
    }
  }

  return {
    mimeFilter: mime,
    flagsFilter: flags,
    aiStatusFilter: aiStatus,
    orientationFilter: orientation,
    authorFilter: author,
    dateFromFilter: typeof filters.date_from === 'string' ? filters.date_from : '',
    dateToFilter: typeof filters.date_to === 'string' ? filters.date_to : '',
    search: typeof filters.search === 'string' ? filters.search : '',
    folderId:
      typeof filters.folder_id === 'number' && filters.folder_id > 0
        ? filters.folder_id
        : null,
  };
}

export function describeFilterCount(filters: Record<string, unknown>): number {
  return Object.keys(filters).length;
}

export { resolveLargeFileMb };
