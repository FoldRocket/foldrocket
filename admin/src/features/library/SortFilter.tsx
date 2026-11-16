import { useI18n } from '../../i18n';
import { useUiStore } from '../../stores/ui';
import type { MessageKey } from '../../i18n/catalogs';

const OPTIONS: [string, MessageKey][] = [
  ['default:DESC', 'orderDefault'],
  ['date:DESC', 'orderNewest'],
  ['date:ASC', 'orderOldest'],
  ['title:ASC', 'orderTitleAsc'],
  ['title:DESC', 'orderTitleDesc'],
  ['size:DESC', 'orderLargest'],
  ['size:ASC', 'orderSmallest'],
  ['usage:DESC', 'orderMostUsed'],
  ['usage:ASC', 'orderLeastUsed'],
];

export function SortFilter() {
  const { t } = useI18n();
  const { sortOrder, setSortOrder } = useUiStore();
  return (
    <label className="frkt-sort-filter">
      <select
        aria-label={t('orderBy')}
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
      >
        {OPTIONS.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
      </select>
    </label>
  );
}
