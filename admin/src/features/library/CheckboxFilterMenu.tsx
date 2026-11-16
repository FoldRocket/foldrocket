import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';

export type CheckboxFilterOption = {
  id: string;
  label: string;
};

type Props = {
  buttonLabel: string;
  ariaLabel: string;
  options: readonly CheckboxFilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  emptyLabel?: string;
  /** `grid` keeps the custom menu on small screens. Otherwise a native select. */
  mobileOptions?: 'native' | 'grid';
};

export function CheckboxFilterMenu({
  buttonLabel,
  ariaLabel,
  options,
  selected,
  onToggle,
  onClear,
  emptyLabel = buttonLabel,
  mobileOptions = 'native',
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const hasSelection = selected.length > 0;
  const narrow = useMaxWidth(782);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => optionRefs.current[0]?.focus());
  }, [open]);

  const moveFocus = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === 'ArrowDown') next = Math.min(options.length - 1, index + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    } else return;
    event.preventDefault();
    optionRefs.current[next]?.focus();
  };

  if (narrow && mobileOptions === 'native') {
    return (
      <select
        className={`frkt-filter-menu__native ${hasSelection ? 'is-active' : ''}`}
        aria-label={ariaLabel}
        value=""
        onChange={(e) => {
          const id = e.target.value;
          if (id) onToggle(id);
        }}
      >
        <option value="">{hasSelection ? buttonLabel : emptyLabel}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {selected.includes(opt.id) ? `✓ ${opt.label}` : opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      className={`frkt-filter-menu ${open ? 'is-open' : ''}`}
      ref={rootRef}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`frkt-filter-menu__trigger ${hasSelection ? 'is-active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="frkt-filter-menu__label">{hasSelection ? buttonLabel : emptyLabel}</span>
        <span className="frkt-filter-menu__caret" aria-hidden="true" />
      </button>

      {open ? (
        <div className="frkt-filter-menu__panel" role="group" aria-label={ariaLabel}>
          <div className="frkt-filter-menu__scroll">
            <ul className="frkt-filter-menu__list">
              {options.map((opt, index) => {
                const checked = selected.includes(opt.id);
                return (
                  <li key={opt.id}>
                    <label className={`frkt-check frkt-filter-menu__option ${checked ? 'is-checked' : ''}`}>
                      <span className="frkt-check__box">
                        <input
                          ref={(node) => { optionRefs.current[index] = node; }}
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggle(opt.id)}
                          onKeyDown={(event) => moveFocus(event, index)}
                        />
                        <span className="frkt-check__mark" aria-hidden="true" />
                      </span>
                      <span>{opt.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          {hasSelection ? (
            <div className="frkt-filter-menu__footer">
              <button type="button" className="button-link" onClick={onClear}>
                {t('clear')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function useMaxWidth(maxPx: number): boolean {
  const query = `(max-width: ${maxPx}px)`;
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
