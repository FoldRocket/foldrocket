import { create } from 'zustand';
import type { MediaAsset } from '../types';
import { toast } from '../ui/toast';

type ViewMode = 'grid' | 'list';
export type GridPreviewSize = 'small' | 'medium' | 'large';
const GRID_PREVIEW_SIZE_KEY = 'frkt-grid-preview-size';

function initialGridPreviewSize(): GridPreviewSize {
  try {
    const saved = window.localStorage.getItem(GRID_PREVIEW_SIZE_KEY);
    if (saved === 'small' || saved === 'large') return saved;
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
  return 'medium';
}
export type Page = 'library' | 'duplicates' | 'health' | 'system' | 'settings' | 'features';
export type InspectorTabId = 'details' | 'tools' | 'ai-edit' | 'info';
export type InspectorToolFocus =
  | 'optimize'
  | 'crop'
  | 'resize'
  | 'convert'
  | 'remove-bg'
  | 'rename'
  | 'replace';

export type InspectorFocus = {
  attachmentId: number;
  tab: InspectorTabId;
  tool?: InspectorToolFocus;
};

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

interface UiState {
  page: Page;
  viewMode: ViewMode;
  gridPreviewSize: GridPreviewSize;
  selectedIds: number[];
  lastClickedId: number | null;
  activeAsset: MediaAsset | null;
  /** Ordered siblings for inspector prev/next (current library page, unused list, etc.). */
  inspectorQueue: MediaAsset[];
  folderId: number | null;
  search: string;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  mimeFilter: string[];
  flagsFilter: string[];
  aiStatusFilter: string[];
  orientationFilter: string[];
  authorFilter: string[];
  dateFromFilter: string;
  dateToFilter: string;
  /** Active smart view id in the library sidebar (null = none). */
  smartViewId: number | null;
  inspectorOpen: boolean;
  /** One-shot request so the context menu can open the inspector on a tab or tool. */
  inspectorFocus: InspectorFocus | null;
  inspectorFocusToken: number;
  /** Blocking progress overlay for index / bulk ops (null = hidden). */
  indexProgress: {
    current: number;
    total: number;
    title?: string;
    subtitle?: string;
    /** Both modes stay scoped to FoldRocket; `docked` is used by bulk actions. */
    mode?: 'blocking' | 'docked';
    onCancel?: () => void;
    cancelRequested?: boolean;
    /** Durable server identifier used when progress was restored after navigation. */
    operationId?: string;
  } | null;
  /** Attachment IDs still waiting in the current bulk action (show per-card loading). */
  bulkPendingIds: number[];
  /** Assets pinned in their current listing while an inspector edit is running. */
  editingAssets: Record<number, {
    asset: MediaAsset;
    count: number;
    phase: 'processing' | 'refreshing';
  }>;
  /** Per-attachment epoch so preview URLs reload after optimize/crop/convert/replace. */
  mediaPreviewBust: Record<number, number>;
  setPage: (page: Page, opts?: { skipHash?: boolean }) => void;
  setViewMode: (mode: ViewMode) => void;
  setGridPreviewSize: (size: GridPreviewSize) => void;
  setSelectedIds: (ids: number[]) => void;
  clearSelection: () => void;
  toggleSelected: (id: number, opts?: { multi?: boolean; range?: boolean; orderedIds?: number[] }) => void;
  setActiveAsset: (asset: MediaAsset | null, queue?: MediaAsset[]) => void;
  bumpMediaPreview: (attachmentId: number) => void;
  detachFolderFromActiveAsset: (folderId: number) => void;
  setFolderId: (id: number | null) => void;
  setSmartViewId: (id: number | null) => void;
  /** Apply a smart view (or clear) without clearing smartViewId mid-flight. */
  applySmartViewState: (state: {
    smartViewId: number | null;
    mimeFilter?: string[];
    flagsFilter?: string[];
    aiStatusFilter?: string[];
    orientationFilter?: string[];
    authorFilter?: string[];
    dateFromFilter?: string;
    dateToFilter?: string;
    search?: string;
    folderId?: number | null;
  }) => void;
  setSearch: (q: string) => void;
  setMimeFilter: (mimes: string[]) => void;
  toggleMimeFilter: (mime: string) => void;
  setFlagsFilter: (flags: string[]) => void;
  toggleFlagsFilter: (flag: string) => void;
  setAiStatusFilter: (status: string | string[]) => void;
  toggleAiStatusFilter: (status: string) => void;
  setOrientationFilter: (orientation: string | string[]) => void;
  toggleOrientationFilter: (orientation: string) => void;
  setAuthorFilter: (authorIds: string | string[]) => void;
  toggleAuthorFilter: (authorId: string) => void;
  setDateFromFilter: (date: string) => void;
  setDateToFilter: (date: string) => void;
  clearAllFilters: () => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorFocus: (focus: InspectorFocus) => void;
  clearInspectorFocus: () => void;
  setIndexProgress: (
    progress: {
      current: number;
      total: number;
      title?: string;
      subtitle?: string;
      mode?: 'blocking' | 'docked';
      onCancel?: () => void;
      cancelRequested?: boolean;
      operationId?: string;
    } | null
  ) => void;
  setBulkPendingIds: (ids: number[]) => void;
  removeBulkPendingId: (id: number) => void;
  clearBulkPending: () => void;
  beginAssetEditing: (asset: MediaAsset) => void;
  setAssetEditingAsset: (asset: MediaAsset) => void;
  setAssetEditingPhase: (attachmentId: number, phase: 'processing' | 'refreshing') => void;
  endAssetEditing: (attachmentId: number) => void;
  /** Prefer toast.success / toast.error — thin alias for older call sites. */
  setFlash: (message: string, kind?: 'success' | 'error' | 'info') => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  page: 'library',
  viewMode: 'list',
  gridPreviewSize: initialGridPreviewSize(),
  selectedIds: [],
  lastClickedId: null,
  activeAsset: null,
  inspectorQueue: [],
  folderId: null,
  search: '',
  sortOrder: 'default:DESC',
  setSortOrder: (sortOrder) => set({ sortOrder, selectedIds: [], lastClickedId: null }),
  mimeFilter: [],
  flagsFilter: [],
  aiStatusFilter: [],
  orientationFilter: [],
  authorFilter: [],
  dateFromFilter: '',
  dateToFilter: '',
  smartViewId: null,
  inspectorOpen: false,
  inspectorFocus: null,
  inspectorFocusToken: 0,
  indexProgress: null,
  bulkPendingIds: [],
  editingAssets: {},
  mediaPreviewBust: {},
  setPage: (page) => {
    if (get().page === page) {
      set({ page });
      return;
    }
    set({ page, inspectorOpen: false, activeAsset: null, inspectorQueue: [] });
  },
  setViewMode: (viewMode) => set({ viewMode: viewMode === 'list' ? 'list' : 'grid' }),
  setGridPreviewSize: (gridPreviewSize) => {
    const next = gridPreviewSize === 'small' || gridPreviewSize === 'large' ? gridPreviewSize : 'medium';
    try {
      window.localStorage.setItem(GRID_PREVIEW_SIZE_KEY, next);
    } catch {
      // Keep the in-memory preference when persistent storage is unavailable.
    }
    set({ gridPreviewSize: next });
  },
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [], lastClickedId: null }),
  toggleSelected: (id, opts = {}) => {
    const { multi = false, range = false, orderedIds = [] } = opts;
    const current = get().selectedIds;
    const last = get().lastClickedId;

    if (range && last !== null && orderedIds.length) {
      const a = orderedIds.indexOf(last);
      const b = orderedIds.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [from, to] = a < b ? [a, b] : [b, a];
        const slice = orderedIds.slice(from, to + 1);
        const merged = Array.from(new Set([...current, ...slice]));
        set({ selectedIds: merged, lastClickedId: id });
        return;
      }
    }

    if (multi) {
      set({
        selectedIds: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
        lastClickedId: id,
      });
      return;
    }

    if (current.length === 1 && current[0] === id) {
      set({ selectedIds: [], lastClickedId: id });
      return;
    }

    set({ selectedIds: [id], lastClickedId: id });
  },
  setActiveAsset: (activeAsset, queue) => {
    if (!activeAsset) {
      set({ activeAsset: null, inspectorQueue: [] });
      return;
    }
    if (queue) {
      set({ activeAsset, inspectorOpen: true, inspectorQueue: queue });
      return;
    }
    // Keep the current queue when refreshing the same (or a sibling) asset without a new list.
    const current = get().inspectorQueue;
    const stillIn = current.some((a) => a.attachmentId === activeAsset.attachmentId);
    set({
      activeAsset,
      inspectorOpen: true,
      inspectorQueue: stillIn ? current : [],
    });
  },
  bumpMediaPreview: (attachmentId) =>
    set((s) => ({
      mediaPreviewBust: {
        ...s.mediaPreviewBust,
        [attachmentId]: Math.max(Date.now(), (s.mediaPreviewBust[attachmentId] ?? 0) + 1),
      },
    })),
  detachFolderFromActiveAsset: (folderId) => {
    const asset = get().activeAsset;
    if (!asset?.folderIds?.includes(folderId)) return;
    set({
      activeAsset: {
        ...asset,
        folderIds: asset.folderIds.filter((id) => id !== folderId),
      },
    });
  },
  setFolderId: (folderId) => set({ folderId, selectedIds: [], lastClickedId: null, smartViewId: null }),
  setSmartViewId: (smartViewId) => set({ smartViewId }),
  applySmartViewState: (state) =>
    set({
      smartViewId: state.smartViewId,
      mimeFilter: state.mimeFilter ? [...state.mimeFilter] : [],
      flagsFilter: state.flagsFilter ? [...state.flagsFilter] : [],
      aiStatusFilter: state.aiStatusFilter ? [...state.aiStatusFilter] : [],
      orientationFilter: state.orientationFilter ? [...state.orientationFilter] : [],
      authorFilter: state.authorFilter ? [...state.authorFilter] : [],
      dateFromFilter: state.dateFromFilter ?? '',
      dateToFilter: state.dateToFilter ?? '',
      search: state.search ?? '',
      folderId: state.folderId !== undefined ? state.folderId : get().folderId,
      selectedIds: [],
      lastClickedId: null,
    }),
  setSearch: (search) => set({ search, smartViewId: null }),
  setMimeFilter: (mimeFilter) => set({ mimeFilter: [...mimeFilter], smartViewId: null }),
  toggleMimeFilter: (mime) => {
    set({ mimeFilter: toggleInList(get().mimeFilter, mime), smartViewId: null });
  },
  setFlagsFilter: (flagsFilter) => set({ flagsFilter: [...flagsFilter], smartViewId: null }),
  toggleFlagsFilter: (flag) => {
    const flags = get().flagsFilter;
    const compatible = flag === 'used' ? flags.filter((f) => f !== 'unused') : flag === 'unused' ? flags.filter((f) => f !== 'used') : flags;
    set({ flagsFilter: toggleInList(compatible, flag), smartViewId: null });
  },
  setAiStatusFilter: (status) =>
    set({
      aiStatusFilter: Array.isArray(status) ? [...status] : status ? [status] : [],
      smartViewId: null,
    }),
  toggleAiStatusFilter: (status) => {
    set({ aiStatusFilter: toggleInList(get().aiStatusFilter, status), smartViewId: null });
  },
  setOrientationFilter: (orientation) =>
    set({
      orientationFilter: Array.isArray(orientation) ? [...orientation] : orientation ? [orientation] : [],
      smartViewId: null,
    }),
  toggleOrientationFilter: (orientation) => {
    set({ orientationFilter: toggleInList(get().orientationFilter, orientation), smartViewId: null });
  },
  setAuthorFilter: (authorIds) =>
    set({
      authorFilter: Array.isArray(authorIds)
        ? [...authorIds]
        : authorIds
          ? [String(authorIds)]
          : [],
      smartViewId: null,
    }),
  toggleAuthorFilter: (authorId) => {
    set({ authorFilter: toggleInList(get().authorFilter, authorId), smartViewId: null });
  },
  setDateFromFilter: (dateFromFilter) => set({ dateFromFilter, smartViewId: null }),
  setDateToFilter: (dateToFilter) => set({ dateToFilter, smartViewId: null }),
  clearAllFilters: () =>
    set({
      mimeFilter: [],
      flagsFilter: [],
      aiStatusFilter: [],
      orientationFilter: [],
      authorFilter: [],
      dateFromFilter: '',
      dateToFilter: '',
      smartViewId: null,
    }),
  setInspectorOpen: (inspectorOpen) =>
    set(
      inspectorOpen
        ? { inspectorOpen }
        : { inspectorOpen: false, activeAsset: null, inspectorQueue: [], inspectorFocus: null }
    ),
  setInspectorFocus: (inspectorFocus) =>
    set((s) => ({ inspectorFocus, inspectorFocusToken: s.inspectorFocusToken + 1 })),
  clearInspectorFocus: () => set({ inspectorFocus: null }),
  setIndexProgress: (indexProgress) => set({ indexProgress }),
  setBulkPendingIds: (ids) => set({ bulkPendingIds: [...new Set(ids)] }),
  removeBulkPendingId: (id) =>
    set((s) => ({
      bulkPendingIds: s.bulkPendingIds.includes(id)
        ? s.bulkPendingIds.filter((x) => x !== id)
        : s.bulkPendingIds,
    })),
  clearBulkPending: () => set({ bulkPendingIds: [] }),
  beginAssetEditing: (asset) =>
    set((s) => {
      const current = s.editingAssets[asset.attachmentId];
      return {
        editingAssets: {
          ...s.editingAssets,
          [asset.attachmentId]: {
            // Keep the original preview/list metadata stable until the edit finishes.
            asset: current?.asset ?? asset,
            count: (current?.count ?? 0) + 1,
            phase: 'processing',
          },
        },
      };
    }),
  setAssetEditingAsset: (asset) =>
    set((s) => {
      const current = s.editingAssets[asset.attachmentId];
      if (!current) return s;
      return {
        editingAssets: {
          ...s.editingAssets,
          [asset.attachmentId]: { ...current, asset },
        },
      };
    }),
  setAssetEditingPhase: (attachmentId, phase) =>
    set((s) => {
      const current = s.editingAssets[attachmentId];
      if (!current || current.phase === phase) return s;
      return {
        editingAssets: {
          ...s.editingAssets,
          [attachmentId]: { ...current, phase },
        },
      };
    }),
  endAssetEditing: (attachmentId) =>
    set((s) => {
      const current = s.editingAssets[attachmentId];
      if (!current) return s;
      if (current.count > 1) {
        return {
          editingAssets: {
            ...s.editingAssets,
            [attachmentId]: { ...current, count: current.count - 1 },
          },
        };
      }
      const next = { ...s.editingAssets };
      delete next[attachmentId];
      return { editingAssets: next };
    }),
  setFlash: (message, kind = 'info') => {
    if (kind === 'success') toast.success(message);
    else if (kind === 'error') toast.error(message);
    else toast.info(message);
  },
}));
