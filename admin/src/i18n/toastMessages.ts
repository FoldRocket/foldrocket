import { resolveUiLocale, translate, type MessageKey } from './catalogs';

/** Resolve toast copy for the active UI locale (works outside React). */
export function toastT(key: MessageKey, vars?: Record<string, string | number>): string {
  const locale = resolveUiLocale(
    window.FRKT_BOOT?.uiLocaleSetting || window.FRKT_BOOT?.uiLocale,
    window.FRKT_BOOT?.wpLocale
  );
  return translate(locale, key, vars);
}

/** Prefer a friendly toast; fall back to the API/error message when useful. */
export function toastError(fallbackKey: MessageKey, error?: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : '';
  if (!raw || raw === 'Error') return toastT(fallbackKey);
  // Keep long provider errors visible (truncated), don't hide them behind a generic toast.
  if (raw.length <= 220) return raw;
  return `${raw.slice(0, 217)}…`;
}
