import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';

/** Keep in sync with `.frkt-modal` / `.frkt-modal__card` transition duration. */
const EXIT_MS = 200;
const modalStack: symbol[] = [];
let previousBodyOverflow = '';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Animated modal with enter / exit transitions.
 * Stays mounted briefly after `open` becomes false so the exit transition can play.
 */
export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  const titleId = useId();
  const [rendered, setRendered] = useState(false);
  /** Drives `.is-open` — never mount already "closing". */
  const [active, setActive] = useState(false);
  const closingTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const modalToken = useRef(Symbol('frkt-modal'));

  useEffect(() => {
    if (closingTimer.current !== null) {
      window.clearTimeout(closingTimer.current);
      closingTimer.current = null;
    }

    if (open) {
      setRendered(true);
      setActive(false);
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(raf);
    }

    setActive(false);
    closingTimer.current = window.setTimeout(() => {
      setRendered(false);
      closingTimer.current = null;
    }, EXIT_MS);

    return () => {
      if (closingTimer.current !== null) {
        window.clearTimeout(closingTimer.current);
        closingTimer.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!rendered || !active) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const token = modalToken.current;
    modalStack.push(token);
    if (modalStack.length === 1) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    const focusables = () => Array.from(cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    window.requestAnimationFrame(() => (focusables()[0] ?? cardRef.current)?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        cardRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === cardRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const index = modalStack.lastIndexOf(token);
      if (index >= 0) modalStack.splice(index, 1);
      if (modalStack.length === 0) document.body.style.overflow = previousBodyOverflow;
      const trigger = restoreFocusRef.current;
      window.requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, [rendered, active, onClose]);

  if (!rendered) return null;

  const root = document.getElementById('frkt-admin-root') || document.body;

  return createPortal(
    <div
      className={`frkt-modal${active ? ' is-open' : ''}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && active) onClose();
      }}
    >
      <div
        ref={cardRef}
        className={`frkt-modal__card ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h3 id={titleId}>{title}</h3>
        {children}
      </div>
    </div>,
    root
  );
}

type PromptModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  initialValue?: string;
};

export function PromptModal({
  open,
  onClose,
  onSubmit,
  title,
  label,
  placeholder,
  confirmLabel,
  cancelLabel,
  busy = false,
  initialValue = '',
}: PromptModalProps) {
  const { t } = useI18n();
  const labelText = label ?? t('smartViewName');
  const confirmText = confirmLabel ?? t('create');
  const cancelText = cancelLabel ?? t('cancel');
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    const t = window.setTimeout(() => inputRef.current?.select(), 50);
    return () => window.clearTimeout(t);
  }, [open, initialValue]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const next = value.trim();
    if (!next || busy) return;
    onSubmit(next);
  };

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={title} className="frkt-modal__card--prompt">
      <form className="frkt-modal__form" onSubmit={submit}>
        <label className="frkt-field">
          <span>{labelText}</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            placeholder={placeholder}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="frkt-modal__actions">
          <button type="button" className="button" disabled={busy} onClick={onClose}>
            {cancelText}
          </button>
          <button type="submit" className="button button-primary" disabled={busy || !value.trim()}>
            {busy ? '…' : confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
}

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  confirmDisabled?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel,
  cancelLabel,
  busy = false,
  danger = false,
  confirmDisabled = false,
}: ConfirmModalProps) {
  const { t } = useI18n();
  const confirmText = confirmLabel ?? t('confirm');
  const cancelText = cancelLabel ?? t('cancel');
  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={title} className="frkt-modal__card--confirm">
      <div className="frkt-modal__body">{children}</div>
      <div className="frkt-modal__actions">
        <button type="button" className="button" disabled={busy} onClick={onClose}>
          {cancelText}
        </button>
        <button
          type="button"
          className={`button ${danger ? 'frkt-btn-danger' : 'button-primary'}`}
          disabled={busy || confirmDisabled}
          onClick={onConfirm}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
