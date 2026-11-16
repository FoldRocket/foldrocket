import { useEffect } from 'react';
import { FolderSidebar } from '../features/folders/FolderSidebar';
import { LibraryToolbar } from '../features/library/MediaGrid';
import { MobileLayerBar, useMobileLibraryLayer } from '../features/library/MobileLayerBar';
import { isFeatureEnabled, useFeaturesMap } from '../features/features/useFeature';
import { useUiStore } from '../stores/ui';
import { ALL_SMART_VIEW_ID } from '../features/library/SmartViewsNav';
import { PickerGrid } from './PickerGrid';
import { useI18n } from '../i18n';

/** Library-parity picker for the native WP media modal. */
export function MediaModalApp({ controller }: { controller: unknown }) {
  const { t } = useI18n();
  useFeaturesMap();
  const foldersOn = isFeatureEnabled('folders');
  const smartOn = isFeatureEnabled('smart_views');
  const showSidebar = foldersOn || smartOn;
  const filtersOn = isFeatureEnabled('advanced_filters');
  const { layer, setLayer } = useMobileLibraryLayer();

  useEffect(() => {
    const prev = useUiStore.getState();
    const snap = {
      search: prev.search,
      folderId: prev.folderId,
      smartViewId: prev.smartViewId,
      mimeFilter: [...prev.mimeFilter],
      flagsFilter: [...prev.flagsFilter],
      aiStatusFilter: [...prev.aiStatusFilter],
      orientationFilter: [...prev.orientationFilter],
      authorFilter: [...prev.authorFilter],
      dateFromFilter: prev.dateFromFilter,
      dateToFilter: prev.dateToFilter,
      sortOrder: prev.sortOrder,
      selectedIds: [...prev.selectedIds],
      activeAsset: prev.activeAsset,
      inspectorOpen: prev.inspectorOpen,
      inspectorQueue: [...prev.inspectorQueue],
    };

    useUiStore.setState({
      search: '',
      folderId: null,
      smartViewId: ALL_SMART_VIEW_ID,
      mimeFilter: [],
      flagsFilter: [],
      aiStatusFilter: [],
      orientationFilter: [],
      authorFilter: [],
      dateFromFilter: '',
      dateToFilter: '',
      sortOrder: 'default:DESC',
      selectedIds: [],
      activeAsset: null,
      inspectorOpen: false,
      inspectorQueue: [],
    });

    return () => {
      useUiStore.setState(snap);
    };
  }, []);

  return (
    <div
      className={`frkt-library frkt-media-modal-picker${!showSidebar ? ' frkt-library--no-folders' : ''}${layer === 'browse' ? ' is-browse-open' : layer === 'filters' ? ' is-filters-open' : ''}`}
    >
      {layer ? (
        <button type="button" className="frkt-layer-backdrop" aria-label={t('inspectorClose')} onClick={() => setLayer(null)} />
      ) : null}
      {showSidebar ? <FolderSidebar readOnly onLayerClose={() => setLayer(null)} /> : null}
      <section className="frkt-main">
        <MobileLayerBar
          showBrowse={showSidebar}
          showFilters={filtersOn}
          browseKind={foldersOn ? 'folders' : 'smart'}
          layer={layer}
          onChange={setLayer}
        />
        <LibraryToolbar variant="picker" onFiltersClose={() => setLayer(null)} />
        <PickerGrid controller={controller as never} />
      </section>
    </div>
  );
}
