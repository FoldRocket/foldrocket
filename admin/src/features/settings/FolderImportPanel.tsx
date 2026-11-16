import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';
import { toast } from '../../ui/toast';
import { toastError } from '../../i18n/toastMessages';
import { useFeatureEnabled } from '../features/useFeature';

type ImportPreview = { available: boolean; folders: number; files: number };
type ImportBatch = { nextOffset: number; done: boolean };

function ImportSource({
  title,
  enabled,
  preview,
  missingKey,
  actionKey,
  doneKey,
  onImport,
}: {
  title: string;
  enabled: boolean;
  preview: { isLoading: boolean; isError: boolean; data?: ImportPreview };
  missingKey: MessageKey;
  actionKey: MessageKey;
  doneKey: MessageKey;
  onImport: (offset: number) => Promise<ImportBatch>;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const run = async () => {
    setBusy(true);
    setDone(false);
    try {
      let offset = 0;
      for (let step = 0; step < 500; step += 1) {
        const result = await onImport(offset);
        if (result.done) break;
        offset = result.nextOffset;
      }
      setDone(true);
      await qc.invalidateQueries({ queryKey: ['folders'] });
      toast.success(t(doneKey));
    } catch (error) {
      toastError('toastGenericError', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="frkt-settings-tool">
      <div>
        <strong>{title}</strong>
        {!enabled ? <p className="frkt-muted">{t('importHappyFilesDisabled')}</p> : null}
        {enabled && preview.isLoading ? <p className="frkt-muted">{t('loading')}</p> : null}
        {enabled && preview.isError ? <p className="frkt-muted">{t('toastGenericError')}</p> : null}
        {enabled && preview.data && !preview.data.available ? (
          <p className="frkt-muted">{t(missingKey)}</p>
        ) : null}
        {enabled && preview.data?.available ? (
          <p className="frkt-muted">
            {t('importHappyFilesSummary', {
              folders: preview.data.folders,
              files: preview.data.files,
            })}
          </p>
        ) : null}
        {done ? <p className="frkt-muted">{t(doneKey)}</p> : null}
      </div>
      <button
        type="button"
        className="button button-primary"
        aria-label={`${busy ? t('importHappyFilesWorking') : t(actionKey)} — ${title}`}
        onClick={() => void run()}
        disabled={!enabled || busy || !preview.data?.available}
      >
        {busy ? t('importHappyFilesWorking') : t(actionKey)}
      </button>
    </div>
  );
}

export function FolderImportPanel() {
  const { t } = useI18n();
  const enabled = useFeatureEnabled('folder_import') && useFeatureEnabled('folders');
  const happy = useQuery({
    queryKey: ['folder-import', 'happyfiles'],
    queryFn: () => api.happyFilesImport(),
    enabled,
  });
  const wpMediaFolder = useQuery({
    queryKey: ['folder-import', 'wp-media-folder'],
    queryFn: () => api.wpMediaFolderImport(),
    enabled,
  });
  const fileBird = useQuery({
    queryKey: ['folder-import', 'filebird'],
    queryFn: () => api.fileBirdImport(),
    enabled,
  });
  const realMedia = useQuery({
    queryKey: ['folder-import', 'real-media-library'],
    queryFn: () => api.realMediaImport(),
    enabled,
  });

  return (
    <div className="frkt-settings-panel">
      <p className="frkt-settings-panel__desc frkt-muted">{t('importFoldersLead')}</p>
      <div className="frkt-settings-panel__body">
        <div className="frkt-settings-tools">
          <ImportSource
            title="HappyFiles"
            enabled={enabled}
            preview={happy}
            missingKey="importHappyFilesMissing"
            actionKey="importHappyFilesAction"
            doneKey="importHappyFilesDone"
            onImport={(offset) => api.importHappyFiles(offset)}
          />
          <ImportSource
            title="WP Media Folder"
            enabled={enabled}
            preview={wpMediaFolder}
            missingKey="importWpMediaFolderMissing"
            actionKey="importWpMediaFolderAction"
            doneKey="importWpMediaFolderDone"
            onImport={(offset) => api.importWpMediaFolder(offset)}
          />
          <ImportSource
            title="FileBird"
            enabled={enabled}
            preview={fileBird}
            missingKey="importFileBirdMissing"
            actionKey="importFileBirdAction"
            doneKey="importFileBirdDone"
            onImport={(offset) => api.importFileBird(offset)}
          />
          <ImportSource
            title="Real Media Library"
            enabled={enabled}
            preview={realMedia}
            missingKey="importRealMediaMissing"
            actionKey="importRealMediaAction"
            doneKey="importRealMediaDone"
            onImport={(offset) => api.importRealMedia(offset)}
          />
        </div>
      </div>
    </div>
  );
}
