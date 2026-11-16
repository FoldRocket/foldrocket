import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { ALL_SMART_VIEW_ID } from './SmartViewsNav';

export type MobileLayer = 'browse' | 'filters' | null;

export function useMobileLibraryLayer() {
  const [layer, setLayer] = useState<MobileLayer>(null);
  const folderId = useUiStore((s) => s.folderId);
  const smartViewId = useUiStore((s) => s.smartViewId);
  const previous = useRef({ folderId, smartViewId });

  useEffect(() => {
    if (previous.current.folderId === folderId && previous.current.smartViewId === smartViewId) return;
    previous.current = { folderId, smartViewId };
    setLayer((current) => (current === 'browse' ? null : current));
  }, [folderId, smartViewId]);

  useEffect(() => {
    if (!layer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLayer(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layer]);

  return { layer, setLayer };
}

export function MobileLayerBar({
  showBrowse,
  showFilters,
  browseKind,
  layer,
  onChange,
}: {
  showBrowse: boolean;
  showFilters: boolean;
  browseKind: 'folders' | 'smart';
  layer: MobileLayer;
  onChange: (layer: MobileLayer) => void;
}) {
  const { t } = useI18n();
  const folderId = useUiStore((s) => s.folderId);
  const smartViewId = useUiStore((s) => s.smartViewId);
  const mimeFilter = useUiStore((s) => s.mimeFilter);
  const flagsFilter = useUiStore((s) => s.flagsFilter);
  const aiStatusFilter = useUiStore((s) => s.aiStatusFilter);
  const orientationFilter = useUiStore((s) => s.orientationFilter);
  const authorFilter = useUiStore((s) => s.authorFilter);
  const dateFromFilter = useUiStore((s) => s.dateFromFilter);
  const dateToFilter = useUiStore((s) => s.dateToFilter);

  if (!showBrowse && !showFilters) return null;

  const browseOn = folderId != null || (smartViewId != null && smartViewId > ALL_SMART_VIEW_ID);
  const filterCount =
    mimeFilter.length +
    flagsFilter.length +
    aiStatusFilter.length +
    orientationFilter.length +
    authorFilter.length +
    (dateFromFilter ? 1 : 0) +
    (dateToFilter ? 1 : 0);

  return (
    <div className="frkt-mobile-layers">
      {showBrowse ? (
        <button
          type="button"
          className={`button${layer === 'browse' || browseOn ? ' is-active' : ''}`}
          aria-expanded={layer === 'browse'}
          onClick={() => onChange(layer === 'browse' ? null : 'browse')}
        >
          {browseKind === 'folders' ? t('foldersNav') : t('smartViews')}
        </button>
      ) : null}
      {showFilters ? (
        <button
          type="button"
          className={`button${layer === 'filters' || filterCount > 0 ? ' is-active' : ''}`}
          aria-expanded={layer === 'filters'}
          onClick={() => onChange(layer === 'filters' ? null : 'filters')}
        >
          {t('filtersLabel')}
          {filterCount > 0 ? <span className="frkt-count">{filterCount}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
