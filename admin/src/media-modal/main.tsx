import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { I18nProvider } from '../i18n';
import { applyBootI18n, loadLocaleCatalog, resolveUiLocale } from '../i18n/catalogs';
import { applyPrimaryColor, DEFAULT_PRIMARY } from '../theme/primaryColor';
import { useThemeStore } from '../theme/theme';
import { ToastHost } from '../ui/ToastHost';
import { MediaModalApp } from './MediaModalApp';
import { NativeMediaFolderSidebar } from './NativeMediaFolderSidebar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const roots = new WeakMap<HTMLElement, Root>();

function applyModalLightTheme(el: HTMLElement): void {
  el.setAttribute('data-theme-pref', 'light');
  el.setAttribute('data-theme', 'light');
  useThemeStore.setState({ preference: 'light' });
}

export type MediaModalMountOptions = {
  controller: unknown;
};

export type NativeFoldersMountOptions = {
  activeFolderId?: number | null;
  activeSmartViewId?: number | null;
  onSelectFolder: (folderId: number | null) => void;
  onSelectSmartView: (smartViewId: number | null) => void;
};

async function ensureBoot(): Promise<void> {
  if (!window.FRKT_BOOT) return;
  const locale = resolveUiLocale(
    window.FRKT_BOOT.uiLocaleSetting || window.FRKT_BOOT.uiLocale,
    window.FRKT_BOOT.wpLocale
  );
  await loadLocaleCatalog(locale);
  applyBootI18n(locale);
}

export async function mount(el: HTMLElement, options: MediaModalMountOptions): Promise<void> {
  if (!el || !options?.controller) return;
  await ensureBoot();
  applyPrimaryColor(window.FRKT_BOOT?.primaryColor || DEFAULT_PRIMARY, el);
  applyModalLightTheme(el);

  let root = roots.get(el);
  if (!root) {
    root = createRoot(el);
    roots.set(el, root);
  }

  root.render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <MediaModalApp controller={options.controller as never} />
        <ToastHost />
      </I18nProvider>
    </QueryClientProvider>
  );
}

export function unmount(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

export async function mountNativeFolders(el: HTMLElement, options: NativeFoldersMountOptions): Promise<void> {
  if (
    !el ||
    typeof options?.onSelectFolder !== 'function' ||
    typeof options?.onSelectSmartView !== 'function'
  ) return;
  await ensureBoot();
  applyPrimaryColor(window.FRKT_BOOT?.primaryColor || DEFAULT_PRIMARY, el);
  applyModalLightTheme(el);

  let root = roots.get(el);
  if (!root) {
    root = createRoot(el);
    roots.set(el, root);
  }

  root.render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <NativeMediaFolderSidebar {...options} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

// The WordPress bridge is a classic script and reads this API from window.
// Assign it explicitly so Vite/Rollup entry-export tree-shaking cannot remove it.
window.FRKTMediaModal = {
  mount,
  unmount,
  mountNativeFolders,
};
