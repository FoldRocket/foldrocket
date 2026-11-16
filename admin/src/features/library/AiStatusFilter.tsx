import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';
import { useUiStore } from '../../stores/ui';
import { CheckboxFilterMenu } from './CheckboxFilterMenu';

const AI_STATUS_IDS = ['pending', 'analyzed'] as const;

function statusKey(id: string): MessageKey {
  if (id === 'pending') return 'notAnalyzed';
  if (id === 'analyzed') return 'analyzed';
  return 'aiStatus';
}

export function AiStatusFilter() {
  const { t } = useI18n();
  const aiStatusFilter = useUiStore((s) => s.aiStatusFilter);
  const setAiStatusFilter = useUiStore((s) => s.setAiStatusFilter);
  const toggleAiStatusFilter = useUiStore((s) => s.toggleAiStatusFilter);
  const options = AI_STATUS_IDS.map((id) => ({ id, label: t(statusKey(id)) }));
  const buttonLabel = !aiStatusFilter.length
    ? t('aiStatus')
    : aiStatusFilter.map((id) => t(statusKey(id))).join(', ');

  return (
    <CheckboxFilterMenu
      emptyLabel={t('aiStatus')}
      buttonLabel={buttonLabel}
      ariaLabel={t('aiStatus')}
      options={options}
      selected={aiStatusFilter}
      onToggle={toggleAiStatusFilter}
      onClear={() => setAiStatusFilter([])}
    />
  );
}
