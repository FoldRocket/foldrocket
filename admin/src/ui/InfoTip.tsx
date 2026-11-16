import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { iconPropsSm } from './icons';

export function InfoTip({ text }: { text: string }) {
  const tipId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, above: false });

  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const pad = 10;
    const gap = 8;
    const maxWidth = Math.min(280, window.innerWidth - pad * 2);
    const estimatedHeight = bubbleRef.current?.offsetHeight || 96;
    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const spaceAbove = rect.top - pad;
    const above = spaceBelow < estimatedHeight + gap && spaceAbove > spaceBelow;

    let left = rect.left + rect.width / 2;
    const half = maxWidth / 2;
    left = Math.min(Math.max(left, pad + half), window.innerWidth - pad - half);

    setCoords({ top: above ? rect.top - gap : rect.bottom + gap, left, above });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, text, place]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => place();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, place]);

  if (!text.trim()) return null;

  const root = document.getElementById('frkt-admin-root') || document.body;

  return (
    <span className="frkt-info-tip">
      <button
        ref={btnRef}
        type="button"
        className="frkt-info-tip__btn"
        aria-label={text}
        aria-describedby={open ? tipId : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <Info {...iconPropsSm} />
      </button>
      {open
        ? createPortal(
            <span
              ref={bubbleRef}
              id={tipId}
              role="tooltip"
              className={`frkt-info-tip__bubble is-open ${coords.above ? 'is-above' : ''}`}
              style={{ top: coords.top, left: coords.left }}
            >
              {text}
            </span>,
            root
          )
        : null}
    </span>
  );
}
