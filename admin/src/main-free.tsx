import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { uiSlots } from './app/slots';
import { I18nProvider } from './i18n';
import { applyBootI18n, loadLocaleCatalog, resolveUiLocale } from './i18n/catalogs';
import { applyPrimaryColor, DEFAULT_PRIMARY } from './theme/primaryColor';
import { applyThemePreference, DEFAULT_THEME, useThemeStore } from './theme/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Inspector = lazy(() => import('./features/inspector/Inspector').then((module) => ({ default: module.Inspector })));

uiSlots.InspectorView = Inspector;

async function mount() {
  const el = document.getElementById('frkt-admin-root');
  if (!el) return;
  applyPrimaryColor(window.FRKT_BOOT?.primaryColor || DEFAULT_PRIMARY, el);
  const theme = applyThemePreference(window.FRKT_BOOT?.theme || DEFAULT_THEME, el);
  useThemeStore.setState({ preference: theme });
  const locale = resolveUiLocale(
    window.FRKT_BOOT?.uiLocaleSetting || window.FRKT_BOOT?.uiLocale,
    window.FRKT_BOOT?.wpLocale
  );
  await loadLocaleCatalog(locale);
  applyBootI18n(locale);
  createRoot(el).render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
