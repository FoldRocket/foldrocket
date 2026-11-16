import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { toastError } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { useFeatureEnabled } from '../features/useFeature';
import { DEFAULT_FOLDER_COLOR_PALETTE, normalizeFolderColorPalette } from './palette';

function hexToHsv(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  return [(hue + 360) % 360, max ? delta / max : 0, max];
}

function hsvToHex(hue: number, saturation: number, value: number): string {
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - chroma;
  const [r, g, b] = hue < 60 ? [chroma, x, 0]
    : hue < 120 ? [x, chroma, 0]
      : hue < 180 ? [0, chroma, x]
        : hue < 240 ? [0, x, chroma]
          : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${[r, g, b].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function FolderColorButton({ folderId, color }: { folderId: number; color: string }) {
  const { t } = useI18n();
  const enabled = useFeatureEnabled('folder_colors');
  const qc = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(color || '#3b82f6');
  const [hue, setHue] = useState(217);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const mutation = useMutation({
    mutationFn: (next: string) => api.updateFolder(folderId, { color: next }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folders'] });
      setOpen(false);
    },
    onError: (error: Error) => toast.error(toastError('toastChangesSaveFailed', error)),
  });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const button = buttonRef.current;
      const pop = popRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = pop?.offsetWidth ?? 260;
      const height = pop?.offsetHeight ?? 240;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const below = rect.bottom + 6;
      const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
      setBox({ top, left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!enabled) return null;

  const current = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#3b82f6';
  const palette = normalizeFolderColorPalette(
    (settingsQuery.data?.settings as { general?: { folder_color_palette?: unknown } } | undefined)
      ?.general?.folder_color_palette ?? DEFAULT_FOLDER_COLOR_PALETTE
  );
  const themeRoot = document.getElementById('frkt-admin-root') || document.getElementById('frkt-media-modal-root');
  const dark = themeRoot?.getAttribute('data-theme') === 'dark';

  return (
    <div className="frkt-folder-color" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="button"
        aria-expanded={open}
        aria-controls={labelId}
        disabled={mutation.isPending}
        onClick={() => {
          setDraft(current);
        setHue(hexToHsv(current)[0]);
          setOpen((value) => !value);
        }}
      >
        <span
          className={`frkt-folder-color__swatch ${color ? 'is-set' : ''}`}
          style={color ? { background: color } : undefined}
          aria-hidden="true"
        />
        {t('folderColor')}
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              className={`frkt-folder-color__pop${dark ? ' is-dark' : ''}`}
              id={labelId}
              role="dialog"
              aria-label={t('folderColor')}
              style={box ? { top: box.top, left: box.left } : { top: -9999, left: 0 }}
            >
              <div className="frkt-folder-color__heading">
                <span>{t('folderColor')}</span>
                <span className="frkt-folder-color__preview" style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(draft) ? draft : current }} aria-hidden="true" />
              </div>
              <div
                className="frkt-folder-color__spectrum"
                role="slider"
                tabIndex={0}
                aria-label={t('folderColor')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hexToHsv(draft)[1] * 100)}
                aria-valuetext={draft}
                style={{ backgroundColor: `hsl(${hue} 100% 50%)` }}
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDraft(hsvToHex(hue, Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height))));
                }}
                onPointerMove={(event) => {
                  if (!event.buttons) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  setDraft(hsvToHex(hue, Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height))));
                }}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
                  event.preventDefault();
                  const [currentHue, saturation, value] = hexToHsv(draft);
                  const step = event.shiftKey ? 0.1 : 0.02;
                  const nextSaturation = Math.max(0, Math.min(1, saturation + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0)));
                  const nextValue = Math.max(0, Math.min(1, value + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0)));
                  setDraft(hsvToHex(currentHue, nextSaturation, nextValue));
                }}
              >
                <span className="frkt-folder-color__spectrum-marker" style={{ left: `${hexToHsv(draft)[1] * 100}%`, top: `${(1 - hexToHsv(draft)[2]) * 100}%` }} />
              </div>
              <input
                className="frkt-folder-color__hue"
                type="range"
                min="0"
                max="359"
                value={hue}
                aria-label={`${t('folderColor')} hue`}
                onChange={(event) => {
                  const nextHue = Number(event.target.value);
                  const [, saturation, value] = hexToHsv(draft);
                  setHue(nextHue);
                  setDraft(hsvToHex(nextHue, saturation, value));
                }}
              />
              <div className="frkt-folder-color__palette" role="group" aria-label={t('folderColor')}>
                {palette.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`frkt-folder-color__choice${draft.toLowerCase() === swatch ? ' is-selected' : ''}`}
                    style={{ backgroundColor: swatch }}
                    aria-label={swatch}
                    aria-pressed={draft.toLowerCase() === swatch}
                    onClick={() => setDraft(swatch)}
                  />
                ))}
              </div>
              <div className="frkt-folder-color__custom">
                <label htmlFor={`${labelId}-hex`}>HEX</label>
                <input
                  id={`${labelId}-hex`}
                  className="frkt-folder-color__hex"
                  value={draft}
                  maxLength={7}
                  spellCheck={false}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    if (/^#?[0-9a-fA-F]{0,6}$/.test(value)) {
                      const next = value.startsWith('#') ? value : `#${value}`;
                      setDraft(next);
                      if (/^#[0-9a-fA-F]{6}$/.test(next)) setHue(hexToHsv(next)[0]);
                    }
                  }}
                  aria-label="HEX"
                />
              </div>
              <div className="frkt-folder-color__actions">
              {color ? (
                <button
                  type="button"
                  className="button button-small"
                  disabled={mutation.isPending}
                  onClick={() => {
                    mutation.mutate('');
                  }}
                >
                  {t('folderColorRemove')}
                </button>
              ) : null}
                <button
                  type="button"
                  className="button button-primary button-small"
                  disabled={mutation.isPending || !/^#[0-9a-fA-F]{6}$/.test(draft) || draft.toLowerCase() === color.toLowerCase()}
                  onClick={() => mutation.mutate(draft.toLowerCase())}
                >
                  {t('save')}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
