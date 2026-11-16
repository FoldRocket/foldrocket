import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { toastError } from '../../i18n/toastMessages';
import { PromptModal } from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { iconProps } from '../../ui/icons';
import { useUiStore } from '../../stores/ui';
import {
  resolveLargeFileMb,
  storedFiltersHaveCriteria,
  storedFiltersToUi,
  uiFiltersToStored,
} from './smartViewFilters';

type CollectionItem = {
  id: number;
  name: string;
  filters: Record<string, unknown>;
  isSmart: boolean;
  count?: number;
};

/** Built-in, non-deletable “All” smart view (not stored in DB). */
export const ALL_SMART_VIEW_ID = 0;

function emptyLibraryFilters() {
  return {
    mimeFilter: [] as string[],
    flagsFilter: [] as string[],
    aiStatusFilter: [] as string[],
    orientationFilter: [] as string[],
    authorFilter: [] as string[],
    dateFromFilter: '',
    dateToFilter: '',
    search: '',
    folderId: null as number | null,
  };
}

/** Sidebar smart views list — create via Save; edit/delete live in SmartViewToolbar. */
export function SmartViewsNav({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const smartViewId = useUiStore((s) => s.smartViewId);
  const mimeFilter = useUiStore((s) => s.mimeFilter);
  const flagsFilter = useUiStore((s) => s.flagsFilter);
  const aiStatusFilter = useUiStore((s) => s.aiStatusFilter);
  const orientationFilter = useUiStore((s) => s.orientationFilter);
  const authorFilter = useUiStore((s) => s.authorFilter);
  const dateFromFilter = useUiStore((s) => s.dateFromFilter);
  const dateToFilter = useUiStore((s) => s.dateToFilter);
  const search = useUiStore((s) => s.search);
  const folderId = useUiStore((s) => s.folderId);
  const applySmartViewState = useUiStore((s) => s.applySmartViewState);

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });

  const largeMb = resolveLargeFileMb(
    (settings.data?.settings as { general?: { large_file_mb?: number } } | undefined)?.general
      ?.large_file_mb
  );

  const collections = useQuery({
    queryKey: ['collections'],
    queryFn: () => api.listCollections(),
  });

  const allMedia = useQuery({
    queryKey: ['assets', 'total'],
    queryFn: () => api.listAssets({ page: 1, per_page: 1 }),
  });

  const currentStored = uiFiltersToStored({
    mimeFilter,
    flagsFilter,
    aiStatusFilter,
    orientationFilter,
    authorFilter,
    dateFromFilter,
    dateToFilter,
    search,
    folderId,
    largeMb,
  });
  const canSaveCurrent = storedFiltersHaveCriteria(currentStored);
  const isAllActive =
    smartViewId === ALL_SMART_VIEW_ID || (smartViewId === null && !canSaveCurrent);

  const applyAll = () => {
    applySmartViewState({
      smartViewId: ALL_SMART_VIEW_ID,
      ...emptyLibraryFilters(),
    });
  };

  const applyView = (item: CollectionItem) => {
    if (smartViewId === item.id) {
      applyAll();
      return;
    }
    const ui = storedFiltersToUi(item.filters || {}, largeMb);
    applySmartViewState({
      smartViewId: item.id,
      ...ui,
    });
  };

  const createMut = useMutation({
    mutationFn: (name: string) => api.createCollection(name, currentStored),
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      setCreateOpen(false);
      toast.success(t('toastSmartViewCreated'));
      applyView(item);
    },
    onError: (e: Error) => toast.error(toastError('toastSmartViewCreateFailed', e)),
  });

  const items = collections.data?.items ?? [];
  const allCount = allMedia.data?.total ?? null;

  return (
    <div className="frkt-sidebar__section frkt-smart-views">
      <div className="frkt-sidebar__head frkt-sidebar__head--label">
        <h2>{t('smartViews')}</h2>
        {!readOnly ? (
          <button
            type="button"
            className="button button-small"
            disabled={!canSaveCurrent || createMut.isPending}
            title={canSaveCurrent ? t('smartViewSaveCurrent') : t('smartViewSaveNeedFilters')}
            onClick={() => setCreateOpen(true)}
          >
            <Plus {...iconProps} size={14} />
            <span>{t('smartViewSave')}</span>
          </button>
        ) : null}
      </div>

      <nav className="frkt-subnav" aria-label={t('smartViews')}>
        {collections.isLoading ? <p className="frkt-muted">{t('loading')}</p> : null}

        <ul className="frkt-folder-list">
          <li className={`frkt-smart-view frkt-smart-view--all${isAllActive ? ' is-active' : ''}`}>
            <button
              type="button"
              className={`frkt-folder ${isAllActive ? 'is-active' : ''}`}
              onClick={applyAll}
              aria-pressed={isAllActive}
            >
              <span className="frkt-folder__name">{t('smartViewAll')}</span>
              {allCount != null ? <span className="frkt-count">{allCount}</span> : null}
            </button>
          </li>

          {items.map((item) => {
            const active = smartViewId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`frkt-folder ${active ? 'is-active' : ''}`}
                  title={item.name}
                  onClick={() => applyView(item)}
                  aria-pressed={active}
                >
                  <span className="frkt-folder__name">{item.name}</span>
                  {item.count != null ? <span className="frkt-count">{item.count}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>

        {!collections.isLoading && !items.length ? (
          <p className="frkt-muted">{t('smartViewsEmpty')}</p>
        ) : null}
      </nav>

      {!readOnly ? (
        <PromptModal
          open={createOpen}
          onClose={() => !createMut.isPending && setCreateOpen(false)}
          onSubmit={(name) => createMut.mutate(name)}
          title={t('smartViewSaveTitle')}
          label={t('smartViewName')}
          placeholder={t('smartViewNamePlaceholder')}
          confirmLabel={t('smartViewSave')}
          busy={createMut.isPending}
        />
      ) : null}
    </div>
  );
}
