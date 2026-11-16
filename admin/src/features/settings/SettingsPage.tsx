import modelCatalog from '../../../../src/Infrastructure/Providers/vision-models.json';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Import, KeyRound, Languages, Palette, SlidersHorizontal, Sparkles, Trash2, Wrench } from 'lucide-react';
import { useLibraryScan } from '../jobs/LibraryScanProgress';
import { kickJobPump } from '../../api/jobPump';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { normalizeUiLocale, UI_LOCALE_OPTIONS, type MessageKey } from '../../i18n/catalogs';
import { METADATA_LOCALES } from '../../i18n/locales';
import { applyPrimaryColor, DEFAULT_PRIMARY, normalizePrimaryColor } from '../../theme/primaryColor';
import { applyThemePreference, normalizeThemePreference, useThemeStore } from '../../theme/theme';
import { toastError, toastT } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { ThemeSwitcher } from '../../ui/ThemeSwitcher';
import { ConfirmModal } from '../../ui/Modal';
import { iconProps } from '../../ui/icons';
import { handleTablistKey } from '../../ui/tabs';
import { isFreeBuild } from '../../edition';
import { isFeatureEnabled } from '../features/useFeature';
import { applyAdminMenuLabel } from './brand';
import { FolderImportPanel } from './FolderImportPanel';
import { DEFAULT_FOLDER_COLOR_PALETTE, normalizeFolderColorPalette } from '../folders/palette';
import { SecretInput, WhiteLabelFields } from './SettingsFields';

type SettingsResponse = {
  settings: {
    general?: {
      items_per_page?: number;
      primary_color?: string;
      large_file_mb?: number;
      theme?: string;
      media_tab_label?: string;
      resize_presets?: ResizePreset[];
      folder_color_palette?: string[];
    };
    ai?: Record<string, string | number | boolean | string[] | undefined>;
    languages?: { default?: string; enabled?: string[]; ui?: string };
    privacy?: {
      strip_exif?: boolean;
      send_reduced_only?: boolean;
      never_send_originals?: boolean;
    };
  };
  providers: Array<{ id: string; label: string; configured: boolean; kind?: string }>;
  uninstallMode?: 'keep' | 'delete';
  whiteLabel?: { logoUrl: string; iconUrl: string };
};

type ResizePreset = { id: string; label: string; width?: number; scale?: number };
const DEFAULT_RESIZE_PRESETS: ResizePreset[] = [
  { id: '1920', label: '1920w', width: 1920 },
  { id: '1280', label: '1280w', width: 1280 },
  { id: '800', label: '800w', width: 800 },
  { id: '50', label: '50%', scale: 0.5 },
];

function normalizeResizePresets(value: ResizePreset[] | undefined): ResizePreset[] {
  if (!Array.isArray(value) || !value.length) return DEFAULT_RESIZE_PRESETS.map((preset) => ({ ...preset }));
  return value.map((preset, index) => ({ ...preset, id: `${index}-${preset.label}` }));
}

function clampLargeFileMb(n: number) {
  return Math.min(500, Math.max(1, Math.round(n) || 2));
}

const LOCALE_OPTIONS = METADATA_LOCALES;

type ModelOption = { id: string; label: string; recommended?: boolean };

const MODEL_CATALOG = modelCatalog as Record<string, ModelOption[]>;

type ProviderFormConfig = {
  modelKey: string;
  defaultModel: string;
  models: ModelOption[];
  keyPlaceholder: string;
};

const PROVIDER_FORMS: Record<string, ProviderFormConfig> = {
  openai: {
    modelKey: 'openai_model',
    defaultModel: 'gpt-4o-mini',
    models: MODEL_CATALOG.openai,
    keyPlaceholder: 'sk-…',
  },
  gemini: {
    modelKey: 'gemini_model',
    defaultModel: 'gemini-2.5-flash',
    models: MODEL_CATALOG.gemini,
    keyPlaceholder: 'AIza…',
  },
  anthropic: {
    modelKey: 'anthropic_model',
    defaultModel: 'claude-sonnet-4-5',
    models: MODEL_CATALOG.anthropic,
    keyPlaceholder: 'sk-ant-…',
  },
  openrouter: {
    modelKey: 'openrouter_model',
    defaultModel: 'openai/gpt-4o-mini',
    models: MODEL_CATALOG.openrouter,
    keyPlaceholder: 'sk-or-…',
  },
  xai: {
    modelKey: 'xai_model',
    defaultModel: 'grok-4.7',
    models: MODEL_CATALOG.xai,
    keyPlaceholder: 'xai-…',
  },
  mistral: {
    modelKey: 'mistral_model',
    defaultModel: 'pixtral-large-latest',
    models: MODEL_CATALOG.mistral,
    keyPlaceholder: '…',
  },
};

function clampPerPage(n: number) {
  return Math.min(100, Math.max(1, Math.round(n) || 20));
}

type SettingsTab = 'appearance' | 'configuration' | 'languages' | 'ai' | 'license' | 'import' | 'maintenance';

const SETTINGS_TABS = [
  { id: 'appearance', labelKey: 'tabAppearance', Icon: Palette },
  { id: 'configuration', labelKey: 'tabConfiguration', Icon: SlidersHorizontal },
  { id: 'languages', labelKey: 'tabLanguages', Icon: Languages },
  { id: 'ai', labelKey: 'tabAi', Icon: Sparkles },
  { id: 'license', labelKey: 'tabLicense', Icon: KeyRound },
  { id: 'import', labelKey: 'tabImport', Icon: Import },
  { id: 'maintenance', labelKey: 'tabMaintenance', Icon: Wrench },
].filter(
  (tab): tab is { id: SettingsTab; labelKey: MessageKey; Icon: typeof Palette } =>
    !isFreeBuild || (tab.id !== 'ai' && tab.id !== 'license')
);

function initialSettingsTab(): SettingsTab {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const match = hash.match(/[?&]tab=([a-z]+)/i);
  const requestedTab = match?.[1] || '';
  const tab = (requestedTab === 'privacy' ? 'ai' : requestedTab) as SettingsTab;
  if (['appearance', 'configuration', 'languages', 'ai', 'license', 'import', 'maintenance'].includes(tab)) {
    if (isFreeBuild && (tab === 'ai' || tab === 'license')) {
      return 'appearance';
    }
    return tab;
  }
  return 'appearance';
}

function SettingsPanel({
  description,
  children,
  footer,
}: {
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="frkt-settings-panel">
      {description ? <p className="frkt-settings-panel__desc frkt-muted">{description}</p> : null}
      <div className="frkt-settings-panel__body">{children}</div>
      {footer ? <footer className="frkt-settings-panel__footer">{footer}</footer> : null}
    </div>
  );
}

export function SettingsPage() {
  const qc = useQueryClient();
  const indexScan = useLibraryScan('index');
  const { t, uiSetting, setUiSetting } = useI18n();
  const [tab, setTab] = useState<SettingsTab>(initialSettingsTab);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings() as Promise<SettingsResponse>,
  });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [provider, setProvider] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [customModelProviders, setCustomModelProviders] = useState<Record<string, boolean>>({});
  const catalog = useQuery({
    queryKey: ['provider-models', provider, data?.providers.find((p) => p.id === provider)?.configured],
    queryFn: () => api.getProviderModels(provider),
    enabled: tab === 'ai' && Boolean(provider),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  const refreshModels = useMutation({
    mutationFn: (id: string) => api.getProviderModels(id, true),
    onSuccess: (result, id) => {
      qc.setQueryData(['provider-models', id, data?.providers.find((p) => p.id === id)?.configured], result);
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });
  const [generationInstructions, setGenerationInstructions] = useState('');
  const [models, setModels] = useState<Record<string, string>>({
    openai_model: 'gpt-4o-mini',
    gemini_model: 'gemini-2.5-flash',
    anthropic_model: 'claude-sonnet-4-5',
    openrouter_model: 'openai/gpt-4o-mini',
    xai_model: 'grok-4.7',
    mistral_model: 'pixtral-large-latest',
  });
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [largeFileMb, setLargeFileMb] = useState(2);
  const [resizePresets, setResizePresets] = useState<ResizePreset[]>(DEFAULT_RESIZE_PRESETS.map((preset) => ({ ...preset })));
  const [folderColorPalette, setFolderColorPalette] = useState<string[]>([...DEFAULT_FOLDER_COLOR_PALETTE]);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [mediaTabLabel, setMediaTabLabel] = useState('');
  const [uiLocale, setUiLocale] = useState(uiSetting || 'auto');
  const [defaultLocale, setDefaultLocale] = useState('en_US');
  const [enabledLocales, setEnabledLocales] = useState<string[]>(['en_US']);
  const [stripExif, setStripExif] = useState(true);
  const [sendReducedOnly, setSendReducedOnly] = useState(true);
  const [neverSendOriginals, setNeverSendOriginals] = useState(true);
  const [rerunSetupConfirm, setRerunSetupConfirm] = useState(false);
  const [uninstallMode, setUninstallMode] = useState<'keep' | 'delete'>('keep');
  const [licenseKey, setLicenseKey] = useState('');

  const licenseQuery = useQuery({
    queryKey: ['license'],
    queryFn: () => api.getLicense(),
    staleTime: 30_000,
  });
  const bootLicense = window.FRKT_BOOT?.license;
  const licenseLocked =
    Boolean(licenseQuery.data?.locked ?? bootLicense?.locked) ||
    (licenseQuery.data?.plan ?? bootLicense?.plan) === 'demo';

  const activateLicense = useMutation({
    mutationFn: () => api.activateLicense(licenseKey),
    onSuccess: (res) => {
      if (res.locked || res.plan === 'demo') {
        qc.setQueryData(['license'], { ...res, active: true, locked: true });
        return;
      }
      setLicenseKey('');
      qc.setQueryData(['license'], res);
      if (window.FRKT_BOOT) {
        window.FRKT_BOOT.license = res;
        window.FRKT_BOOT.edition = 'pro';
      }
      toast.success(res.message || t('licenseStatusActive'));
      window.location.reload();
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const deactivateLicense = useMutation({
    mutationFn: () => api.deactivateLicense(),
    onSuccess: (res) => {
      if (res.locked || res.plan === 'demo') {
        qc.setQueryData(['license'], { ...res, active: true, locked: true, plan: 'demo' });
        return;
      }
      qc.setQueryData(['license'], res);
      if (window.FRKT_BOOT) {
        window.FRKT_BOOT.license = res;
        window.FRKT_BOOT.edition = 'free';
      }
      toast.success(res.message || t('licenseStatusInactive'));
      window.location.reload();
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  useEffect(() => {
    if (!data) return;
    if (data.providers?.length) {
      const savedRaw = data.settings?.ai?.default_provider;
      const saved = typeof savedRaw === 'string' ? savedRaw : '';
      const valid = data.providers.some((p) => p.id === saved);
      setProvider(valid ? saved : data.providers[0].id);
    }
    const ai = data.settings?.ai || {};
    const instructionsRaw = ai.generation_instructions;
    setGenerationInstructions(typeof instructionsRaw === 'string' ? instructionsRaw : '');
    setModels((prev) => {
      const next = { ...prev };
      for (const cfg of Object.values(PROVIDER_FORMS)) {
        const raw = ai[cfg.modelKey];
        if (typeof raw === 'string' && raw) {
          next[cfg.modelKey] =
            cfg.modelKey === 'gemini_model' && raw === 'gemini-1.5-flash' ? cfg.defaultModel : raw;
        }
      }
      return next;
    });
    setItemsPerPage(clampPerPage(data.settings?.general?.items_per_page ?? window.FRKT_BOOT.itemsPerPage ?? 20));
    setLargeFileMb(
      clampLargeFileMb(data.settings?.general?.large_file_mb ?? window.FRKT_BOOT.largeFileMb ?? 2)
    );
    setResizePresets(normalizeResizePresets(data.settings?.general?.resize_presets));
    setFolderColorPalette(normalizeFolderColorPalette(data.settings?.general?.folder_color_palette));
    const color = normalizePrimaryColor(
      data.settings?.general?.primary_color ?? window.FRKT_BOOT.primaryColor ?? DEFAULT_PRIMARY
    );
    setPrimaryColor(color);
    applyPrimaryColor(color);
    const tabLabel = data.settings?.general?.media_tab_label;
    setMediaTabLabel(typeof tabLabel === 'string' ? tabLabel.slice(0, 40) : '');

    const theme = normalizeThemePreference(
      data.settings?.general?.theme ?? window.FRKT_BOOT.theme
    );
    useThemeStore.getState().setPreference(theme);

    const langs = data.settings?.languages;
    const ui = langs?.ui || window.FRKT_BOOT.uiLocaleSetting || 'auto';
    setUiLocale(ui === 'auto' ? 'auto' : normalizeUiLocale(ui));

    const allowed = new Set(LOCALE_OPTIONS.map((l) => l.code));
    let enabled = (langs?.enabled || ['en_US']).filter((c) => allowed.has(c));
    if (!enabled.length) enabled = ['en_US'];
    let def = langs?.default || 'en_US';
    if (!allowed.has(def)) def = enabled[0];
    if (!enabled.includes(def)) enabled = [def, ...enabled];
    setEnabledLocales(enabled);
    setDefaultLocale(def);

    const privacy = data.settings?.privacy;
    setStripExif(privacy?.strip_exif !== false);
    setSendReducedOnly(privacy?.send_reduced_only !== false);
    setNeverSendOriginals(privacy?.never_send_originals !== false);
    setUninstallMode(data.uninstallMode === 'delete' ? 'delete' : 'keep');
  }, [data]);

  const savedToast = () => {
    toast.success(toastT('toastSettingsSaved'));
  };

  const saveAppearance = useMutation({
    mutationFn: () =>
      api.saveSettings({
        settings: {
          general: {
            items_per_page: clampPerPage(itemsPerPage),
            large_file_mb: clampLargeFileMb(largeFileMb),
            primary_color: normalizePrimaryColor(primaryColor),
            theme: useThemeStore.getState().preference,
            ...(!isFreeBuild ? { media_tab_label: mediaTabLabel.trim().slice(0, 40) } : {}),
          },
          languages: {
            ui: uiLocale,
          },
        },
      }),
    onSuccess: () => {
      setUiSetting(uiLocale);
      const color = applyPrimaryColor(primaryColor);
      setPrimaryColor(color);
      const theme = applyThemePreference(useThemeStore.getState().preference);
      if (window.FRKT_BOOT) {
        window.FRKT_BOOT.primaryColor = color;
        window.FRKT_BOOT.theme = theme;
        window.FRKT_BOOT.largeFileMb = clampLargeFileMb(largeFileMb);
        window.FRKT_BOOT.itemsPerPage = clampPerPage(itemsPerPage);
      }
      savedToast();
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['health'] });
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const saveConfiguration = useMutation({
    mutationFn: () => api.saveSettings({
      settings: {
        general: {
          resize_presets: resizePresets.map(({ id, ...preset }) => preset),
          folder_color_palette: folderColorPalette,
        },
      },
    }),
    onSuccess: () => {
      savedToast();
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const saveLanguages = useMutation({
    mutationFn: () => {
      const enabled = enabledLocales.includes(defaultLocale)
        ? enabledLocales
        : [defaultLocale, ...enabledLocales];
      return api.saveSettings({
        settings: {
          languages: {
            default: defaultLocale,
            enabled,
          },
        },
      });
    },
    onSuccess: () => {
      savedToast();
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const saveProvider = useMutation({
    mutationFn: () => {
      const form = PROVIDER_FORMS[provider];
      const ai: Record<string, string> = {
        default_provider: provider,
        generation_instructions: generationInstructions.slice(0, 2000),
      };
      if (form) {
        ai[form.modelKey] = models[form.modelKey] || form.defaultModel;
      }
      const keysPayload: Record<string, string> = {};
      const typed = apiKeys[provider]?.trim();
      if (typed) keysPayload[provider] = typed;

      return api.saveSettings({
        settings: {
          ai,
          privacy: {
            strip_exif: stripExif,
            send_reduced_only: sendReducedOnly,
            never_send_originals: neverSendOriginals,
          },
        },
        apiKeys: keysPayload,
      });
    },
    onSuccess: () => {
      savedToast();
      setApiKeys((prev) => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['provider-models'] });
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const indexLib = useMutation({
    mutationFn: (mode: 'differential' | 'full') => api.indexLibrary({ mode }),
    onSuccess: () => { toast.success(toastT('scanQueuedBackground')); kickJobPump(); void qc.invalidateQueries({ queryKey: ['library-scan', 'index'] }); },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const rerunSetup = useMutation({
    mutationFn: () =>
      api.saveSettings({
        settings: {
          setup: { completed: false, version: 0 },
        },
      }),
    onSuccess: () => {
      setRerunSetupConfirm(false);
      if (window.FRKT_BOOT) {
        window.FRKT_BOOT.setupCompleted = false;
      }
      window.dispatchEvent(new Event('frkt:rerun-setup'));
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const saveUninstallMode = useMutation({
    mutationFn: (mode: 'keep' | 'delete') => api.saveSettings({ uninstallMode: mode }),
    onSuccess: (_data, mode) => {
      setUninstallMode(mode);
      savedToast();
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const test = useMutation({
    mutationFn: () => api.testProvider(provider),
    onSuccess: (r) => (r.ok ? toast.success(r.message) : toast.error(r.message)),
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  if (isLoading) return <div className="frkt-state">{t('loading')}</div>;

  if (isError) {
    return (
      <div className="frkt-state frkt-state--error">
        <p>{(error as Error).message || t('failedLoadSettings')}</p>
        <button type="button" className="button" onClick={() => refetch()}>
          {t('retry')}
        </button>
      </div>
    );
  }

  const providers = data?.providers || [];
  const selectedProvider = providers.find((p) => p.id === provider);
  const providerForm = PROVIDER_FORMS[provider];
  const modelOptions = catalog.data?.items ?? providerForm?.models ?? [];
  const modelValue = providerForm
    ? models[providerForm.modelKey] ?? providerForm.defaultModel
    : '';

  const customModel = Boolean(customModelProviders[provider]) || !modelOptions.some((m) => m.id === modelValue);
  const filteredModels = modelOptions.filter((m) => m.id === modelValue || `${m.label} ${m.id}`.toLowerCase().includes(modelSearch.toLowerCase()));
  const activeTab = SETTINGS_TABS.find((item) => item.id === tab) ?? SETTINGS_TABS[0];
  const activeTabLabel = tab === 'languages' ? t('languagesTitle') : t(activeTab.labelKey);

  return (
    <div className="frkt-settings">
      <nav
        className="frkt-tabs frkt-settings__tabs"
        role="tablist"
        aria-label={t('settingsSections')}
        onKeyDown={(event) => handleTablistKey(
          event,
          SETTINGS_TABS.map((item) => item.id),
          tab,
          (next) => {
            setTab(next);
            const base = window.location.hash.split('?')[0] || '#settings';
            window.location.hash = next === 'appearance' ? base : `${base}?tab=${next}`;
          },
          (next) => `frkt-settings-tab-${next}`
        )}
      >
        {SETTINGS_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`frkt-settings-tab-${item.id}`}
            aria-controls={`frkt-settings-panel-${item.id}`}
            aria-selected={tab === item.id}
            tabIndex={tab === item.id ? 0 : -1}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => {
              setTab(item.id);
              const base = window.location.hash.split('?')[0] || '#settings';
              window.location.hash = item.id === 'appearance' ? base : `${base}?tab=${item.id}`;
            }}
          >
            <item.Icon {...iconProps} />
            {item.id === 'languages' ? t('languagesTitle') : t(item.labelKey)}
          </button>
        ))}
      </nav>

      <div
        className="frkt-settings__tab-panel"
        role="tabpanel"
        id={`frkt-settings-panel-${tab}`}
        aria-labelledby={`frkt-settings-tab-${tab}`}
        tabIndex={0}
      >
        <header className="frkt-settings__content-head">
          <h2>{activeTabLabel}</h2>
        </header>
        {tab === 'appearance' ? (
          <SettingsPanel
            description={t('appearanceDesc')}
            footer={
              <button
                type="button"
                className="button button-primary"
                onClick={() => saveAppearance.mutate()}
                disabled={saveAppearance.isPending}
              >
                {saveAppearance.isPending ? t('saving') : t('save')}
              </button>
            }
          >
            <div className="frkt-settings-fields frkt-settings-fields--half">
              <label className="frkt-field">
                <span>{t('mediaPerPage')}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(clampPerPage(Number(e.target.value)))}
                />
                <span className="frkt-field__hint">{t('perPageHint')}</span>
              </label>

              <label className="frkt-field">
                <span>{t('largeFileMb')}</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={largeFileMb}
                  onChange={(e) => setLargeFileMb(clampLargeFileMb(Number(e.target.value)))}
                />
                <span className="frkt-field__hint">{t('largeFileSettingsHint')}</span>
              </label>

              <label className="frkt-field">
                <span>{t('toolLanguage')}</span>
                <select value={uiLocale} onChange={(e) => setUiLocale(e.target.value)}>
                  {UI_LOCALE_OPTIONS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code === 'auto' ? t('followWordPress') : l.label}
                    </option>
                  ))}
                </select>
                <span className="frkt-field__hint">{t('toolLanguageHint')}</span>
              </label>

              <label className="frkt-field">
                <span>{t('theme')}</span>
                <ThemeSwitcher persist={false} />
                <span className="frkt-field__hint">{t('themeHint')}</span>
              </label>
            </div>


            {!isFreeBuild && isFeatureEnabled('white_label') ? (
              <WhiteLabelFields
                logoUrl={data?.whiteLabel?.logoUrl ?? ''}
                iconUrl={data?.whiteLabel?.iconUrl ?? ''}
              />
            ) : null}

            <div className="frkt-settings-fields">
              {!isFreeBuild ? (
                <label className="frkt-field">
                  <span>{t('mediaTabLabel')}</span>
                  <input
                    type="text"
                    maxLength={40}
                    value={mediaTabLabel}
                    spellCheck={false}
                    placeholder={t('mediaTabPlaceholder')}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, 40);
                      setMediaTabLabel(next);
                      applyAdminMenuLabel(next);
                    }}
                  />
                  <span className="frkt-field__hint">{t('mediaTabLabelHint')}</span>
                </label>
              ) : null}

              <label className="frkt-field">
                <span>{t('primaryColor')}</span>
                <div className="frkt-color-field">
                  <input
                    type="color"
                    value={normalizePrimaryColor(primaryColor)}
                    onChange={(e) => {
                      const next = normalizePrimaryColor(e.target.value);
                      setPrimaryColor(next);
                      applyPrimaryColor(next);
                    }}
                    aria-label={t('primaryColorPicker')}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    spellCheck={false}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      setPrimaryColor(raw.startsWith('#') ? raw.toUpperCase() : raw);
                      if (/^#[0-9A-Fa-f]{6}$/.test(raw)) applyPrimaryColor(raw);
                    }}
                    onBlur={() => {
                      const next = normalizePrimaryColor(primaryColor);
                      setPrimaryColor(next);
                      applyPrimaryColor(next);
                    }}
                    placeholder={DEFAULT_PRIMARY}
                    aria-label={t('primaryColorHex')}
                  />
                  <button
                    type="button"
                    className="button-link"
                    onClick={() => {
                      setPrimaryColor(DEFAULT_PRIMARY);
                      applyPrimaryColor(DEFAULT_PRIMARY);
                    }}
                  >
                    {t('reset')}
                  </button>
                </div>
                <span className="frkt-field__hint">{t('accentHint')}</span>
              </label>
            </div>
          </SettingsPanel>
        ) : null}

        {tab === 'configuration' ? (
          <SettingsPanel
            description={t('configurationDesc')}
            footer={
              <button
                type="button"
                className="button button-primary"
                onClick={() => saveConfiguration.mutate()}
                disabled={saveConfiguration.isPending}
              >
                {saveConfiguration.isPending ? t('saving') : t('save')}
              </button>
            }
          >
            <section className="frkt-settings-section frkt-settings-section--no-border" aria-labelledby="frkt-resize-presets-title">
              <header className="frkt-settings-section__head">
                <h3 id="frkt-resize-presets-title">{t('resizePresetsTitle')}</h3>
                <p>{t('resizePresetsHint')}</p>
              </header>
              <div className="frkt-resize-settings">
                {resizePresets.map((preset, index) => (
                  <div className="frkt-resize-settings__row" key={preset.id}>
                    <label className="frkt-field">
                      <span>{t('presetLabel')}</span>
                      <input
                        type="text"
                        maxLength={20}
                        value={preset.label}
                        onChange={(event) => setResizePresets((current) => current.map((item, i) =>
                          i === index ? { ...item, label: event.target.value } : item
                        ))}
                      />
                    </label>
                    <label className="frkt-field">
                      <span>{t('presetType')}</span>
                      <select
                        value={preset.scale !== undefined ? 'percent' : 'width'}
                        onChange={(event) => setResizePresets((current) => current.map((item, i) => {
                          if (i !== index) return item;
                          return event.target.value === 'percent'
                            ? { id: item.id, label: item.label, scale: Math.min(0.99, Math.max(0.01, (item.width || 50) / 100)) }
                            : { id: item.id, label: item.label, width: item.width || Math.round((item.scale || 0.5) * 100) };
                        }))}
                      >
                        <option value="width">{t('presetWidth')}</option>
                        <option value="percent">{t('presetPercent')}</option>
                      </select>
                    </label>
                    <label className="frkt-field">
                      <span>{preset.scale !== undefined ? t('presetPercentValue') : t('presetWidthValue')}</span>
                      <input
                        type="number"
                        min={preset.scale !== undefined ? 1 : 16}
                        max={preset.scale !== undefined ? 99 : 10000}
                        value={preset.scale !== undefined ? Math.round(preset.scale * 100) : preset.width || ''}
                        onChange={(event) => {
                          const value = Math.max(1, Number(event.target.value) || 1);
                          setResizePresets((current) => current.map((item, i) => i !== index ? item :
                            item.scale !== undefined
                              ? { ...item, scale: Math.min(0.99, value / 100) }
                              : { ...item, width: Math.min(10000, Math.max(16, value)) }
                          ));
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="frkt-icon-button frkt-resize-settings__remove"
                      aria-label={t('removePreset')}
                      title={t('removePreset')}
                      disabled={resizePresets.length <= 1}
                      onClick={() => setResizePresets((current) => current.filter((_, i) => i !== index))}
                    >
                      <Trash2 {...iconProps} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button button-primary frkt-resize-settings__add"
                  disabled={resizePresets.length >= 8}
                  onClick={() => setResizePresets((current) => [...current, {
                    id: `custom-${Date.now()}`, label: t('newPreset'), width: 640,
                  }])}
                >
                  {t('addPreset')}
                </button>
              </div>
            </section>

            {!isFreeBuild && isFeatureEnabled('folder_colors') ? (
              <section className="frkt-settings-section" aria-labelledby="frkt-folder-palette-title">
                <header className="frkt-settings-section__head">
                  <h3 id="frkt-folder-palette-title">{t('folderPaletteTitle')}</h3>
                  <p>{t('folderPaletteHint')}</p>
                </header>
                <div className="frkt-folder-palette-settings">
                  {folderColorPalette.map((color, index) => (
                    <div className="frkt-folder-palette-settings__item" key={`${index}-${color}`}>
                      <input
                        type="color"
                        value={color}
                        aria-label={t('paletteColor', { index: index + 1 })}
                        onChange={(event) => setFolderColorPalette((current) => current.map((item, i) => i === index ? event.target.value : item))}
                      />
                      <input
                        type="text"
                        className="frkt-folder-palette-settings__hex"
                        defaultValue={color.toUpperCase()}
                        aria-label={`${t('paletteColor', { index: index + 1 })} HEX`}
                        maxLength={7}
                        spellCheck={false}
                        onChange={(event) => {
                          const next = event.target.value.trim();
                          if (/^#[0-9a-fA-F]{6}$/.test(next)) {
                            setFolderColorPalette((current) => current.map((item, i) => i === index ? next.toLowerCase() : item));
                          }
                        }}
                        onBlur={(event) => {
                          const next = event.target.value.trim();
                          if (!/^#[0-9a-fA-F]{6}$/.test(next)) {
                            event.currentTarget.value = color.toUpperCase();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="frkt-icon-button frkt-folder-palette-settings__remove"
                        aria-label={t('removePaletteColor')}
                        title={t('removePaletteColor')}
                        disabled={folderColorPalette.length <= 1}
                        onClick={() => setFolderColorPalette((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 {...iconProps} />
                      </button>
                    </div>
                  ))}
                  <div className="frkt-folder-palette-settings__actions">
                    <button
                      type="button"
                      className="button button-primary frkt-folder-palette-settings__add"
                      disabled={folderColorPalette.length >= 24}
                      onClick={() => setFolderColorPalette((current) => [...current, DEFAULT_PRIMARY])}
                    >
                      {t('addPaletteColor')}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}
          </SettingsPanel>
        ) : null}

        {tab === 'languages' ? (
          <SettingsPanel
            description={t('languagesDescription')}
            footer={
              <button
                type="button"
                className="button button-primary"
                onClick={() => saveLanguages.mutate()}
                disabled={saveLanguages.isPending}
              >
                {saveLanguages.isPending ? t('saving') : t('save')}
              </button>
            }
          >
            <div className="frkt-settings-fields frkt-settings-fields--half">
              <label className="frkt-field">
                <span>{t('defaultLanguage')}</span>
                <select
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                >
                  {LOCALE_OPTIONS.filter((l) => enabledLocales.includes(l.code)).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native} — {l.label}
                    </option>
                  ))}
                </select>
                <span className="frkt-field__hint">{t('defaultLanguageHint')}</span>
              </label>
            </div>

            <fieldset className="frkt-field frkt-field--checkboxes">
              <legend>{t('enabledLanguages')}</legend>
              <div className="frkt-lang-list frkt-settings__lang-scroll">
                {LOCALE_OPTIONS.map((l) => {
                  const checked = enabledLocales.includes(l.code);
                  const locked = l.code === defaultLocale;
                  return (
                    <label key={l.code} className="frkt-check frkt-lang-option">
                      <span className="frkt-check__box">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => {
                            setEnabledLocales((prev) => {
                              if (prev.includes(l.code)) {
                                if (prev.length <= 1 || l.code === defaultLocale) return prev;
                                return prev.filter((c) => c !== l.code);
                              }
                              return [...prev, l.code];
                            });
                          }}
                        />
                        <span className="frkt-check__mark" aria-hidden="true" />
                      </span>
                      <span>
                        {l.native}
                        <span className="frkt-muted">
                          {' '}
                          ({l.label} · {l.code})
                        </span>
                        {locked ? <span className="frkt-muted"> — {t('defaultLocked')}</span> : null}
                      </span>
                    </label>
                  );
                })}
              </div>
              <span className="frkt-field__hint">{t('enabledLanguagesHint')}</span>
            </fieldset>
          </SettingsPanel>
        ) : null}

        {!isFreeBuild && tab === 'ai' ? (
          <SettingsPanel
            description={t('byokDesc')}
            footer={
              <div className="frkt-settings-panel__footer-row">
                <button
                  type="button"
                  className="button"
                  onClick={() => test.mutate()}
                  disabled={!provider || test.isPending || saveProvider.isPending}
                >
                  {test.isPending ? t('testing') : t('testProvider')}
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => saveProvider.mutate()}
                  disabled={!provider || saveProvider.isPending}
                >
                  {saveProvider.isPending ? t('saving') : t('save')}
                </button>
              </div>
            }
          >
            <label className="frkt-field">
              <span>{t('defaultProvider')}</span>
              <select
                value={provider}
                onChange={(e) => { setProvider(e.target.value); setModelSearch(''); }}
                disabled={!providers.length || !provider}
              >
                {!provider && <option value="">{t('selectProvider')}</option>}
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {p.configured ? ` ${t('configuredSuffix')}` : ''}
                  </option>
                ))}
              </select>
              <span className="frkt-field__hint">{t('providerUsedFor')}</span>
            </label>

            {providerForm ? (
              <>
                <div className="frkt-field">
                  <label htmlFor="frkt-ai-model">{t('providerModel', { name: selectedProvider?.label || t('provider') })}</label>
                  <input
                    type="search"
                    value={modelSearch}
                    placeholder={t('providerModelSearch')}
                    aria-label={t('providerModelSearch')}
                    onChange={(e) => setModelSearch(e.target.value)}
                  />
                  <select
                    id="frkt-ai-model"
                    value={customModel ? '__custom__' : modelValue}
                    aria-describedby="frkt-ai-model-hint frkt-ai-model-status"
                    onChange={(e) => {
                      const custom = e.target.value === '__custom__';
                      setCustomModelProviders((prev) => ({ ...prev, [provider]: custom }));
                      if (!custom) setModels((prev) => ({ ...prev, [providerForm.modelKey]: e.target.value }));
                    }}
                  >
                    {filteredModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.recommended ? `${m.label} ${t('recommendedSuffix')}` : m.label}</option>
                    ))}
                    <option value="__custom__">{t('providerModelCustom')}</option>
                  </select>
                  {customModel ? (
                    <input
                      value={modelValue}
                      maxLength={200}
                      autoComplete="off"
                      aria-label={t('providerModelCustom')}
                      onChange={(e) => setModels((prev) => ({ ...prev, [providerForm.modelKey]: e.target.value.trim() }))}
                    />
                  ) : null}
                  <span id="frkt-ai-model-hint" className="frkt-field__hint">{t('providerModelsHint')}</span>
                  <span id="frkt-ai-model-status" className="frkt-field__hint" role="status">
                    {catalog.isFetching ? t('loading') : t(catalog.data?.source === 'live' ? 'providerModelsLive' : 'providerModelsFallback', { count: modelOptions.length })}
                  </span>
                  <button type="button" className="button button-primary frkt-provider-models__refresh" disabled={catalog.isFetching || refreshModels.isPending} onClick={() => refreshModels.mutate(provider)}>
                    {refreshModels.isPending ? t('loading') : t('providerModelsRefresh')}
                  </button>
                </div>
                <div className="frkt-field">
                  <label htmlFor={`frkt-api-key-${provider}`}>
                    {t('providerApiKey', { name: selectedProvider?.label || t('provider') })}
                    {selectedProvider?.configured ? ` ${t('savedSuffix')}` : ''}
                  </label>
                  <SecretInput
                    id={`frkt-api-key-${provider}`}
                    value={apiKeys[provider] || ''}
                    onChange={(v) => setApiKeys((prev) => ({ ...prev, [provider]: v }))}
                    placeholder={
                      selectedProvider?.configured
                        ? t('keepKeyPlaceholder')
                        : providerForm.keyPlaceholder
                    }
                    canReveal={Boolean(selectedProvider?.configured)}
                    onReveal={async () => {
                      try {
                        const res = await api.revealProviderSecret(provider);
                        return res.apiKey || '';
                      } catch (e) {
                        toast.error(toastError('toastGenericError', e as Error));
                        throw e;
                      }
                    }}
                  />
                  <span className="frkt-field__hint">{t('providerKeyHint')}</span>
                </div>
              </>
            ) : (
              <p className="frkt-muted">{t('chooseProviderHint')}</p>
            )}

            <label className="frkt-field">
              <span>{t('textGenInstructions')}</span>
              <textarea
                rows={5}
                maxLength={2000}
                value={generationInstructions}
                onChange={(e) => setGenerationInstructions(e.target.value.slice(0, 2000))}
                placeholder={t('textGenPlaceholder')}
              />
              <span className="frkt-field__hint">
                {t('textGenHint')} {generationInstructions.length}/2000
              </span>
            </label>

            <section className="frkt-settings-section" aria-labelledby="frkt-ai-privacy-title">
              <header className="frkt-settings-section__head">
                <h3 id="frkt-ai-privacy-title">{t('privacyTitle')}</h3>
                <p>{t('privacyDescription')}</p>
              </header>
              <div className="frkt-setup__checks">
                <label className="frkt-check">
                  <span className="frkt-check__box">
                    <input
                      type="checkbox"
                      checked={stripExif}
                      onChange={(e) => setStripExif(e.target.checked)}
                    />
                    <span className="frkt-check__mark" aria-hidden="true" />
                  </span>
                  <span className="frkt-check__text">
                    <span className="frkt-check__label">{t('privacyStripExif')}</span>
                    <span className="frkt-check__desc frkt-muted">{t('privacyStripExifDesc')}</span>
                  </span>
                </label>
                <label className="frkt-check">
                  <span className="frkt-check__box">
                    <input
                      type="checkbox"
                      checked={sendReducedOnly}
                      onChange={(e) => setSendReducedOnly(e.target.checked)}
                    />
                    <span className="frkt-check__mark" aria-hidden="true" />
                  </span>
                  <span className="frkt-check__text">
                    <span className="frkt-check__label">{t('privacySendReduced')}</span>
                    <span className="frkt-check__desc frkt-muted">{t('privacySendReducedDesc')}</span>
                  </span>
                </label>
                <label className="frkt-check">
                  <span className="frkt-check__box">
                    <input
                      type="checkbox"
                      checked={neverSendOriginals}
                      onChange={(e) => setNeverSendOriginals(e.target.checked)}
                    />
                    <span className="frkt-check__mark" aria-hidden="true" />
                  </span>
                  <span className="frkt-check__text">
                    <span className="frkt-check__label">{t('privacyNeverOriginals')}</span>
                    <span className="frkt-check__desc frkt-muted">{t('privacyNeverOriginalsDesc')}</span>
                  </span>
                </label>
              </div>
            </section>
          </SettingsPanel>
        ) : null}

        {!isFreeBuild && tab === 'license' ? (
          <SettingsPanel
            description={
              licenseLocked ? t('licenseLockedDescription') : t('licenseDescription')
            }
            footer={
              licenseLocked ? null : (
              <div className="frkt-settings-panel__footer-row">
                {licenseQuery.data?.active ? (
                  <button
                    type="button"
                    className="button"
                    onClick={() => deactivateLicense.mutate()}
                    disabled={deactivateLicense.isPending}
                  >
                    {t('licenseDeactivate')}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => activateLicense.mutate()}
                  disabled={activateLicense.isPending || !licenseKey.trim()}
                >
                  {activateLicense.isPending ? t('licenseActivating') : t('licenseActivate')}
                </button>
              </div>
              )
            }
          >
            <div className="frkt-license-status">
              <strong>
                {licenseQuery.data?.active
                  ? t('licenseStatusActive')
                  : licenseQuery.data?.status === 'invalid'
                    ? t('licenseStatusInvalid')
                    : t('licenseStatusInactive')}
              </strong>
              {licenseQuery.data?.maskedCode ? (
                <p className="frkt-muted">{licenseQuery.data.maskedCode}</p>
              ) : null}
              {licenseQuery.data?.planLabel || licenseQuery.data?.plan ? (
                <p className="frkt-muted">
                  {t('licensePlan')}: {licenseQuery.data.planLabel || licenseQuery.data.plan}
                </p>
              ) : null}
              {licenseQuery.data?.expiresAt ? (
                <p className="frkt-muted">
                  {t('licenseExpires')}: {licenseQuery.data.expiresAt}
                </p>
              ) : null}
              {licenseQuery.data?.active && !licenseLocked ? (
                <p className="frkt-muted">
                  {t('licenseSites')}: {licenseQuery.data.sitesUsed ?? 0}
                  {' / '}
                  {(licenseQuery.data.sitesMax ?? 0) > 0
                    ? licenseQuery.data.sitesMax
                    : '∞'}
                </p>
              ) : null}
              {licenseQuery.data?.message && !licenseLocked ? (
                <p className="frkt-muted">{licenseQuery.data.message}</p>
              ) : null}
              {licenseQuery.data?.domain ? (
                <p className="frkt-muted">
                  {t('licenseDomain')}: {licenseQuery.data.domain}
                </p>
              ) : null}
            </div>
            {licenseLocked ? null : (
            <>
            <label className="frkt-field">
              <span>{t('licenseKey')}</span>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="FRKT-XXXX-XXXX-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="frkt-field__hint">{t('licenseKeyHint')}</span>
            </label>
            <div className="frkt-license-links">
              <a
                className="button button-primary"
                href={licenseQuery.data?.buyUrl || 'https://foldrocket.com/#pricing'}
                target="_blank"
                rel="noreferrer"
              >
                {t('licenseBuyCta')}
              </a>
              <a
                className="button"
                href={
                  licenseQuery.data?.accountUrl ||
                  'https://foldrocket.com/account/'
                }
                target="_blank"
                rel="noreferrer"
              >
                {t('licenseWhereCode')}
              </a>
            </div>
            </>
            )}
          </SettingsPanel>
        ) : null}

        {tab === 'import' ? <FolderImportPanel /> : null}

        {tab === 'maintenance' ? (
          <SettingsPanel description={t('indexToolsDesc')}>
            <div className="frkt-settings-tools">
              <div className="frkt-settings-tool">
                <div>
                  <strong>{t('scanLibrary')}</strong>
                  <p className="frkt-muted">{t('scanBackgroundHint')}</p>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => indexLib.mutate('differential')}
                  disabled={indexLib.isPending || indexScan.active}
                >
                  {t('scanLibrary')}
                </button>
              </div>
              <div className="frkt-settings-tool">
                <div>
                  <strong>{t('indexLibrary')}</strong>
                  <p className="frkt-muted">{t('indexLibraryDesc')}</p>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => indexLib.mutate('full')}
                  disabled={indexLib.isPending || indexScan.active}
                >
                  {t('indexLibrary')}
                </button>
              </div>
              <div className="frkt-settings-tool">
                <div>
                  <strong>{t('relaunchWizard')}</strong>
                  <p className="frkt-muted">
                    {isFreeBuild
                      ? t('relaunchShort')
                      : t('relaunchWizardHint')}
                  </p>
                </div>
                <button
                  type="button"
                  className="button"
                  onClick={() => setRerunSetupConfirm(true)}
                  disabled={rerunSetup.isPending}
                >
                  {t('relaunchWizard')}
                </button>
              </div>
              <div className="frkt-settings-tool">
                <div>
                  <strong>{t('uninstallDataLabel')}</strong>
                  <p className="frkt-muted">{t('uninstallHint')}</p>
                </div>
                <fieldset
                  className="frkt-settings-tool__radios"
                  aria-label={t('uninstallDataLabel')}
                  disabled={saveUninstallMode.isPending}
                >
                  <label>
                    <input
                      type="radio"
                      name="frkt-uninstall-mode"
                      value="keep"
                      checked={uninstallMode === 'keep'}
                      onChange={() => saveUninstallMode.mutate('keep')}
                    />
                    <span>{t('uninstallKeep')}</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="frkt-uninstall-mode"
                      value="delete"
                      checked={uninstallMode === 'delete'}
                      onChange={() => saveUninstallMode.mutate('delete')}
                    />
                    <span>{t('uninstallDelete')}</span>
                  </label>
                </fieldset>
              </div>
            </div>
          </SettingsPanel>
        ) : null}
      </div>

      <ConfirmModal
        open={rerunSetupConfirm}
        onClose={() => setRerunSetupConfirm(false)}
        onConfirm={() => rerunSetup.mutate()}
        title={t('relaunchWizardConfirmTitle')}
        confirmLabel={rerunSetup.isPending ? t('loading') : t('relaunchWizard')}
        busy={rerunSetup.isPending}
      >
        <p>{t('relaunchWizardConfirmBody')}</p>
      </ConfirmModal>
    </div>
  );
}
