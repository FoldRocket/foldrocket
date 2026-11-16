import modelCatalog from '../../../../src/Infrastructure/Providers/vision-models.json';
import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { UI_LOCALE_OPTIONS, applyBootI18n, normalizeUiLocale, type MessageKey } from '../../i18n/catalogs';
import { METADATA_LOCALES } from '../../i18n/locales';
import { applyPrimaryColor, DEFAULT_PRIMARY, normalizePrimaryColor } from '../../theme/primaryColor';
import { applyThemePreference, normalizeThemePreference, useThemeStore } from '../../theme/theme';
import { toastError } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { ThemeSwitcher } from '../../ui/ThemeSwitcher';
import { iconProps } from '../../ui/icons';
import { isFreeBuild } from '../../edition';
import { useBrandLogo } from '../settings/brand';

type StepId = 'welcome' | 'languages' | 'appearance' | 'library' | 'ai' | 'finish';

const STEPS: { id: StepId; titleKey: MessageKey }[] = [
  { id: 'welcome', titleKey: 'wizardWelcome' },
  { id: 'languages', titleKey: 'languagesTitle' },
  { id: 'appearance', titleKey: 'tabAppearance' },
  { id: 'library', titleKey: 'library' },
  { id: 'ai', titleKey: 'tabAi' },
  { id: 'finish', titleKey: 'wizardReady' },
].filter(
  (step): step is { id: StepId; titleKey: MessageKey } =>
    !isFreeBuild || step.id !== 'ai'
);

const PROVIDERS = [
  {
    id: 'openai',
    label: 'OpenAI',
    modelKey: 'openai_model',
    defaultModel: 'gpt-4o-mini',
    models: modelCatalog.openai,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    modelKey: 'gemini_model',
    defaultModel: 'gemini-2.5-flash',
    models: modelCatalog.gemini,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    modelKey: 'anthropic_model',
    defaultModel: 'claude-sonnet-4-5',
    models: modelCatalog.anthropic,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    modelKey: 'openrouter_model',
    defaultModel: 'openai/gpt-4o-mini',
    models: modelCatalog.openrouter,
  },
] as const;

function clampPerPage(n: number) {
  return Math.min(100, Math.max(1, Math.round(n) || 20));
}

function clampLargeFileMb(n: number) {
  return Math.min(500, Math.max(1, Math.round(n) || 2));
}

type SetupWizardProps = {
  onComplete: () => void;
};

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const { t } = useI18n();
  const brandLogo = useBrandLogo();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [enabledLocales, setEnabledLocales] = useState<string[]>(['en_US']);
  const [defaultLocale, setDefaultLocale] = useState('en_US');
  const [uiLocale, setUiLocale] = useState('auto');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [largeFileMb, setLargeFileMb] = useState(2);
  const [stripExif, setStripExif] = useState(true);
  const [sendReducedOnly, setSendReducedOnly] = useState(true);
  const [neverSendOriginals, setNeverSendOriginals] = useState(true);
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');

  const popular = useMemo(
    () =>
      METADATA_LOCALES.filter((l) =>
        ['en_US', 'en_GB', 'it_IT', 'de_DE', 'fr_FR', 'es_ES', 'pt_BR', 'nl_NL', 'pl_PL', 'ja', 'zh_CN'].includes(
          l.code
        )
      ),
    []
  );
  const others = useMemo(
    () => METADATA_LOCALES.filter((l) => !popular.some((p) => p.code === l.code)),
    [popular]
  );

  const finish = useMutation({
    mutationFn: async () => {
      const enabled = enabledLocales.includes(defaultLocale)
        ? enabledLocales
        : [defaultLocale, ...enabledLocales];

      const keysPayload: Record<string, string> = {};
      if (provider && apiKey.trim()) {
        keysPayload[provider] = apiKey.trim();
      }
      const providerConfig = PROVIDERS.find((item) => item.id === provider);

      await api.saveSettings({
        settings: {
          languages: {
            ui: uiLocale,
            default: defaultLocale,
            enabled,
          },
          general: {
            items_per_page: clampPerPage(itemsPerPage),
            large_file_mb: clampLargeFileMb(largeFileMb),
            primary_color: normalizePrimaryColor(primaryColor),
            theme: useThemeStore.getState().preference,
            default_view: 'grid',
          },
          ...(isFreeBuild
            ? {}
            : {
                privacy: {
                  strip_exif: stripExif,
                  send_reduced_only: sendReducedOnly,
                  never_send_originals: neverSendOriginals,
                },
                ai: provider && providerConfig
                  ? {
                      default_provider: provider,
                      [providerConfig.modelKey]: model || providerConfig.defaultModel,
                    }
                  : {},
              }),
          setup: {
            completed: true,
            version: 1,
            overview: 'pending',
          },
        },
        apiKeys: Object.keys(keysPayload).length ? keysPayload : undefined,
      });
    },
    onSuccess: () => {
      applyPrimaryColor(primaryColor);
      applyThemePreference(useThemeStore.getState().preference);
      if (window.FRKT_BOOT) {
        window.FRKT_BOOT.setupCompleted = true;
        window.FRKT_BOOT.overviewPending = true;
        window.FRKT_BOOT.primaryColor = normalizePrimaryColor(primaryColor);
        window.FRKT_BOOT.itemsPerPage = clampPerPage(itemsPerPage);
        window.FRKT_BOOT.largeFileMb = clampLargeFileMb(largeFileMb);
        window.FRKT_BOOT.uiLocaleSetting = uiLocale;
        if (uiLocale !== 'auto') {
          applyBootI18n(normalizeUiLocale(uiLocale));
        }
      }
      toast.success(t('setupComplete'));
      onComplete();
    },
    onError: (e: Error) => toast.error(toastError('toastGenericError', e)),
  });

  const themePreference = normalizeThemePreference(useThemeStore.getState().preference);
  const selectedProvider = PROVIDERS.find((item) => item.id === provider);
  const themeLabel =
    themePreference === 'light' ? t('themeLight') : themePreference === 'dark' ? t('themeDark') : t('themeSystem');

  const canNext = (() => {
    if (step.id === 'languages') {
      return enabledLocales.length > 0 && enabledLocales.includes(defaultLocale);
    }
    return true;
  })();

  const goNext = () => {
    if (stepIndex >= STEPS.length - 1) {
      finish.mutate();
      return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const toggleLocale = (code: string) => {
    setEnabledLocales((prev) => {
      if (prev.includes(code)) {
        if (code === defaultLocale || prev.length <= 1) return prev;
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  };

  return (
    <div className="frkt-setup">
      <div className="frkt-setup__card">
        <header className="frkt-setup__head">
          <div>
            <img
              className={`frkt-setup__logo${brandLogo ? ' is-custom' : ''}`}
              src={brandLogo || `${window.FRKT_BOOT.pluginUrl}assets/img/logo-frkt.svg`}
              alt={t('title')}
              width={114}
              height={30}
            />
            <span className="frkt-muted">{t('setupInitial')}</span>
          </div>
        </header>

        <ol className="frkt-setup__steps" aria-label={t('setupProgress')}>
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={
                i === stepIndex ? 'is-current' : i < stepIndex ? 'is-done' : undefined
              }
            >
              <span className="frkt-setup__step-dot" aria-hidden="true">
                {i < stepIndex ? <Check {...iconProps} size={12} /> : i + 1}
              </span>
              <span className="frkt-setup__step-label">{t(s.titleKey)}</span>
            </li>
          ))}
        </ol>

        <div className="frkt-setup__body">
          {step.id === 'welcome' ? (
            <div className="frkt-setup__welcome">
              <h1>{t('wizardWelcome')}</h1>
              <p>{t('wizardWelcomeBody')}</p>
              <ul>
                <li>{t('wizardBulletFolders')}</li>
                {isFreeBuild ? (
                  <li>{t('wizardBulletFree')}</li>
                ) : (
                  <>
                    <li>{t('wizardBulletAi')}</li>
                    <li>{t('wizardBulletPro')}</li>
                  </>
                )}
              </ul>
            </div>
          ) : null}

          {step.id === 'languages' ? (
            <div className="frkt-setup__panel">
              <h1>{t('metaLanguages')}</h1>
              <p className="frkt-muted">{t('metaLanguagesHint')}</p>

              <label className="frkt-field">
                <span>{t('defaultLanguageShort')}</span>
                <select
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                >
                  {METADATA_LOCALES.filter((l) => enabledLocales.includes(l.code)).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.native} — {l.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="frkt-field frkt-field--checkboxes">
                <legend>{t('popular')}</legend>
                <div className="frkt-lang-list frkt-setup__lang-grid">
                  {popular.map((l) => localeCheck(l, enabledLocales, defaultLocale, toggleLocale))}
                </div>
              </fieldset>

              <details className="frkt-setup__more-langs">
                <summary>{t('allLanguages', { count: others.length })}</summary>
                <div className="frkt-lang-list frkt-setup__lang-grid">
                  {others.map((l) => localeCheck(l, enabledLocales, defaultLocale, toggleLocale))}
                </div>
              </details>
            </div>
          ) : null}

          {step.id === 'appearance' ? (
            <div className="frkt-setup__panel">
              <h1>{t('tabAppearance')}</h1>
              <p className="frkt-muted">{t('appearanceHint')}</p>

              <label className="frkt-field">
                <span>{t('interfaceLanguage')}</span>
                <select value={uiLocale} onChange={(e) => setUiLocale(e.target.value)}>
                  {UI_LOCALE_OPTIONS.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code === 'auto' ? t('followWordPress') : l.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="frkt-field">
                <span>{t('theme')}</span>
                <ThemeSwitcher persist={false} />
              </div>

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
              </label>
            </div>
          ) : null}

          {step.id === 'library' ? (
            <div className="frkt-setup__panel">
              <h1>{t('libraryDefaults')}</h1>
              <p className="frkt-muted">{t('libraryDefaultsHint')}</p>

              <label className="frkt-field">
                <span>{t('itemsPerPage')}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(clampPerPage(Number(e.target.value)))}
                />
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
                <span className="frkt-field__hint">
                  {isFreeBuild ? t('largeFileHintFree') : t('largeFileHintPro')}
                </span>
              </label>

            </div>
          ) : null}

          {step.id === 'ai' ? (
            <div className="frkt-setup__panel">
              <h1>{t('aiProviderOptional')}</h1>
              <p className="frkt-muted">{t('aiProviderOptionalHint')}</p>

              <label className="frkt-field">
                <span>{t('provider')}</span>
                <select
                  value={provider}
                  onChange={(e) => {
                    const nextProvider = e.target.value;
                    const config = PROVIDERS.find((item) => item.id === nextProvider);
                    setProvider(nextProvider);
                    setModel(config?.defaultModel ?? '');
                    setApiKey('');
                  }}
                >
                  <option value="">{t('skipForNow')}</option>
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              {selectedProvider ? (
                <label className="frkt-field">
                  <span>{t('providerModel', { name: selectedProvider.label })}</span>
                  <select value={model || selectedProvider.defaultModel} onChange={(e) => setModel(e.target.value)}>
                    {selectedProvider.models.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                        {'recommended' in option && option.recommended ? ` ${t('recommendedSuffix')}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="frkt-field__hint">{t('wizardModelHint')}</span>
                </label>
              ) : null}

              {provider ? (
                <label className="frkt-field">
                  <span>{t('apiKey')}</span>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t('pasteYourKey')}
                    autoComplete="off"
                  />
                </label>
              ) : null}

              <section className="frkt-setup__subsection">
                <h2>{t('privacyTitle')}</h2>
                <p className="frkt-muted">{t('wizardPrivacyHint')}</p>

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
                    <span>{t('privacyStripExif')}</span>
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
                    <span>{t('privacySendReduced')}</span>
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
                    <span>{t('privacyNeverOriginals')}</span>
                  </label>
                </div>
              </section>
            </div>
          ) : null}

          {step.id === 'finish' ? (
            <div className="frkt-setup__welcome">
              <h1>{t('wizardReady')}</h1>
              <p>{isFreeBuild ? t('wizardReadyBodyFree') : t('wizardReadyBody')}</p>
              <ul>
                <li>
                  {t('summaryDefaultLanguage', { value: defaultLocale })}
                </li>
                <li>
                  {t('summaryEnabledLanguages', { count: enabledLocales.length })}
                </li>
                <li>{t('summaryTheme', { value: themeLabel })}</li>
                <li>{t('summaryAi', {
                  value: selectedProvider
                    ? `${selectedProvider.label} · ${model || selectedProvider.defaultModel}`
                    : t('notConfiguredYet'),
                })}</li>
              </ul>
            </div>
          ) : null}
        </div>

        <footer className="frkt-setup__footer">
          <button
            type="button"
            className="button"
            disabled={stepIndex === 0 || finish.isPending}
            onClick={goBack}
          >
            <ChevronLeft {...iconProps} size={16} />
            {t('back')}
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!canNext || finish.isPending}
            onClick={goNext}
          >
            {finish.isPending
              ? t('saving')
              : stepIndex === STEPS.length - 1
                ? t('finishSetup')
                : t('continue')}
            {stepIndex < STEPS.length - 1 ? <ChevronRight {...iconProps} size={16} /> : null}
          </button>
        </footer>
      </div>
    </div>
  );
}

function localeCheck(
  l: { code: string; label: string; native: string },
  enabled: string[],
  defaultLocale: string,
  toggle: (code: string) => void
) {
  const checked = enabled.includes(l.code);
  const locked = l.code === defaultLocale;
  return (
    <label key={l.code} className="frkt-check frkt-lang-option">
      <span className="frkt-check__box">
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          onChange={() => toggle(l.code)}
        />
        <span className="frkt-check__mark" aria-hidden="true" />
      </span>
      <span>
        {l.native}
        <span className="frkt-muted"> ({l.code})</span>
      </span>
    </label>
  );
}
