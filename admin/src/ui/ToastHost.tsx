import { AlertCircle, CheckCircle2, Info, LoaderCircle, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useToastStore, type ToastKind } from './toast';
import { iconProps, iconPropsSm } from './icons';

function Icon({ kind }: { kind: ToastKind }) {
  if (kind === 'success') {
    return <CheckCircle2 {...iconProps} />;
  }
  if (kind === 'error') {
    return <AlertCircle {...iconProps} />;
  }
  if (kind === 'loading') {
    return <LoaderCircle {...iconProps} className="frkt-toast__spin" />;
  }
  return <Info {...iconProps} />;
}

export function ToastHost() {
  const { t } = useI18n();
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!items.length) return null;

  return (
    <div className="frkt-toast-host" aria-live="polite" aria-relevant="additions text">
      {items.map((item) => (
        <div
          key={item.id}
          className={`frkt-toast frkt-toast--${item.kind}`}
          role={item.kind === 'error' ? 'alert' : 'status'}
        >
          <span className="frkt-toast__icon">
            <Icon kind={item.kind} />
          </span>
          <p className="frkt-toast__msg">{item.message}</p>
          {item.kind !== 'loading' ? (
            <button
              type="button"
              className="frkt-toast__close"
              aria-label={t('dismiss')}
              title={t('dismiss')}
              onClick={() => dismiss(item.id)}
            >
              <X {...iconPropsSm} size={14} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
