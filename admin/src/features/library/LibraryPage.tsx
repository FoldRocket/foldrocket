import { FolderSidebar } from '../folders/FolderSidebar';
import { FolderToolbar } from '../folders/FolderToolbar';
import { ChildFolderList } from '../folders/ChildFolderList';
import { LibraryToolbar, MediaGrid } from '../library/MediaGrid';
import { SmartViewToolbar } from '../library/SmartViewToolbar';
import { UploadDropZone } from '../library/UploadMedia';
import { isFeatureEnabled, useFeaturesMap } from '../features/useFeature';
import { MobileLayerBar, useMobileLibraryLayer } from './MobileLayerBar';
import { useI18n } from '../../i18n';

export function LibraryPage() {
  const { t } = useI18n();
  useFeaturesMap();
  const foldersOn = isFeatureEnabled('folders');
  const smartOn = isFeatureEnabled('smart_views');
  const filtersOn = isFeatureEnabled('advanced_filters');
  const uploadOn = isFeatureEnabled('upload');
  const showSidebar = foldersOn || smartOn;
  const { layer, setLayer } = useMobileLibraryLayer();

  const content = (
    <>
      <MobileLayerBar
        showBrowse={showSidebar}
        showFilters={filtersOn}
        browseKind={foldersOn ? 'folders' : 'smart'}
        layer={layer}
        onChange={setLayer}
      />
      {smartOn ? <SmartViewToolbar /> : null}
      {foldersOn ? <FolderToolbar /> : null}
      <LibraryToolbar onFiltersClose={() => setLayer(null)} />
      {foldersOn ? <ChildFolderList /> : null}
      <MediaGrid />
    </>
  );

  const openClass = layer === 'browse' ? ' is-browse-open' : layer === 'filters' ? ' is-filters-open' : '';

  return (
    <div className={`frkt-library${!showSidebar ? ' frkt-library--no-folders' : ''}${openClass}`}>
      {layer ? (
        <button type="button" className="frkt-layer-backdrop" aria-label={t('inspectorClose')} onClick={() => setLayer(null)} />
      ) : null}
      {showSidebar ? <FolderSidebar onLayerClose={() => setLayer(null)} /> : null}
      <section className="frkt-main">
        {uploadOn ? (
          <UploadDropZone>{content}</UploadDropZone>
        ) : (
          <div className="frkt-main__scroll">{content}</div>
        )}
      </section>
    </div>
  );
}
