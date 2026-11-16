import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { forEachWithProgress } from '../../api/operationProgress';
import { toastError, toastT } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { ConfirmModal } from '../../ui/Modal';
import { useI18n } from '../../i18n';
import { flattenFolderTree, folderTree } from './folderTree';

type Props = {
  attachmentIds: number[];
  /** Prefill select (current folder membership or browse context). */
  defaultFolderId?: number | null;
  onAssigned?: (folderId: number, assigned: number) => void;
  /** Toolbar / bulk bar variant */
  variant?: 'default' | 'bulk';
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

function toSelectValue(id?: number | null): string {
  return id != null && id > 0 ? String(id) : '';
}

export function FolderAssignControl({
  attachmentIds,
  defaultFolderId = null,
  onAssigned,
  variant = 'default',
  disabled = false,
  onBusyChange,
}: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string>(variant === 'bulk' ? '' : toSelectValue(defaultFolderId));
  const [status, setStatus] = useState('');
  const [folderConfirmOpen, setFolderConfirmOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{ folderId: number; attachmentIds: number[]; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.listFolders(),
  });

  const folders = data?.items ?? [];

  // Keep select in sync when the open asset / browse folder changes.
  useEffect(() => {
    setFolderId(variant === 'bulk' ? '' : toSelectValue(defaultFolderId));
    setPendingAssignment(null);
    setFolderConfirmOpen(false);
    setStatus('');
  }, [defaultFolderId, attachmentIds.join(','), variant]);

  const assign = useMutation({
    mutationFn: async (selection?: { folderId: number; attachmentIds: number[] }) => {
      const id = selection?.folderId ?? Number(folderId);
      const ids = selection?.attachmentIds ?? [...attachmentIds];
      if (!id || !ids.length) {
        throw new Error(t('chooseFolderAndMedia'));
      }

      if (variant === 'bulk') {
        let assigned = 0;
        await forEachWithProgress(
          ids,
          {
            title: t('addingToFolder'),
            subtitle: t('assigningToFolder'),
          },
          async (attachmentId) => {
            const res = await api.assignAttachmentsToFolder(id, [attachmentId]);
            assigned += res.assigned ?? 1;
          }
        );
        return { assigned };
      }

      return api.assignAttachmentsToFolder(id, ids);
    },
    onSuccess: (res, selection) => {
      const id = selection?.folderId ?? Number(folderId);
      const count = res.assigned ?? selection?.attachmentIds.length ?? attachmentIds.length;
      if (variant === 'bulk') setFolderId('');
      const msg =
        count === 1
          ? toastT('toastAddedToFolder')
          : toastT('toastAddedToFolderMany', { count });
      setStatus(msg);
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset'] });
      onAssigned?.(id, count);
    },
    onError: (e: Error) => {
      const msg = toastError('toastFolderAssignFailed', e);
      setStatus(msg);
      toast.error(msg);
    },
  });

  useEffect(() => {
    onBusyChange?.(assign.isPending);
    return () => onBusyChange?.(false);
  }, [assign.isPending, onBusyChange]);

  if (isLoading) {
    return <p className="frkt-muted">{t('loadingFolders')}</p>;
  }

  if (!folders.length) {
    return (
      <p className={`frkt-folder-assign__empty ${variant === 'bulk' ? 'is-bulk' : ''}`}>
        {t('createFolderFirst')}
      </p>
    );
  }

  const alreadyInSelected =
    folderId !== '' &&
    defaultFolderId != null &&
    Number(folderId) === defaultFolderId;

  return (
    <div className={`frkt-folder-assign ${variant === 'bulk' ? 'frkt-folder-assign--bulk' : ''}`}>
      <select
        value={folderId}
        aria-label={t('destinationFolder')}
        disabled={disabled || assign.isPending}
        onChange={(e) => {
          setFolderId(e.target.value);
          setStatus('');
          const destination = folders.find((folder) => folder.id === Number(e.target.value));
          if (variant === 'bulk' && destination && attachmentIds.length) {
            setPendingAssignment({ folderId: destination.id, attachmentIds: [...attachmentIds], name: destination.name });
            setFolderConfirmOpen(true);
          }
        }}
      >
        <option value="">{t('chooseFolder')}</option>
        {flattenFolderTree(folderTree(folders)).map((f) => (
          <option key={f.id} value={f.id}>
            {`${'— '.repeat(f.depth)}${f.name} (${f.count})`}
          </option>
        ))}
      </select>
      {variant !== 'bulk' ? <button
        type="button"
        className="button button-primary"
        disabled={disabled || !folderId || !attachmentIds.length || assign.isPending}
        onClick={() => assign.mutate()}
      >
        {assign.isPending
          ? t('addingEllipsis')
          : alreadyInSelected
            ? t('addAgain')
            : t('addToFolder')}
      </button> : null}
      <ConfirmModal
        open={folderConfirmOpen}
        onClose={() => { setFolderConfirmOpen(false); setFolderId(''); }}
        onConfirm={() => {
          if (!pendingAssignment) return;
          const selection = pendingAssignment;
          setFolderConfirmOpen(false);
          assign.mutate(selection);
        }}
        title={t('bulkFolderConfirmTitle')}
        confirmLabel={t('confirm')}
        busy={assign.isPending}
      >
        <p className="frkt-modal__copy">{t('bulkFolderConfirmBody', { count: pendingAssignment?.attachmentIds.length ?? 0, folder: pendingAssignment?.name ?? '' })}</p>
      </ConfirmModal>
      {status ? <span className="frkt-folder-assign__status">{status}</span> : null}
    </div>
  );
}
