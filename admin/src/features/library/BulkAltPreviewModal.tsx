import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { toastError } from '../../i18n/toastMessages';
import { useUiStore } from '../../stores/ui';
import { BulkProgressPanel } from '../../ui/BulkProgressPanel';
import { Modal } from '../../ui/Modal';
import { AssetThumb } from './AssetThumb';

type RecapRow = {
  attachmentId: number;
  filename: string;
  thumbnailUrl: string;
  mimeType: string;
  altText: string;
  status: 'applied' | 'failed' | 'skipped';
  error: string;
};

type Phase = 'confirm' | 'working' | 'recap' | 'error';

type BulkAltPreviewModalProps = {
  open: boolean;
  attachmentIds: number[];
  onClose: () => void;
  onApplied: () => void;
};

/** Confirm → generate+apply with progress → recap. */
export function BulkAltPreviewModal({
  open,
  attachmentIds,
  onClose,
  onApplied,
}: BulkAltPreviewModalProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('confirm');
  const [errorMsg, setErrorMsg] = useState('');
  const [current, setCurrent] = useState(0);
  const [rows, setRows] = useState<RecapRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const appliedNotified = useRef(false);

  const total = attachmentIds.length;

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      useUiStore.getState().clearBulkPending();
      return;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    appliedNotified.current = false;
    setPhase('confirm');
    setErrorMsg('');
    setRows([]);
    setCurrent(0);
  }, [open, attachmentIds.join(',')]);

  const run = async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    appliedNotified.current = false;

    setPhase('working');
    setErrorMsg('');
    setRows([]);
    setCurrent(0);
    useUiStore.getState().setBulkPendingIds(attachmentIds);

    const collected: RecapRow[] = [];
    let appliedAny = false;

    try {
      for (let i = 0; i < attachmentIds.length; i++) {
        if (ac.signal.aborted) return;

        const id = attachmentIds[i];
        setCurrent(i);

        let filename = `#${id}`;
        let thumbnailUrl = '';
        let mimeType = '';
        let altText = '';

        try {
          const preview = await api.bulkAltPreview([id], undefined, ac.signal);
          if (ac.signal.aborted) return;

          const item = preview.items?.[0];
          if (item) {
            filename = item.filename || filename;
            thumbnailUrl = item.thumbnailUrl || '';
            mimeType = item.mimeType || '';
            altText = (item.proposedAlt || '').trim();
          }

          if (!altText) {
            collected.push({
              attachmentId: id,
              filename,
              thumbnailUrl,
              mimeType,
              altText: '',
              status: item?.status === 'failed' ? 'failed' : 'skipped',
              error: item?.error || '',
            });
            continue;
          }

          const applyRes = await api.bulkAltApply(
            [{ attachmentId: id, proposedAlt: altText }],
            preview.locale || undefined
          );
          if (ac.signal.aborted) return;

          const ok = (applyRes.applied || []).includes(id);
          if (ok) appliedAny = true;
          collected.push({
            attachmentId: id,
            filename,
            thumbnailUrl,
            mimeType,
            altText,
            status: ok ? 'applied' : 'skipped',
            error: ok ? '' : t('bulkAltRecapSkipped'),
          });
        } catch (e) {
          if (ac.signal.aborted) return;
          const isAbort =
            e instanceof Error && (e.name === 'AbortError' || /abort/i.test(e.message));
          if (isAbort) return;

          collected.push({
            attachmentId: id,
            filename,
            thumbnailUrl,
            mimeType,
            altText,
            status: 'failed',
            error: e instanceof Error ? e.message : t('bulkAltFailed'),
          });
        } finally {
          if (!ac.signal.aborted) {
            useUiStore.getState().removeBulkPendingId(id);
            setCurrent(i + 1);
          }
        }
      }

      if (ac.signal.aborted) return;

      setRows(collected);
      if (collected.length === 0) {
        setErrorMsg(t('toastBulkAltPreviewFailed'));
        setPhase('error');
        return;
      }

      setPhase('recap');
      if (appliedAny && !appliedNotified.current) {
        appliedNotified.current = true;
        onApplied();
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      setErrorMsg(toastError('toastBulkAltPreviewFailed', e));
      if (collected.length > 0) {
        setRows(collected);
        setPhase('recap');
        if (appliedAny && !appliedNotified.current) {
          appliedNotified.current = true;
          onApplied();
        }
      } else {
        setPhase('error');
      }
    } finally {
      useUiStore.getState().clearBulkPending();
      if (abortRef.current === ac) abortRef.current = null;
    }
  };

  const handleClose = () => {
    if (phase === 'working') {
      abortRef.current?.abort();
    }
    onClose();
  };

  const applied = rows.filter((r) => r.status === 'applied').length;
  const failed = rows.filter((r) => r.status === 'failed').length;
  const skipped = rows.filter((r) => r.status === 'skipped').length;
  const wide = phase === 'recap';

  const title =
    phase === 'confirm'
      ? t('bulkAltConfirmTitle')
      : phase === 'working'
        ? t('bulkAltGeneratingTitle')
        : phase === 'recap'
          ? t('bulkAltRecapTitle')
          : t('bulkAltConfirmTitle');

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      className={wide ? 'frkt-modal__card--wide' : 'frkt-modal__card--confirm'}
    >
      {phase === 'confirm' ? (
        <>
          <div className="frkt-modal__body">
            <p className="frkt-modal__copy">{t('bulkAltConfirmBody', { count: total })}</p>
            <p className="frkt-muted frkt-bulk-alt__hint">{t('bulkAltConfirmNote')}</p>
          </div>
          <div className="frkt-modal__actions">
            <button type="button" className="button" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="button" className="button button-primary" onClick={() => void run()}>
              {t('bulkAltConfirmAction', { count: total })}
            </button>
          </div>
        </>
      ) : null}

      {phase === 'working' ? (
        <BulkProgressPanel
          subtitle={t('bulkAltGenerating')}
          current={current}
          total={total}
          footer={
            <div className="frkt-modal__actions">
              <button type="button" className="button" onClick={handleClose}>
                {t('cancel')}
              </button>
            </div>
          }
        />
      ) : null}

      {phase === 'error' ? (
        <div className="frkt-bulk-alt__state">
          <p>{errorMsg}</p>
          <div className="frkt-modal__actions">
            <button type="button" className="button" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="button" className="button button-primary" onClick={() => void run()}>
              {t('bulkAltRetry')}
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'recap' ? (
        <>
          <p className="frkt-bulk-alt__summary">
            {t('bulkAltRecapSummary', { applied, failed, skipped })}
          </p>
          <div className="frkt-bulk-alt__table-wrap">
            <table className="frkt-bulk-alt__table">
              <thead>
                <tr>
                  <th scope="col">{t('bulkAltColFile')}</th>
                  <th scope="col">{t('bulkAltColResult')}</th>
                  <th scope="col">{t('bulkAltColAlt')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.attachmentId} className={row.status !== 'applied' ? 'is-failed' : ''}>
                    <td>
                      <div className="frkt-bulk-alt__file">
                        <span className="frkt-bulk-alt__thumb" aria-hidden="true">
                          <AssetThumb
                            asset={{
                              attachmentId: row.attachmentId,
                              filename: row.filename,
                              mimeType: row.mimeType,
                              thumbnailUrl: row.thumbnailUrl,
                              url: row.thumbnailUrl,
                            }}
                          />
                        </span>
                        <span title={row.filename}>{row.filename}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`frkt-bulk-alt__badge is-${row.status}`}>
                        {row.status === 'applied'
                          ? t('bulkAltStatusApplied')
                          : row.status === 'failed'
                            ? t('bulkAltStatusFailed')
                            : t('bulkAltStatusSkipped')}
                      </span>
                      {row.error ? <p className="frkt-bulk-alt__err">{row.error}</p> : null}
                    </td>
                    <td>
                      <span className="frkt-bulk-alt__alt">
                        {row.altText || <em className="frkt-muted">{t('bulkAltEmpty')}</em>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="frkt-modal__actions">
            <button type="button" className="button button-primary" onClick={onClose}>
              {t('bulkAltRecapDone')}
            </button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
