import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Folder as FolderIcon } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { iconPropsSm } from '../../ui/icons';

export function ChildFolderList() {
  const { t } = useI18n();
  const folderId = useUiStore((state) => state.folderId);
  const setFolderId = useUiStore((state) => state.setFolderId);
  const folders = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
    enabled: folderId != null,
  });

  if (folderId == null) return null;

  if (folders.isLoading) {
    return (
      <section className="frkt-child-folders" aria-busy="true" aria-label={t('loadingFolders')}>
        <div className="frkt-child-folders__grid">
          {Array.from({ length: 3 }, (_, index) => (
            <span className="frkt-child-folder frkt-child-folder--loading" aria-hidden="true" key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (folders.isError) {
    return (
      <section className="frkt-child-folders frkt-child-folders--error">
        <span>{window.FRKT_BOOT.i18n.error}</span>
        <button type="button" className="button button-small" onClick={() => folders.refetch()}>
          {t('retry')}
        </button>
      </section>
    );
  }

  const children = (folders.data?.items ?? [])
    .filter((folder) => folder.parentId === folderId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  if (!children.length) return null;

  return (
    <section className="frkt-child-folders" aria-labelledby="frkt-child-folders-title">
      <div className="frkt-child-folders__head">
        <h2 id="frkt-child-folders-title">{t('foldersHeading')}</h2>
      </div>
      <div className="frkt-child-folders__grid">
        {children.map((folder) => (
          <button
            type="button"
            className="frkt-child-folder"
            key={folder.id}
            title={folder.name}
            onClick={() => setFolderId(folder.id)}
          >
            <FolderIcon
              {...iconPropsSm}
              className="frkt-child-folder__icon"
              style={folder.color ? { color: folder.color } : undefined}
            />
            <span className="frkt-child-folder__name">{folder.name}</span>
            <span className="frkt-count">{folder.count}</span>
            <ChevronRight {...iconPropsSm} className="frkt-child-folder__arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
