import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { toastError } from '../../i18n/toastMessages';
import { ConfirmModal } from '../../ui/Modal';
import { toast } from '../../ui/toast';
import { useUiStore } from '../../stores/ui';
import { ALL_SMART_VIEW_ID } from './SmartViewsNav';
import {
  resolveLargeFileMb,
  storedFiltersHaveCriteria,
  uiFiltersToStored,
} from './smartViewFilters';
import { DownloadZipButton } from './DownloadZipButton';

/**
 * Smart view title + rename / update-filters / delete in the main library pane
 * (same pattern as FolderToolbar). Hidden for the built-in “All” view.
 */
export function SmartViewToolbar() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const smartViewId = useUiStore((s) => s.smartViewId);
  const applySmartViewState = useUiStore((s) => s.applySmartViewState);
  const mimeFilter = useUiStore((s) => s.mimeFilter);
  const flagsFilter = useUiStore((s) => s.flagsFilter);
  const aiStatusFilter = useUiStore((s) => s.aiStatusFilter);
  const orientationFilter = useUiStore((s) => s.orientationFilter);
  const authorFilter = useUiStore((s) => s.authorFilter);
  const dateFromFilter = useUiStore((s) => s.dateFromFilter);
  const dateToFilter = useUiStore((s) => s.dateToFilter);
  const search = useUiStore((s) => s.search);
  const folderId = useUiStore((s) => s.folderId);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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

  const view =
    smartViewId && smartViewId > ALL_SMART_VIEW_ID
      ? collections.data?.items?.find((c) => c.id === smartViewId) ?? null
      : null;

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
  const canUpdateFilters = storedFiltersHaveCriteria(currentStored);

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setConfirmUpdate(false);
    setError('');
    setDraftName(view?.name ?? '');
  }, [smartViewId, view?.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const applyAll = () => {
    applySmartViewState({
      smartViewId: ALL_SMART_VIEW_ID,
      mimeFilter: [],
      flagsFilter: [],
      aiStatusFilter: [],
      orientationFilter: [],
      authorFilter: [],
      dateFromFilter: '',
      dateToFilter: '',
      search: '',
      folderId: null,
    });
  };

  const renameMut = useMutation({
    mutationFn: (name: string) => api.updateCollection(smartViewId!, { name }),
    onSuccess: () => {
      setEditing(false);
      setError('');
      toast.success(t('toastSmartViewRenamed'));
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (e: Error) => {
      const msg = toastError('toastSmartViewRenameFailed', e);
      setError(msg);
      toast.error(msg);
    },
  });

  const updateFiltersMut = useMutation({
    mutationFn: () => api.updateCollection(smartViewId!, { filters: currentStored }),
    onSuccess: () => {
      setConfirmUpdate(false);
      toast.success(t('toastSmartViewUpdated'));
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (e: Error) => {
      toast.error(toastError('toastSmartViewUpdateFailed', e));
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteCollection(smartViewId!),
    onSuccess: () => {
      setConfirmDelete(false);
      toast.success(t('toastSmartViewDeleted'));
      qc.invalidateQueries({ queryKey: ['collections'] });
      applyAll();
    },
    onError: (e: Error) => {
      toast.error(toastError('toastSmartViewDeleteFailed', e));
    },
  });

  if (!view) return null;

  const busy = renameMut.isPending || updateFiltersMut.isPending || deleteMut.isPending;

  const commitRename = () => {
    const name = draftName.trim();
    if (!name) {
      setError(t('smartViewName'));
      return;
    }
    if (name === view.name) {
      setEditing(false);
      return;
    }
    renameMut.mutate(name);
  };

  return (
    <div className="frkt-folder-toolbar frkt-smart-view-toolbar">
      <div className="frkt-folder-toolbar__main">
        {editing ? (
          <form
            className="frkt-folder-toolbar__rename"
            onSubmit={(e) => {
              e.preventDefault();
              commitRename();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draftName}
              disabled={busy}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditing(false);
                  setDraftName(view.name);
                  setError('');
                }
              }}
              aria-label={t('smartViewName')}
            />
            <button type="submit" className="button button-small" disabled={busy}>
              {renameMut.isPending ? t('saving') : t('save')}
            </button>
            <button
              type="button"
              className="button button-small"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setDraftName(view.name);
                setError('');
              }}
            >
              {t('cancel')}
            </button>
          </form>
        ) : (
          <>
            <div className="frkt-folder-toolbar__title">
              <h2 title={view.name}>{view.name}</h2>
              {view.count != null ? <span className="frkt-count">{view.count}</span> : null}
            </div>
            <div className="frkt-folder-toolbar__actions">
              <DownloadZipButton name={view.name} />
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => {
                  setConfirmDelete(false);
                  setConfirmUpdate(false);
                  setEditing(true);
                  setDraftName(view.name);
                  setError('');
                }}
              >
                {t('smartViewRename')}
              </button>
              <button
                type="button"
                className="button"
                disabled={busy || !canUpdateFilters}
                title={
                  canUpdateFilters ? t('smartViewUpdateFilters') : t('smartViewSaveNeedFilters')
                }
                onClick={() => {
                  setEditing(false);
                  setConfirmDelete(false);
                  setConfirmUpdate(true);
                }}
              >
                {t('smartViewUpdateFilters')}
              </button>
              <button
                type="button"
                className="button frkt-btn-danger"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setConfirmUpdate(false);
                  setConfirmDelete(true);
                  setError('');
                }}
              >
                {t('smartViewDelete')}
              </button>
            </div>
          </>
        )}
      </div>

      {error ? <p className="frkt-folder-error">{error}</p> : null}

      <ConfirmModal
        open={confirmUpdate}
        onClose={() => !updateFiltersMut.isPending && setConfirmUpdate(false)}
        onConfirm={() => updateFiltersMut.mutate()}
        title={t('smartViewUpdateTitle')}
        confirmLabel={t('smartViewUpdateFilters')}
        busy={updateFiltersMut.isPending}
      >
        <p>{t('smartViewUpdateBody').replace('{name}', view.name)}</p>
      </ConfirmModal>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => !deleteMut.isPending && setConfirmDelete(false)}
        onConfirm={() => deleteMut.mutate()}
        title={t('smartViewDelete')}
        confirmLabel={deleteMut.isPending ? t('saving') : t('smartViewDelete')}
        busy={deleteMut.isPending}
        danger
      >
        <p>{t('smartViewDeleteBody').replace('{name}', view.name)}</p>
      </ConfirmModal>
    </div>
  );
}
