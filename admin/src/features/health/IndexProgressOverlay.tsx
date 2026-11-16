import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { BulkProgressPanel } from '../../ui/BulkProgressPanel';

/** Progress UI scoped to FoldRocket, leaving the surrounding WordPress UI usable. */
export function IndexProgressOverlay() {
  const { t } = useI18n();
  const progress = useUiStore((s) => s.indexProgress);
  const current = progress ? Math.min(progress.current, progress.total) : 0;
  const title = progress?.title || t('indexingTitle');
  const subtitle =
    progress?.subtitle ||
    (progress?.title ? t('indexWaitFinish') : t('indexWaitAll'));
  const open = Boolean(progress && progress.total > 0);
  const root = document.querySelector<HTMLElement>('#frkt-admin-root .frkt-shell');

  if (!open || !progress || !root) return null;

  return createPortal(
    <div className="frkt-index-overlay" role="dialog" aria-busy="true" aria-label={title}>
      <div className="frkt-index-overlay__card">
        <strong>{title}</strong>
        <BulkProgressPanel
          subtitle={subtitle}
          current={current}
          total={progress.total}
          footer={
            progress.onCancel ? (
              <button
                type="button"
                className="button"
                disabled={progress.cancelRequested}
                onClick={progress.onCancel}
              >
                {t('cancel')}
              </button>
            ) : null
          }
        />
      </div>
    </div>,
    root
  );
}
