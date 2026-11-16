import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import { CheckboxFilterMenu } from './CheckboxFilterMenu';
import { FILE_TYPE_OPTIONS, mimeFilterLabel } from './fileTypes';

export function FileTypeFilter() {
  const { t } = useI18n();
  const mimeFilter = useUiStore((s) => s.mimeFilter);
  const setMimeFilter = useUiStore((s) => s.setMimeFilter);
  const toggleMimeFilter = useUiStore((s) => s.toggleMimeFilter);

  return (
    <CheckboxFilterMenu
      emptyLabel={t('fileType')}
      buttonLabel={mimeFilterLabel(mimeFilter, t)}
      ariaLabel={t('fileType')}
      options={FILE_TYPE_OPTIONS.map((opt) =>
        opt.id === 'other' ? { ...opt, label: t('otherType') } : opt
      )}
      selected={mimeFilter}
      onToggle={toggleMimeFilter}
      onClear={() => setMimeFilter([])}
    />
  );
}
