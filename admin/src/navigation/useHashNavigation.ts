import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { buildHash, parseHash, writeHash, HASH_PAGES } from './hash';
import { useUiStore, type Page } from '../stores/ui';

function isPage(value: string | undefined): value is Page {
  return !!value && (HASH_PAGES as readonly string[]).includes(value);
}

/**
 * Keeps Zustand UI state in sync with `location.hash` only
 * (`#library?q=…&folder=1&asset=12`, `#duplicates`, …).
 * Does not mutate WordPress admin `?page=` — that stays on the entry screen.
 */
export function useHashNavigation() {
  const applyingHash = useRef(false);
  const skipWrite = useRef(false);

  useEffect(() => {
    const applyFromHash = () => {
      const parsed = parseHash();
      applyingHash.current = true;
      skipWrite.current = true;

      const store = useUiStore.getState();
      store.setPage(parsed.page, { skipHash: true });
      store.setSearch(parsed.search);
      store.setFolderId(parsed.folderId);
      store.setMimeFilter(parsed.mime);
      store.setFlagsFilter(parsed.flags);
      store.setAiStatusFilter(parsed.aiStatus);
      store.setOrientationFilter(parsed.orientation);
      store.setAuthorFilter(parsed.authorIds);
      store.setDateFromFilter(parsed.dateFrom);
      store.setDateToFilter(parsed.dateTo);
      store.setViewMode(parsed.view);

      if (parsed.assetId) {
        api
          .getAsset(parsed.assetId)
          .then((asset) => {
            useUiStore.getState().setActiveAsset(asset);
          })
          .catch(() => {
            /* ignore missing asset in hash */
          });
      } else if (useUiStore.getState().activeAsset) {
        useUiStore.getState().setInspectorOpen(false);
      }

      queueMicrotask(() => {
        applyingHash.current = false;
        skipWrite.current = false;
      });
    };

    const bootPage = window.FRKT_BOOT?.initialPage;
    const emptyHash = !window.location.hash || window.location.hash === '#';

    if (emptyHash) {
      const page = isPage(bootPage) ? bootPage : 'library';
      writeHash({ page }, 'replace');
    } else if (isPage(bootPage)) {
      // Submenu entry wins when hash page differs from WP screen (first paint).
      const parsed = parseHash();
      if (parsed.page !== bootPage && parsed.page === 'library' && !parsed.search && !parsed.folderId) {
        writeHash({ page: bootPage }, 'replace');
      }
    }

    applyFromHash();

    window.addEventListener('hashchange', applyFromHash);
    return () => window.removeEventListener('hashchange', applyFromHash);
  }, []);

  useEffect(() => {
    const unsub = useUiStore.subscribe((state, prev) => {
      if (skipWrite.current || applyingHash.current) return;

      const pageChanged = state.page !== prev.page;
      const assetChanged = state.activeAsset?.attachmentId !== prev.activeAsset?.attachmentId;
      const libraryChanged =
        state.page === 'library' &&
        (state.search !== prev.search ||
          state.folderId !== prev.folderId ||
          state.mimeFilter.join(',') !== prev.mimeFilter.join(',') ||
          state.flagsFilter.join(',') !== prev.flagsFilter.join(',') ||
          state.aiStatusFilter.join(',') !== prev.aiStatusFilter.join(',') ||
          state.orientationFilter.join(',') !== prev.orientationFilter.join(',') ||
          state.authorFilter.join(',') !== prev.authorFilter.join(',') ||
          state.dateFromFilter !== prev.dateFromFilter ||
          state.dateToFilter !== prev.dateToFilter ||
          state.viewMode !== prev.viewMode);

      if (!pageChanged && !libraryChanged && !assetChanged) return;

      const payload = {
        page: state.page,
        search: state.search,
        folderId: state.folderId,
        assetId: state.activeAsset?.attachmentId ?? null,
        mime: state.mimeFilter,
        flags: state.flagsFilter,
        aiStatus: state.aiStatusFilter,
        orientation: state.orientationFilter,
        authorIds: state.authorFilter,
        dateFrom: state.dateFromFilter,
        dateTo: state.dateToFilter,
        view: state.viewMode,
      };

      const next = buildHash(payload);
      if (window.location.hash !== next) {
        writeHash(payload, pageChanged ? 'push' : 'replace');
      }
    });

    return unsub;
  }, []);
}
