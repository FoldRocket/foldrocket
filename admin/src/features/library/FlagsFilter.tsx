import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { CheckboxFilterMenu } from './CheckboxFilterMenu';
import { flagFilterLabel, flagFilterOptions, resolveLargeFileMb } from './fileTypes';

export function FlagsFilter() {
  const { t } = useI18n();
  const flagsFilter = useUiStore((s) => s.flagsFilter);
  const setFlagsFilter = useUiStore((s) => s.setFlagsFilter);
  const toggleFlagsFilter = useUiStore((s) => s.toggleFlagsFilter);

  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
    staleTime: 60_000,
  });

  const largeMb = resolveLargeFileMb(
    (settings.data?.settings as { general?: { large_file_mb?: number } } | undefined)?.general?.large_file_mb
  );

  return (
    <CheckboxFilterMenu
      emptyLabel={t('flags')}
      buttonLabel={flagFilterLabel(flagsFilter, largeMb, t)}
      ariaLabel={t('flags')}
      options={flagFilterOptions(largeMb, t)}
      selected={flagsFilter}
      onToggle={toggleFlagsFilter}
      onClear={() => setFlagsFilter([])}
    />
  );
}
