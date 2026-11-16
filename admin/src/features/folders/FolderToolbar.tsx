import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useUiStore } from '../../stores/ui';
import { ConfirmModal, PromptModal } from '../../ui/Modal';
import { useI18n } from '../../i18n';
import { toastError, toastT } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { DownloadZipButton } from '../library/DownloadZipButton';
import { FolderColorButton } from './FolderColorButton';

/**
 * Folder title + rename/delete controls shown in the main library pane
 * when a virtual folder is selected.
 */
export function FolderToolbar() {
  const folderId = useUiStore((s) => s.folderId);
  const setFolderId = useUiStore((s) => s.setFolderId);
  const detachFolderFromActiveAsset = useUiStore((s) => s.detachFolderFromActiveAsset);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { t } = useI18n();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
  });

  const folder = data?.items?.find((f) => f.id === folderId) ?? null;
  const memberCount = folder?.count ?? 0;
  const childCount = (data?.items ?? []).filter((item) => item.parentId === folderId).length;

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setError('');
    setDraftName(folder?.name ?? '');
    if (folderId) {
      setNotice('');
    }
  }, [folderId, folder?.name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createFolder(name, folderId),
    onSuccess: (created) => {
      setCreateOpen(false);
      toast.success(toastT('toastFolderCreated'));
      qc.invalidateQueries({ queryKey: ['folders'] });
      if (created?.id) setFolderId(created.id);
    },
    onError: (e: Error) => toast.error(toastError('toastFolderCreateFailed', e)),
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => api.updateFolder(folderId!, { name }),
    onSuccess: () => {
      setEditing(false);
      setError('');
      toast.success(toastT('toastFolderRenamed'));
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset'] });
    },
    onError: (e: Error) => {
      const msg = toastError('toastFolderRenameFailed', e);
      setError(msg);
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteFolder(folderId!),
    onSuccess: (res) => {
      const deletedId = folderId!;
      const detached = res.detached ?? memberCount;
      setConfirmDelete(false);
      detachFolderFromActiveAsset(deletedId);
      setFolderId(null);
      toast.success(
        detached > 0
          ? toastT('toastFolderDeletedWithMedia', { count: detached })
          : toastT('toastFolderDeleted')
      );
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset'] });
    },
    onError: (e: Error) => {
      const msg = toastError('toastFolderDeleteFailed', e);
      setError(msg);
      toast.error(msg);
    },
  });

  if (!folderId) {
    if (!notice) return null;
    return (
      <div className="frkt-folder-toolbar frkt-folder-toolbar--notice">
        <p className="frkt-notice">{notice}</p>
        <button type="button" className="button-link" onClick={() => setNotice('')}>
          {t('dismiss')}
        </button>
      </div>
    );
  }

  if (!folder) return null;

  const busy = renameMutation.isPending || deleteMutation.isPending || createMutation.isPending;

  const commitRename = () => {
    const name = draftName.trim();
    if (!name) {
      setError(t('folderNameRequired'));
      return;
    }
    if (name === folder.name) {
      setEditing(false);
      return;
    }
    renameMutation.mutate(name);
  };

  return (
    <div className="frkt-folder-toolbar">
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
                  setDraftName(folder.name);
                  setError('');
                }
              }}
              aria-label={t('folderName')}
            />
            <button type="submit" className="button button-small" disabled={busy}>
              {renameMutation.isPending ? t('saving') : t('save')}
            </button>
            <button
              type="button"
              className="button button-small"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setDraftName(folder.name);
                setError('');
              }}
            >
              {t('cancel')}
            </button>
          </form>
        ) : (
          <>
            <div className="frkt-folder-toolbar__title">
              <h2 title={folder.name}>{folder.name}</h2>
              <span className="frkt-count">{folder.count}</span>
            </div>
            <div className="frkt-folder-toolbar__actions">
              <DownloadZipButton name={folder.name} />
              <FolderColorButton folderId={folder.id} color={folder.color || ''} />
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
                  setConfirmDelete(false);
                  setCreateOpen(true);
                  setError('');
                }}
              >
                {t('newSubfolder')}
              </button>
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => {
                  setConfirmDelete(false);
                  setCreateOpen(false);
                  setEditing(true);
                  setDraftName(folder.name);
                  setError('');
                }}
              >
                {t('smartViewRename')}
              </button>
              <button
                type="button"
                className="button frkt-btn-danger"
                disabled={busy}
                onClick={() => {
                  setEditing(false);
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
        open={confirmDelete}
        onClose={() => !deleteMutation.isPending && setConfirmDelete(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={t('deleteFolderTitle', { name: folder.name })}
        confirmLabel={
          deleteMutation.isPending
            ? t('deleting')
            : memberCount > 0
              ? t('deleteUnlinkCount', { count: memberCount })
              : t('deleteFolder')
        }
        cancelLabel={t('cancel')}
        busy={deleteMutation.isPending}
        danger
      >
        <p className="frkt-modal__copy">
          {memberCount > 0 ? t('folderUnlinkBody', { count: memberCount }) : t('folderEmpty')}{' '}
          {t('folderFilesStay')}
          {childCount > 0 ? ` ${t('folderChildrenMove', { count: childCount })}` : ''}
        </p>
      </ConfirmModal>

      <PromptModal
        open={createOpen}
        onClose={() => !createMutation.isPending && setCreateOpen(false)}
        onSubmit={(name) => createMutation.mutate(name)}
        title={t('newSubfolderTitle', { name: folder.name })}
        label={t('folderName')}
        placeholder={t('folderNamePlaceholder')}
        confirmLabel={t('newSubfolder')}
        busy={createMutation.isPending}
      />
    </div>
  );
}
