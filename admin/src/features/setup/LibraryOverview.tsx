import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';
import { toastError } from '../../i18n/toastMessages';
import { useUiStore } from '../../stores/ui';
import { toast } from '../../ui/toast';

type Step = {
  id: string;
  title: MessageKey;
  body: MessageKey;
  target: string | null;
};

const STEPS: Step[] = [
  {
    id: 'intro',
    title: 'overviewIntroTitle',
    body: 'overviewIntroBody',
    target: null,
  },
  {
    id: 'folders',
    title: 'overviewFoldersTitle',
    body: 'overviewFoldersBody',
    target: 'folders',
  },
  {
    id: 'filters',
    title: 'overviewFiltersTitle',
    body: 'overviewFiltersBody',
    target: 'filters',
  },
  {
    id: 'upload',
    title: 'overviewUploadTitle',
    body: 'overviewUploadBody',
    target: 'upload',
  },
  {
    id: 'grid',
    title: 'overviewGridTitle',
    body: 'overviewGridBody',
    target: 'grid',
  },
  {
    id: 'media',
    title: 'overviewMediaTitle',
    body: 'overviewMediaBody',
    target: 'inspector',
  },
  {
    id: 'settings',
    title: 'overviewSettingsTitle',
    body: 'overviewSettingsBody',
    target: 'settings',
  },
];

function isPending(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

type Box = { top: number; left: number; width: number; height: number };

function floorY(vw: number, vh: number, margin: number): number {
  if (vw > 782) return vh - margin;
  const nav = document.querySelector<HTMLElement>('.frkt-sidenav');
  const navH = nav ? nav.getBoundingClientRect().height : 0;
  return vh - Math.max(margin, navH + 8);
}

function ceilingY(margin: number): number {
  const chrome = document.querySelector<HTMLElement>('.frkt-demo-chrome');
  const chromeBottom = chrome ? chrome.getBoundingClientRect().bottom : 0;
  let barBottom = 0;
  if (window.innerWidth <= 782) {
    const bar = document.getElementById('wpadminbar');
    if (bar && getComputedStyle(bar).display !== 'none' && getComputedStyle(bar).position === 'fixed') {
      barBottom = bar.getBoundingClientRect().bottom;
    }
  }
  return Math.max(margin, chromeBottom, barBottom) + (chromeBottom > 0 || barBottom > 0 ? 8 : 0);
}

function revealTarget(el: HTMLElement, narrow: boolean, floor: number) {
  el.scrollIntoView({ block: 'nearest', inline: narrow ? 'center' : 'nearest' });
  const scroller = el.closest<HTMLElement>('.frkt-inspector__scroll');
  if (!scroller) return;
  const top = el.getBoundingClientRect().top;
  const scrollerTop = scroller.getBoundingClientRect().top;
  if (top < scrollerTop + 8 || top > floor - 48) {
    scroller.scrollTop += top - scrollerTop - 8;
  }
}

function measure(target: string | null, card: HTMLElement | null, scroll: boolean): { spot: Box | null; card: Box } {
  const margin = 12;
  const gap = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = card?.offsetWidth || Math.min(340, vw - margin * 2);
  const cardH = card?.offsetHeight || 180;
  const el = target ? document.querySelector<HTMLElement>(`[data-frkt-tour="${target}"]`) : null;
  const narrow = vw <= 782;
  const floor = floorY(vw, vh, margin);
  const ceil = ceilingY(margin);

  if (el && scroll) {
    revealTarget(el, narrow, floor);
  }

  const placeCard = (preferred: number) => {
    let top = preferred;
    if (top < ceil) top = ceil;
    if (top + cardH > floor) top = Math.max(ceil, floor - cardH);
    return top;
  };

  if (!el) {
    return {
      spot: null,
      card: {
        top: placeCard((vh - cardH) / 2),
        left: Math.max(margin, (vw - cardW) / 2),
        width: cardW,
        height: cardH,
      },
    };
  }

  const rect = el.getBoundingClientRect();
  const pad = 4;
  const roomy = target === 'inspector';
  const maxH = narrow && !roomy ? Math.min(220, Math.round(vh * 0.42)) : floor - ceil;
  const spotTop = Math.max(ceil, rect.top - pad);
  const spotLeft = Math.max(margin, rect.left - pad);
  const spotRight = Math.min(vw - margin, rect.right + pad);
  const spotBottom = Math.min(floor, rect.bottom + pad, spotTop + maxH);
  const spot: Box = {
    top: spotTop,
    left: spotLeft,
    width: Math.max(32, spotRight - spotLeft),
    height: Math.max(32, spotBottom - spotTop),
  };

  const below = spot.top + spot.height + gap;
  const above = spot.top - gap - cardH;
  const preferred = below + cardH <= floor ? below : above >= ceil ? above : floor - cardH;
  const top = placeCard(preferred);
  let left = narrow ? margin : spot.left;
  if (left + cardW > vw - margin) left = vw - cardW - margin;
  if (left < margin) left = margin;

  return { spot, card: { top, left, width: cardW, height: cardH } };
}

export function LibraryOverview() {
  const { t } = useI18n();
  const indexProgress = useUiStore((s) => s.indexProgress);
  const inspectorOpen = useUiStore((s) => s.inspectorOpen);
  const setPage = useUiStore((s) => s.setPage);
  const [open, setOpen] = useState(() => isPending(window.FRKT_BOOT?.overviewPending));
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [spot, setSpot] = useState<Box | null>(null);
  const [cardBox, setCardBox] = useState<Box | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const step = STEPS[stepIndex];
  const last = stepIndex === STEPS.length - 1;
  const waiting = Boolean(indexProgress && indexProgress.total > 0);

  const place = useCallback(
    (scroll: boolean) => {
      const next = measure(step.target, cardRef.current, scroll);
      setSpot(next.spot);
      setCardBox(next.card);
    },
    [step.target]
  );

  useEffect(() => {
    if (!open || waiting) return;
    setPage('library');
  }, [open, waiting, setPage, step.id]);

  useEffect(() => {
    if (!open || waiting || step.id !== 'media') {
      if (useUiStore.getState().inspectorOpen) {
        useUiStore.getState().setInspectorOpen(false);
      }
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.listAssets({ page: 1, per_page: 1 });
        if (cancelled) return;
        const asset = res.items?.[0];
        if (asset) useUiStore.getState().setActiveAsset(asset, res.items);
      } catch {
        // The step still explains the panel when no file can be opened.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, waiting, step.id]);

  useLayoutEffect(() => {
    if (!open || waiting) return;
    place(true);
    const frame = window.requestAnimationFrame(() => place(false));
    const settled = window.setTimeout(() => place(false), 320);
    nextRef.current?.focus();
    const onMove = () => place(false);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settled);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, waiting, place, stepIndex, inspectorOpen]);

  const finish = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.saveSettings({ settings: { setup: { overview: 'done' } } });
      if (window.FRKT_BOOT) window.FRKT_BOOT.overviewPending = false;
      setOpen(false);
    } catch (e) {
      toast.error(toastError('toastGenericError', e as Error));
      setBusy(false);
    }
  }, [busy]);

  if (!open || waiting) return null;

  return (
    <div
      className={`frkt-tour${step.id === 'media' ? ' is-media' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="frkt-tour-title"
    >
      {spot ? (
        <div
          className="frkt-tour__spot"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : (
        <div className="frkt-tour__shade" />
      )}
      <div className="frkt-tour__catch" />
      <div
        ref={cardRef}
        className="frkt-tour__card"
        style={
          cardBox
            ? { top: cardBox.top, left: cardBox.left }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <p className="frkt-tour__progress">
          {t('overviewProgress', { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <h2 id="frkt-tour-title">{t(step.title)}</h2>
        <p>{t(step.body)}</p>
        <div className="frkt-tour__actions">
          <button type="button" className="frkt-tour__skip" onClick={() => void finish()} disabled={busy}>
            {t('overviewSkip')}
          </button>
          <div className="frkt-tour__nav">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="button"
                onClick={() => setStepIndex((n) => Math.max(0, n - 1))}
                disabled={busy}
              >
                {t('overviewBack')}
              </button>
            ) : null}
            <button
              ref={nextRef}
              type="button"
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                if (last) {
                  void finish();
                  return;
                }
                setStepIndex((n) => Math.min(STEPS.length - 1, n + 1));
              }}
            >
              {last ? t('overviewDone') : t('overviewNext')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
