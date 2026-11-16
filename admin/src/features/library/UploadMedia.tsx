import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { api } from '../../api/client';
import { kickJobPump } from '../../api/jobPump';
import { useUiStore } from '../../stores/ui';
import { useI18n } from '../../i18n';
import { toastError, toastT } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { Modal } from '../../ui/Modal';
import type { MediaAsset } from '../../types';
import { iconPropsMd } from '../../ui/icons';
import { isFeatureEnabled } from '../features/useFeature';

type UploadProgress = {
  total: number;
  done: number;
  current?: string;
  errors: string[];
};

type UploadOptions = {
  analyze: boolean;
  aiRename: boolean;
};

function defaultOptions(): UploadOptions {
  return { analyze: false, aiRename: false };
}

async function uploadFiles(
  files: File[],
  folderId: number | null,
  options: UploadOptions,
  onProgress: (p: UploadProgress) => void
): Promise<{ assets: MediaAsset[]; errors: string[] }> {
  const assets: MediaAsset[] = [];
  const errors: string[] = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress({ total, done: i, current: file.name, errors: [...errors] });
    try {
      const res = await api.uploadAsset(file, folderId, {
        analyze: options.analyze,
        aiRename: options.aiRename,
      });
      if (!res?.asset?.attachmentId) {
        throw new Error(toastT('uploadNoAsset'));
      }
      assets.push(res.asset);
    } catch (e) {
      errors.push(`${file.name}: ${(e as Error).message || toastT('uploadItemFailed')}`);
    }
  }

  onProgress({ total, done: total, current: undefined, errors: [...errors] });
  // Uploads queue index (and optionally analyze) jobs — start them right away.
  if (assets.length > 0) kickJobPump();
  return { assets, errors };
}

function invalidateAfterUpload(qc: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['assets'] }),
    qc.invalidateQueries({ queryKey: ['folders'] }),
    qc.invalidateQueries({ queryKey: ['collections'] }),
    qc.invalidateQueries({ queryKey: ['collection-assets'] }),
    qc.invalidateQueries({ queryKey: ['unused'] }),
    qc.invalidateQueries({ queryKey: ['duplicates'] }),
    qc.invalidateQueries({ queryKey: ['health'] }),
    qc.invalidateQueries({ queryKey: ['jobs'] }),
  ]);
}

function normalizeFiles(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter((f) => f && typeof f.name === 'string' && f.size >= 0);
}

type UploadLimit = { max: number; used: number; remaining: number };

function readUploadLimit(): UploadLimit | null {
  const raw = window.FRKT_BOOT?.uploadLimit;
  if (!raw || typeof raw !== 'object') return null;
  const max = Math.max(0, Number(raw.max) || 0);
  if (max < 1) return null;
  const used = Math.max(0, Number(raw.used) || 0);
  const remaining = Math.max(0, Number(raw.remaining ?? max - used));
  return { max, used, remaining };
}

function bumpUploadLimit(by: number): UploadLimit | null {
  if (by < 1 || !window.FRKT_BOOT?.uploadLimit) return readUploadLimit();
  const prev = readUploadLimit();
  if (!prev) return null;
  const used = Math.min(prev.max, prev.used + by);
  const next = { max: prev.max, used, remaining: Math.max(0, prev.max - used) };
  window.FRKT_BOOT.uploadLimit = next;
  return next;
}

function applyUploadCap(files: File[]): { files: File[]; truncated: boolean; limit: UploadLimit | null } {
  const limit = readUploadLimit();
  if (!limit) return { files, truncated: false, limit: null };
  if (limit.remaining < 1) return { files: [], truncated: files.length > 0, limit };
  if (files.length <= limit.remaining) return { files, truncated: false, limit };
  return { files: files.slice(0, limit.remaining), truncated: true, limit };
}

function useUploadRunner() {
  const { t } = useI18n();
  const folderId = useUiStore((s) => s.folderId);
  const setActiveAsset = useUiStore((s) => s.setActiveAsset);
  const setPage = useUiStore((s) => s.setPage);
  const qc = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const busy = Boolean(progress && progress.done < progress.total);
  const running = useRef(false);
  const loadingId = useRef<string>('');

  const run = async (list: FileList | File[] | null | undefined, options: UploadOptions) => {
    if (running.current) return;

    const capped = applyUploadCap(normalizeFiles(list).filter((f) => f.size > 0));
    const files = capped.files;
    if (!files.length) {
      const limit = capped.limit;
      if (limit) {
        toast.error(
          t('demoUploadReached', { max: limit.max })
        );
      }
      return;
    }

    running.current = true;
    if (loadingId.current) toast.dismiss(loadingId.current);
    loadingId.current = toast.loading(
      toastT('toastUploading', { current: 1, total: files.length })
    );
    setProgress({ total: files.length, done: 0, current: files[0]?.name, errors: [] });

    try {
      const { assets, errors } = await uploadFiles(files, folderId, options, (p) => {
        setProgress(p);
        if (p.done < p.total && loadingId.current) {
          toast.dismiss(loadingId.current);
          loadingId.current = toast.loading(
            toastT('toastUploading', { current: p.done + 1, total: p.total })
          );
        }
      });

      if (assets.length) bumpUploadLimit(assets.length);

      if (loadingId.current) {
        toast.dismiss(loadingId.current);
        loadingId.current = '';
      }

      if (assets.length) {
        const last = assets[assets.length - 1];
        // Seed detail cache before opening inspector so keepPreviousData cannot
        // briefly (or permanently via sync effects) show the previously open file.
        for (const a of assets) {
          if (a.attachmentId) qc.setQueryData(['asset', a.attachmentId], a);
        }
        setPage('library');
        setActiveAsset(last);
        void invalidateAfterUpload(qc);
        if (errors.length) {
          toast.info(
            toastT('toastUploadPartial', { ok: assets.length, failed: errors.length })
          );
        } else {
          toast.success(toastT('toastUploadOk', { count: assets.length }));
        }
      } else if (errors.length) {
        void invalidateAfterUpload(qc);
        toast.error(errors[0] || toastT('toastUploadFailed'));
      } else {
        toast.error(toastT('toastUploadFailed'));
      }
      setProgress(errors.length ? { total: files.length, done: files.length, errors } : null);
    } catch (e) {
      if (loadingId.current) {
        toast.dismiss(loadingId.current);
        loadingId.current = '';
      }
      toast.error(toastError('toastUploadFailed', e));
      setProgress(null);
    } finally {
      running.current = false;
    }
  };

  return { run, progress, busy };
}

function UploadIcon() {
  return <Upload {...iconPropsMd} className="frkt-btn-upload__icon" />;
}

function UploadOptionsModal({
  open,
  onClose,
  busy,
  initialFiles,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  initialFiles?: File[];
  onConfirm: (files: File[], options: UploadOptions) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<UploadOptions>(defaultOptions);
  const [limit, setLimit] = useState<UploadLimit | null>(() => readUploadLimit());
  const canAnalyze = isFeatureEnabled('ai_analysis');
  const canAiRename = isFeatureEnabled('ai_rename_on_upload');

  useEffect(() => {
    if (!open) return;
    setLimit(readUploadLimit());
    const capped = applyUploadCap(initialFiles?.length ? [...initialFiles] : []);
    setFiles(capped.files);
    setOptions(defaultOptions());
    // Reset form only when the modal opens (not when file list identity changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

  const pickFiles = () => {
    if (busy || (limit && limit.remaining < 1)) return;
    const el = inputRef.current;
    if (!el) return;
    el.value = '';
    el.click();
  };

  const setPickedFiles = (picked: File[]) => {
    const capped = applyUploadCap(picked);
    setLimit(capped.limit);
    setFiles(capped.files);
  };

  const canStart = files.length > 0 && !busy && (!limit || limit.remaining > 0);
  const limitNote = limit
    ? limit.remaining < 1
      ? t('demoUploadReached', { max: limit.max })
      : t('demoUploadRemaining', { max: limit.max, remaining: limit.remaining })
    : null;

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={t('uploadMedia')}
      className="frkt-modal__card--upload"
    >
      <div className="frkt-modal__body frkt-upload-modal">
        <input
          ref={inputRef}
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          className="frkt-upload__input frkt-upload__input--sr"
          accept="image/*,video/*,audio/*,.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          disabled={busy || Boolean(limit && limit.remaining < 1)}
          onChange={(e) => {
            const picked = normalizeFiles(e.target.files).filter((f) => f.size > 0);
            e.target.value = '';
            if (picked.length) setPickedFiles(picked);
          }}
        />

        {limitNote ? <p className="frkt-upload-modal__limit">{limitNote}</p> : null}

        <div className="frkt-upload-modal__pick">
          <button
            type="button"
            className="button"
            disabled={busy || Boolean(limit && limit.remaining < 1)}
            onClick={pickFiles}
          >
            {files.length ? t('changeFiles') : t('chooseFiles')}
          </button>
          <p className="frkt-upload-modal__file-status">
            {files.length === 0
              ? t('noFilesSelected')
              : files.length === 1
                ? files[0].name
                : t('filesSelected', { count: files.length })}
          </p>
        </div>

        {canAnalyze || canAiRename ? (
          <fieldset className="frkt-upload-modal__options" disabled={busy}>
            <legend className="frkt-upload-modal__legend">{t('afterUpload')}</legend>
            {canAnalyze ? (
              <label className="frkt-upload-modal__option">
                <span className="frkt-check__box">
                  <input
                    type="checkbox"
                    checked={options.analyze}
                    disabled={busy}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, analyze: e.target.checked }))
                    }
                  />
                  <span className="frkt-check__mark" aria-hidden="true" />
                </span>
                <span className="frkt-upload-modal__option-text">
                  <span className="frkt-upload-modal__option-title">
                    {t('analyze')}
                  </span>
                  <span className="frkt-upload-modal__option-desc">
                    {t('analyzeUploadDesc')}
                  </span>
                </span>
              </label>
            ) : null}
            {canAiRename ? (
              <label className="frkt-upload-modal__option">
                <span className="frkt-check__box">
                  <input
                    type="checkbox"
                    checked={options.aiRename}
                    disabled={busy}
                    onChange={(e) =>
                      setOptions((prev) => ({ ...prev, aiRename: e.target.checked }))
                    }
                  />
                  <span className="frkt-check__mark" aria-hidden="true" />
                </span>
                <span className="frkt-upload-modal__option-text">
                  <span className="frkt-upload-modal__option-title">
                    {t('renameFileWithAi')}
                  </span>
                  <span className="frkt-upload-modal__option-desc">
                    {t('renameFileWithAiDesc')}
                  </span>
                </span>
              </label>
            ) : null}
          </fieldset>
        ) : null}
      </div>

      <div className="frkt-modal__actions">
        <button type="button" className="button" disabled={busy} onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="button button-primary"
          disabled={!canStart}
          onClick={() => onConfirm(files, options)}
        >
          {busy ? t('uploading') : files.length ? t('uploadWithCount', { count: files.length }) : t('upload')}
        </button>
      </div>
    </Modal>
  );
}

export function UploadButton({
  className = 'button button-primary',
  showIcon = false,
}: {
  className?: string;
  showIcon?: boolean;
}) {
  const { t } = useI18n();
  const { run, progress, busy } = useUploadRunner();
  const [open, setOpen] = useState(false);
  const isTopbar = className.includes('frkt-btn-upload');

  const label = busy
    ? `${t('uploading')} ${(progress?.done ?? 0) + 1}/${progress?.total ?? 1}`
    : t('upload');

  return (
    <div className={`frkt-upload ${busy ? 'is-busy' : ''}`} {...(isTopbar ? { 'data-frkt-tour': 'upload' } : {})}>
      <button
        type="button"
        className={`${className}${busy ? ' is-disabled' : ''}`}
        disabled={busy}
        onClick={() => !busy && setOpen(true)}
      >
        {(isTopbar || showIcon) && !busy ? <UploadIcon /> : null}
        <span className="frkt-btn-label">{label}</span>
      </button>

      <UploadOptionsModal
        open={open}
        busy={busy}
        onClose={() => setOpen(false)}
        onConfirm={(files, options) => {
          setOpen(false);
          void run(files, options);
        }}
      />
    </div>
  );
}

export function UploadDropZone({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { run, busy } = useUploadRunner();
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<File[]>([]);
  const dragDepth = useRef(0);

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (busy) return;
    const limit = readUploadLimit();
    if (limit && limit.remaining < 1) {
      toast.error(
        t('demoUploadReached', { max: limit.max })
      );
      return;
    }
    const dropped = normalizeFiles(e.dataTransfer.files).filter((f) => f.size > 0);
    if (!dropped.length) return;
    const capped = applyUploadCap(dropped);
    setPending(capped.files);
    setOpen(true);
  };

  return (
    <div
      className={`frkt-dropzone ${dragging ? 'is-dragging' : ''} ${busy ? 'is-busy' : ''}`}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
      {dragging ? (
        <div className="frkt-dropzone__overlay" aria-hidden="true">
          <strong>{t('dropFiles')}</strong>
        </div>
      ) : null}

      <UploadOptionsModal
        open={open}
        busy={busy}
        initialFiles={pending}
        onClose={() => {
          setOpen(false);
          setPending([]);
        }}
        onConfirm={(files, options) => {
          setOpen(false);
          setPending([]);
          void run(files, options);
        }}
      />
    </div>
  );
}
