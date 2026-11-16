import { useQuery } from '@tanstack/react-query';
import { Folder, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { folderTree, type FolderNode } from '../features/folders/folderTree';
import { isFeatureEnabled } from '../features/features/useFeature';
import { useI18n } from '../i18n';
import { iconPropsSm } from '../ui/icons';

type CollectionItem = { id: number; name: string; count?: number };

export type NativeMediaFolderSidebarProps = {
  activeFolderId?: number | null;
  activeSmartViewId?: number | null;
  onSelectFolder: (folderId: number | null) => void;
  onSelectSmartView: (smartViewId: number | null) => void;
};

function inkOn(hex: string): string {
  const raw = hex.replace('#', '');
  const value = Number.parseInt(raw, 16);
  if (!Number.isFinite(value) || raw.length !== 6) return '#1a1a1a';
  const channel = (shift: number) => {
    const unit = ((value >> shift) & 255) / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  return luminance > 0.45 ? '#1a1a1a' : '#fff';
}

export function NativeMediaFolderSidebar({
  activeFolderId = null,
  activeSmartViewId = null,
  onSelectFolder,
  onSelectSmartView,
}: NativeMediaFolderSidebarProps) {
  const { t } = useI18n();
  const foldersOn = isFeatureEnabled('folders');
  const smartOn = isFeatureEnabled('smart_views');
  const [folderId, setFolderId] = useState<number | null>(activeFolderId);
  const [smartViewId, setSmartViewId] = useState<number | null>(activeSmartViewId);

  const folders = useQuery({ queryKey: ['folders'], queryFn: () => api.listFolders(), enabled: foldersOn });
  const collections = useQuery({
    queryKey: ['collections'],
    queryFn: () => api.listCollections(),
    enabled: smartOn,
  });
  const allMedia = useQuery({
    queryKey: ['assets', 'total'],
    queryFn: () => api.listAssets({ page: 1, per_page: 1 }),
  });

  useEffect(() => setFolderId(activeFolderId), [activeFolderId]);
  useEffect(() => setSmartViewId(activeSmartViewId), [activeSmartViewId]);

  const selectFolder = (next: number | null) => {
    setFolderId(next);
    setSmartViewId(null);
    onSelectFolder(next);
  };
  const selectSmartView = (next: number | null) => {
    setSmartViewId(next);
    setFolderId(null);
    onSelectSmartView(next);
  };

  const allActive = folderId === null && smartViewId === null;
  const allCount = allMedia.data?.total ?? null;
  const smartItems = (collections.data?.items ?? []) as CollectionItem[];

  return (
    <aside className="frkt-sidebar frkt-native-sidebar">
      {smartOn ? (
        <div className="frkt-sidebar__section frkt-smart-views">
          <div className="frkt-sidebar__head frkt-sidebar__head--label">
            <h2>{t('smartViews')}</h2>
          </div>
          <nav className="frkt-subnav" aria-label={t('smartViews')}>
            {collections.isLoading ? <p className="frkt-muted">{t('loading')}</p> : null}
            {collections.isError ? <NativeError onRetry={() => collections.refetch()} /> : null}
            <ul className="frkt-folder-list">
              <li className={`frkt-smart-view frkt-smart-view--all${allActive ? ' is-active' : ''}`}>
                <button
                  type="button"
                  className={`frkt-folder${allActive ? ' is-active' : ''}`}
                  onClick={() => selectSmartView(null)}
                  aria-pressed={allActive}
                >
                  <span className="frkt-folder__name">{t('smartViewAll')}</span>
                  {allCount != null ? <span className="frkt-count">{allCount}</span> : null}
                </button>
              </li>
              {smartItems.map((item) => {
                const active = smartViewId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`frkt-folder${active ? ' is-active' : ''}`}
                      title={item.name}
                      onClick={() => selectSmartView(item.id)}
                      aria-pressed={active}
                    >
                      <span className="frkt-folder__name">{item.name}</span>
                      {item.count != null ? <span className="frkt-count">{item.count}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {!collections.isLoading && !collections.isError && !smartItems.length ? (
              <p className="frkt-muted">{t('smartViewsEmpty')}</p>
            ) : null}
          </nav>
        </div>
      ) : null}

      {foldersOn ? (
        <div className="frkt-sidebar__section frkt-native-folders-section">
          <div className="frkt-sidebar__head frkt-sidebar__head--label">
            <h2>{t('foldersNav')}</h2>
          </div>
          <nav className="frkt-subnav" aria-label={t('foldersNav')}>
            <button
              type="button"
              className={`frkt-folder${allActive ? ' is-active' : ''}`}
              onClick={() => selectFolder(null)}
            >
              <span className="frkt-folder__name">{t('allMedia')}</span>
              {allCount != null ? <span className="frkt-count">{allCount}</span> : null}
            </button>
            {folders.isLoading ? <p className="frkt-muted">{t('loadingFolders')}</p> : null}
            {folders.isError ? <NativeError onRetry={() => folders.refetch()} /> : null}
            {!folders.isLoading && !folders.isError && !folders.data?.items.length ? (
              <p className="frkt-muted">{t('noFoldersYet')}</p>
            ) : null}
            <ul className="frkt-folder-list">
              {folderTree(folders.data?.items ?? []).map((node) => (
                <NativeFolderBranch key={node.id} node={node} activeId={folderId} onSelect={selectFolder} />
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </aside>
  );
}

function NativeError({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="frkt-native-sidebar__error">
      <p>{t('error')}</p>
      <button type="button" className="button button-small" onClick={onRetry}>{t('retry')}</button>
    </div>
  );
}

function NativeFolderBranch({
  node,
  activeId,
  onSelect,
}: {
  node: FolderNode;
  activeId: number | null;
  onSelect: (folderId: number) => void;
}) {
  const selected = activeId === node.id;
  return (
    <li className="frkt-folder-item">
      <div className="frkt-folder-row" style={{ ['--frkt-folder-depth' as string]: node.depth }}>
        <button
          type="button"
          className={`frkt-folder${selected ? ' is-active' : ''}`}
          title={node.name}
          onClick={() => onSelect(node.id)}
          aria-current={selected ? 'page' : undefined}
        >
          <span className="frkt-folder__label">
            {selected ? <FolderOpen {...iconPropsSm} /> : <Folder {...iconPropsSm} />}
            <span
              className={`frkt-folder__name${node.color ? ' is-colored' : ''}`}
              style={node.color ? { background: node.color, color: inkOn(node.color) } : undefined}
            >
              {node.name}
            </span>
          </span>
          <span className="frkt-count">{node.count}</span>
        </button>
      </div>
      {node.children.length ? (
        <ul className="frkt-folder-list">
          {node.children.map((child) => (
            <NativeFolderBranch key={child.id} node={child} activeId={activeId} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
