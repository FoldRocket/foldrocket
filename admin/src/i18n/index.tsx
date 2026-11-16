import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyBootI18n,
  loadLocaleCatalog,
  normalizeUiLocale,
  resolveUiLocale,
  translate,
  type MessageKey,
  type UiLocale,
} from './catalogs';

type I18nContextValue = {
  locale: UiLocale;
  uiSetting: string;
  setUiSetting: (setting: string) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function bootUiSetting(): string {
  return window.FRKT_BOOT?.uiLocaleSetting || window.FRKT_BOOT?.uiLocale || 'auto';
}

function bootResolvedLocale(setting: string): UiLocale {
  return resolveUiLocale(setting, window.FRKT_BOOT?.wpLocale);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [uiSetting, setUiSettingState] = useState(bootUiSetting);
  const [locale, setLocale] = useState(() => bootResolvedLocale(bootUiSetting()));

  const setUiSetting = useCallback((setting: string) => {
    const next = setting || 'auto';
    setUiSettingState(next);
    const resolved = bootResolvedLocale(next);
    void loadLocaleCatalog(resolved).then(() => {
      setLocale(resolved);
      applyBootI18n(resolved);
      if (window.FRKT_BOOT) {
        window.FRKT_BOOT.uiLocaleSetting = next;
        window.FRKT_BOOT.uiLocale = resolved;
      }
    });
  }, []);

  useEffect(() => {
    applyBootI18n(locale);
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, uiSetting, setUiSetting, t }),
    [locale, uiSetting, setUiSetting, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    const locale = normalizeUiLocale(window.FRKT_BOOT?.uiLocale);
    return {
      locale,
      uiSetting: bootUiSetting(),
      setUiSetting: () => undefined,
      t: (key, vars) => translate(locale, key, vars),
    };
  }
  return ctx;
}
