import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export const DEFAULT_THEME: ThemePreference = 'system';

const VALID: ThemePreference[] = ['light', 'dark', 'system'];

export function normalizeThemePreference(value: unknown, fallback: ThemePreference = DEFAULT_THEME): ThemePreference {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  return (VALID as string[]).includes(raw) ? (raw as ThemePreference) : fallback;
}

export function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme {
  if (preference === 'light' || preference === 'dark') return preference;
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

let mediaCleanup: (() => void) | null = null;

/** Apply preference on `#frkt-admin-root` and keep system mode in sync with OS. */
export function applyThemePreference(
  input: unknown,
  root?: HTMLElement | null
): ThemePreference {
  const preference = normalizeThemePreference(input);
  const el = root ?? document.getElementById('frkt-admin-root');
  if (!el) return preference;

  el.setAttribute('data-theme-pref', preference);
  el.setAttribute('data-theme', resolveEffectiveTheme(preference));

  mediaCleanup?.();
  mediaCleanup = null;

  if (preference === 'system' && typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      el.setAttribute('data-theme', resolveEffectiveTheme('system'));
    };
    mq.addEventListener('change', onChange);
    mediaCleanup = () => mq.removeEventListener('change', onChange);
  }

  if (typeof window !== 'undefined' && window.FRKT_BOOT) {
    window.FRKT_BOOT.theme = preference;
  }

  return preference;
}

type ThemeState = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => ThemePreference;
};

export const useThemeStore = create<ThemeState>((set) => ({
  preference: normalizeThemePreference(
    typeof window !== 'undefined' ? window.FRKT_BOOT?.theme : DEFAULT_THEME
  ),
  setPreference: (next) => {
    const preference = applyThemePreference(next);
    set({ preference });
    return preference;
  },
}));
