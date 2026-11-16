import { Monitor, Moon, Sun } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { useI18n } from '../i18n';
import { iconPropsSm } from '../ui/icons';
import { resolveEffectiveTheme, useThemeStore, type ThemePreference } from '../theme/theme';

const OPTIONS: {
  id: ThemePreference;
  Icon: typeof Sun;
  labelKey: 'themeLight' | 'themeDark' | 'themeSystem';
}[] = [
  { id: 'light', Icon: Sun, labelKey: 'themeLight' },
  { id: 'dark', Icon: Moon, labelKey: 'themeDark' },
  { id: 'system', Icon: Monitor, labelKey: 'themeSystem' },
];

export function ThemeSwitcher({
  className = '',
  persist = true,
  includeSystem = true,
  single = false,
}: {
  className?: string;
  /** Persist to settings via REST (topbar). Settings page sets false and saves with appearance. */
  persist?: boolean;
  /** Keep the topbar control compact while retaining System in full appearance settings. */
  includeSystem?: boolean;
  /** Render one icon that reflects the effective theme and toggles to the opposite theme. */
  single?: boolean;
}) {
  const { t } = useI18n();
  const theme = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const activeTheme = includeSystem ? theme : resolveEffectiveTheme(theme);

  const save = useMutation({
    mutationFn: (next: ThemePreference) =>
      api.saveSettings({
        settings: {
          general: { theme: next },
        },
      }),
  });

  const select = (next: ThemePreference) => {
    setPreference(next);
    if (persist) save.mutate(next);
  };

  if (single) {
    const effectiveTheme = resolveEffectiveTheme(theme);
    const isDark = effectiveTheme === 'dark';
    const Icon = isDark ? Moon : Sun;
    const currentLabel = t(isDark ? 'themeDark' : 'themeLight');
    const nextTheme: ThemePreference = isDark ? 'light' : 'dark';

    return (
      <button
        type="button"
        className={className}
        aria-label={`${t('theme')}: ${currentLabel}`}
        data-tooltip={currentLabel}
        onClick={() => select(nextTheme)}
      >
        <Icon {...iconPropsSm} />
      </button>
    );
  }

  return (
    <div className={`frkt-theme-switch ${className}`.trim()} role="group" aria-label={t('theme')}>
      {OPTIONS.filter(({ id }) => includeSystem || id !== 'system').map(({ id, Icon, labelKey }) => (
        <button
          key={id}
          type="button"
          className={activeTheme === id ? 'is-active' : ''}
          aria-pressed={activeTheme === id}
          aria-label={t(labelKey)}
          title={t(labelKey)}
          onClick={() => select(id)}
        >
          <Icon {...iconPropsSm} />
        </button>
      ))}
    </div>
  );
}
