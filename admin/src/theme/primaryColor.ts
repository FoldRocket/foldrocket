export const DEFAULT_PRIMARY = '#6366F1';

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export function normalizePrimaryColor(value: unknown, fallback = DEFAULT_PRIMARY): string {
  const raw = String(value ?? '').trim();
  if (HEX_RE.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  return fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = HEX_RE.exec(normalizePrimaryColor(hex));
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function mix(channel: number, target: number, amount: number): number {
  return Math.round(channel + (target - channel) * amount);
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Derive brand + accent CSS vars and apply them on `#frkt-admin-root`. */
export function applyPrimaryColor(input: string, root?: HTMLElement | null): string {
  const hex = normalizePrimaryColor(input);
  const rgb = hexToRgb(hex);
  if (!rgb) return DEFAULT_PRIMARY;

  const hover = toHex({
    r: mix(rgb.r, 0, 0.18),
    g: mix(rgb.g, 0, 0.18),
    b: mix(rgb.b, 0, 0.18),
  });
  const accent2 = toHex({
    r: mix(rgb.r, 255, 0.22),
    g: mix(rgb.g, 255, 0.22),
    b: mix(rgb.b, 255, 0.22),
  });

  const el = root ?? document.getElementById('frkt-admin-root');
  if (el) {
    el.style.setProperty('--frkt-color-brand-500', hex);
    el.style.setProperty('--frkt-color-brand-600', hover);
    el.style.setProperty('--frkt-color-brand-400', accent2);
    el.style.setProperty('--frkt-color-brand-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.10)`);
    el.style.setProperty('--frkt-color-brand-soft-strong', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
    el.style.setProperty('--frkt-color-brand-ring', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`);
    el.style.setProperty('--frkt-accent', hex);
    el.style.setProperty('--frkt-accent-hover', hover);
    el.style.setProperty('--frkt-accent-2', accent2);
    el.style.setProperty('--frkt-accent-soft', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.10)`);
    el.style.setProperty('--frkt-accent-soft-strong', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
    el.style.setProperty('--frkt-accent-ring', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`);
  }

  return hex;
}
