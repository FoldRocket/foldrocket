import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Copy,
  LayoutGrid,
  Lock,
  RefreshCw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../api/client';
import { useUiStore, type Page } from '../stores/ui';
import { useHashNavigation } from '../navigation/useHashNavigation';
import { isFeatureEnabled, useFeaturesMap } from '../features/features/useFeature';
import { useBrandLogo } from '../features/settings/brand';
import { IndexIncompleteBanner } from '../features/health/IndexIncompleteBanner';
import { IndexProgressOverlay } from '../features/health/IndexProgressOverlay';
import { ActiveBulkOperationMonitor } from '../features/health/ActiveBulkOperationMonitor';
import { runFullLibraryIndex } from '../features/health/runFullLibraryIndex';
import { uiSlots } from './slots';
import { ProUpgradeBanner } from './ProUpgradeBanner';
import { isFreeBuild } from '../edition';
import { UploadButton } from '../features/library/UploadMedia';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/catalogs';
import { toastError, toastT } from '../i18n/toastMessages';
import { ToastHost } from '../ui/ToastHost';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { toast } from '../ui/toast';
import { iconProps } from '../ui/icons';
import { UiErrorBoundary } from '../ui/UiErrorBoundary';

const NAV: { key: Page; icon: string; feature?: string; countKey?: 'library' | 'duplicates' }[] = [
  { key: 'library', icon: 'grid', countKey: 'library' },
  { key: 'duplicates', icon: 'duplicates', feature: 'duplicates', countKey: 'duplicates' },
  { key: 'health', icon: 'activity', feature: 'health' },
  { key: 'system', icon: 'shield', feature: 'system' },
  { key: 'features', icon: 'features' },
];

const PAGE_KEYS: Record<string, { title: MessageKey; subtitle: MessageKey }> = {
  library: { title: 'pageLibraryTitle', subtitle: 'pageLibrarySubtitle' },
  duplicates: { title: 'pageDuplicatesTitle', subtitle: 'pageDuplicatesSubtitle' },
  health: { title: 'pageHealthTitle', subtitle: 'pageHealthSubtitle' },
  system: { title: 'pageSystemTitle', subtitle: 'pageSystemSubtitle' },
  settings: { title: 'pageSettingsTitle', subtitle: 'pageSettingsSubtitle' },
  features: { title: 'pageFeaturesTitle', subtitle: 'pageFeaturesSubtitle' },
};

const LibraryPage = lazy(() => import('../features/library/LibraryPage').then((module) => ({ default: module.LibraryPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const FeaturesPage = lazy(() => import('../features/features/FeaturesPage').then((module) => ({ default: module.FeaturesPage })));
const SetupWizard = lazy(() => import('../features/setup/SetupWizard').then((module) => ({ default: module.SetupWizard })));
const LibraryOverview = lazy(() => import('../features/setup/LibraryOverview').then((module) => ({ default: module.LibraryOverview })));

/** After the first setup finish, index attachments that are not in the library yet. */
async function startLibraryIndexAfterSetup(qc: ReturnType<typeof useQueryClient>) {
  if (useUiStore.getState().indexProgress) return;
  try {
    const health = await api.getHealth();
    const attachments = Number(health.totals?.attachments ?? 0);
    const indexed = Math.min(Number(health.totals?.indexed ?? 0), attachments);
    if (attachments <= 0 || indexed >= attachments) return;
    await runFullLibraryIndex({ indexed, attachments });
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['health'] }),
      qc.invalidateQueries({ queryKey: ['assets'] }),
      qc.invalidateQueries({ queryKey: ['system'] }),
      qc.invalidateQueries({ queryKey: ['jobs'] }),
    ]);
    void qc.invalidateQueries({ queryKey: ['library-scan'] });
    toast.success(toastT('scanQueuedBackground'));
  } catch (e) {
    const code = (e as { code?: string }).code;
    // Setup is already saved. A forbidden index must not look like a failed finish.
    if (code === 'rest_forbidden') return;
    toast.error(toastError('toastGenericError', e as Error));
  }
}

function NavIcon({ name }: { name: string }) {
  switch (name) {
    case 'grid':
      return <LayoutGrid {...iconProps} />;
    case 'duplicates':
      return <Copy {...iconProps} />;
    case 'activity':
      return <Activity {...iconProps} />;
    case 'shield':
      return <ShieldCheck {...iconProps} />;
    case 'features':
      return <SlidersHorizontal {...iconProps} />;
    case 'settings':
      return <Settings {...iconProps} />;
    default:
      return null;
  }
}

export function App() {
  const { page, setPage, activeAsset } = useUiStore();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  useHashNavigation();
  useFeaturesMap(); // re-render nav/gates when Features page toggles
  const [setupDone, setSetupDone] = useState(() => {
    // wp_localize_script stringifies booleans → "false" must not count as done.
    const v = window.FRKT_BOOT?.setupCompleted as unknown;
    return v === true || v === 1 || v === '1' || v === 'true';
  });
  const licensed = uiSlots.readLicenseActive();
  const Banner = uiSlots.FreeEditionBannerView;
  const InspectorSlot = uiSlots.InspectorView;
  const DuplicatesSlot = uiSlots.extraPages.duplicates;
  const HealthSlot = uiSlots.extraPages.health;
  const SystemSlot = uiSlots.extraPages.system;

  const libraryTotal = useQuery({
    queryKey: ['assets', 'total'],
    queryFn: () => api.listAssets({ page: 1, per_page: 1 }),
    staleTime: 30_000,
    enabled: setupDone,
  });

  const duplicatesTotal = useQuery({
    queryKey: ['duplicates', 'nav-total'],
    queryFn: () => api.listDuplicates(1, 'all', 1),
    staleTime: 30_000,
    enabled: setupDone && !isFreeBuild && isFeatureEnabled('duplicates'),
  });

  const duplicatesNavCount = useSyncExternalStore(
    (onStoreChange) => qc.getQueryCache().subscribe(onStoreChange),
    () => {
      let count: number | null = null;
      for (const query of qc.getQueryCache().findAll({ queryKey: ['duplicates'] })) {
        const total = (query.state.data as { total?: number } | undefined)?.total;
        if (typeof total !== 'number') continue;
        count = count == null ? total : Math.max(count, total);
      }
      return count;
    }
  );

  const navCounts: Partial<Record<'library' | 'duplicates', number>> = {
    library: libraryTotal.data?.total,
    duplicates: duplicatesNavCount ?? undefined,
  };

  useEffect(() => {
    if (duplicatesNavCount == null) return;
    const current = qc.getQueryData<{ total?: number }>(['duplicates', 'nav-total'])?.total;
    if (current === duplicatesNavCount || (typeof current === 'number' && current >= duplicatesNavCount)) {
      return;
    }
    qc.setQueryData(['duplicates', 'nav-total'], (prev: { total?: number } | undefined) => {
      if (!prev || (prev.total ?? 0) >= duplicatesNavCount) return prev;
      return { ...prev, total: duplicatesNavCount };
    });
  }, [duplicatesNavCount, qc]);

  useEffect(() => {
    const onRerunSetup = () => setSetupDone(false);
    window.addEventListener('frkt:rerun-setup', onRerunSetup);
    return () => window.removeEventListener('frkt:rerun-setup', onRerunSetup);
  }, []);

  useEffect(() => {
    const current = NAV.find((n) => n.key === page);
    if (current?.feature && (isFreeBuild || !isFeatureEnabled(current.feature))) {
      setPage('library');
    }
  }, [page, setPage]);

  const refresh = useMutation({
    mutationFn: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['assets'] }),
        qc.invalidateQueries({ queryKey: ['folders'] }),
        qc.invalidateQueries({ queryKey: ['collections'] }),
        qc.invalidateQueries({ queryKey: ['unused'] }),
        qc.invalidateQueries({ queryKey: ['duplicates'] }),
        qc.invalidateQueries({ queryKey: ['health'] }),
        qc.invalidateQueries({ queryKey: ['settings'] }),
        qc.invalidateQueries({ queryKey: ['features'] }),
        qc.invalidateQueries({ queryKey: ['system'] }),
      ]);
    },
    onSuccess: () => toast.success(t('refreshed')),
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const keys = PAGE_KEYS[page];
  const meta = keys
    ? { title: t(keys.title), subtitle: t(keys.subtitle) }
    : { title: t('title'), subtitle: '' };

  const openLicenseSettings = () => setPage('settings');
  const brandLogo = useBrandLogo();
  const logoSrc = brandLogo || `${window.FRKT_BOOT.pluginUrl}assets/img/logo-frkt-mark.svg`;
  const openNavItem = (item: (typeof NAV)[number]) => {
    const locked = Boolean(item.feature && !isFeatureEnabled(item.feature));
    if (locked) {
      toast.info(t('proFeatureLocked'));
      return;
    }
    setPage(item.key);
  };
  const renderNavItem = (item: (typeof NAV)[number]) => {
    const locked = Boolean(item.feature && !isFeatureEnabled(item.feature));
    return (
      <button
        key={item.key}
        type="button"
        className={`frkt-sidenav__link ${page === item.key ? 'is-active' : ''}${locked ? ' is-locked' : ''}`}
        aria-current={page === item.key ? 'page' : undefined}
        aria-disabled={locked || undefined}
        aria-label={t(item.key)}
        data-tooltip={t(item.key)}
        onClick={() => openNavItem(item)}
      >
        <NavIcon name={item.icon} />
        <span>{t(item.key)}</span>
        {locked ? <Lock {...iconProps} size={12} aria-hidden /> : null}
        {!locked && item.countKey != null && navCounts[item.countKey] != null ? (
          <span className="frkt-count">{navCounts[item.countKey]}</span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="frkt-app" lang={locale.slice(0, 2)} key={locale}>
      <ToastHost />
      {isFreeBuild ? <ProUpgradeBanner /> : null}
      <UiErrorBoundary
        title={t('error')}
        message={t('toastGenericError')}
        reloadLabel={t('refresh')}
        resetKey={`app:${page}`}
      >
      <Suspense fallback={<div className="frkt-state">{t('loading')}</div>}>
      {!setupDone ? (
        <SetupWizard
          onComplete={() => {
            setSetupDone(true);
            void startLibraryIndexAfterSetup(qc);
          }}
        />
      ) : (
        <>
          {!isFreeBuild ? <ActiveBulkOperationMonitor /> : null}
          {page !== 'library' ? <IndexProgressOverlay /> : null}
          <div className="frkt-shell">
            <aside className="frkt-sidenav" aria-label={t('title')}>
              <div className="frkt-sidenav__brand">
                <img
                  className={`frkt-sidenav__logo${brandLogo ? ' is-custom' : ''}`}
                  src={logoSrc}
                  alt={t('title')}
                  width={32}
                  height={32}
                />
              </div>

              <nav className="frkt-sidenav__nav">
                <p className="frkt-sidenav__label">{t('main')}</p>
                {NAV.map((item) => renderNavItem(item))}
              </nav>

              <div className="frkt-sidenav__footer">
                <ThemeSwitcher className="frkt-sidenav__link frkt-sidenav__theme" single />
                <button
                  type="button"
                  className={`frkt-sidenav__link ${page === 'settings' ? 'is-active' : ''}`}
                  aria-current={page === 'settings' ? 'page' : undefined}
                  aria-label={t('settings')}
                  data-tooltip={t('settings')}
                  data-frkt-tour="settings"
                  onClick={() => setPage('settings')}
                >
                  <NavIcon name="settings" />
                  <span>{t('settings')}</span>
                </button>
              </div>
            </aside>

            <div className="frkt-shell__main">
              {!isFreeBuild && !licensed && Banner ? (
                <Banner onOpenLicense={openLicenseSettings} />
              ) : null}

              <header className="frkt-topbar">
                <div className="frkt-topbar__title">
                  <h1>{meta.title}</h1>
                  {meta.subtitle ? <p className="frkt-topbar__subtitle">{meta.subtitle}</p> : null}
                </div>
                <div className="frkt-topbar__actions">
                  <button
                    type="button"
                    className="frkt-btn-outline"
                    disabled={refresh.isPending}
                    onClick={() => refresh.mutate()}
                    aria-label={refresh.isPending ? t('loading') : t('refresh')}
                  >
                    <RefreshCw {...iconProps} size={15} />
                    <span className="frkt-btn-label">
                      {refresh.isPending ? t('loading') : t('refresh')}
                    </span>
                  </button>
                  {isFeatureEnabled('upload') ? (
                    <UploadButton className="frkt-btn-upload frkt-btn-primary" />
                  ) : null}
                </div>
              </header>

              <IndexIncompleteBanner showIncomplete={page !== 'library'} />

              <div className="frkt-body">
                {page === 'library' && <LibraryPage />}
                {page === 'duplicates' && isFeatureEnabled('duplicates') && DuplicatesSlot ? (
                  <DuplicatesSlot />
                ) : null}
                {page === 'health' && isFeatureEnabled('health') && HealthSlot ? <HealthSlot /> : null}
                {page === 'system' && isFeatureEnabled('system') && SystemSlot ? <SystemSlot /> : null}
                {page === 'features' && <FeaturesPage />}
                {page === 'settings' && <SettingsPage />}
                {InspectorSlot ? (
                  <UiErrorBoundary
                    title={t('error')}
                    message={t('toastGenericError')}
                    reloadLabel={t('refresh')}
                    resetKey={`inspector:${activeAsset?.attachmentId ?? 0}`}
                    className="frkt-state frkt-state--error frkt-inspector-error"
                  >
                    <InspectorSlot />
                  </UiErrorBoundary>
                ) : null}
              </div>
            </div>
          </div>
          <LibraryOverview />
        </>
      )}
      </Suspense>
      </UiErrorBoundary>
    </div>
  );
}
