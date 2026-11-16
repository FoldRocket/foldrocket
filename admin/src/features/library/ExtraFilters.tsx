import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';
import { useUiStore } from '../../stores/ui';
import { CheckboxFilterMenu } from './CheckboxFilterMenu';

const ORIENTATION_IDS = ['landscape', 'portrait', 'square'] as const;

function orientationKey(id: string): MessageKey {
  if (id === 'landscape') return 'landscape';
  if (id === 'portrait') return 'portrait';
  if (id === 'square') return 'square';
  return 'orientation';
}

export function OrientationFilter() {
  const { t } = useI18n();
  const orientationFilter = useUiStore((s) => s.orientationFilter);
  const setOrientationFilter = useUiStore((s) => s.setOrientationFilter);
  const toggleOrientationFilter = useUiStore((s) => s.toggleOrientationFilter);

  return (
    <CheckboxFilterMenu
      emptyLabel={t('orientation')}
      buttonLabel={
        !orientationFilter.length
          ? t('orientation')
          : orientationFilter.length === 1
            ? t(orientationKey(orientationFilter[0]))
            : t('orientationsCount', { count: orientationFilter.length })
      }
      ariaLabel={t('orientation')}
      options={ORIENTATION_IDS.map((id) => ({ id, label: t(orientationKey(id)) }))}
      selected={orientationFilter}
      onToggle={toggleOrientationFilter}
      onClear={() => setOrientationFilter([])}
    />
  );
}

export function AuthorFilter() {
  const { t } = useI18n();
  const authorFilter = useUiStore((s) => s.authorFilter);
  const setAuthorFilter = useUiStore((s) => s.setAuthorFilter);
  const toggleAuthorFilter = useUiStore((s) => s.toggleAuthorFilter);

  const authors = useQuery({
    queryKey: ['asset-authors'],
    queryFn: () => api.listAssetAuthors(),
    staleTime: 60_000,
  });

  const options = (authors.data?.items ?? []).map((a) => ({
    id: String(a.id),
    label: a.name,
  }));

  const names = new Map(options.map((o) => [o.id, o.label]));

  return (
    <CheckboxFilterMenu
      emptyLabel={t('author')}
      buttonLabel={
        !authorFilter.length
          ? t('author')
          : authorFilter.length === 1
            ? (names.get(authorFilter[0]) ?? t('userNumber', { id: authorFilter[0] }))
            : t('authorsCount', { count: authorFilter.length })
      }
      ariaLabel={t('author')}
      options={options}
      selected={authorFilter}
      onToggle={toggleAuthorFilter}
      onClear={() => setAuthorFilter([])}
    />
  );
}

/** Date range + Clear for any active library filter. */
export function ExtraFilters() {
  const { t } = useI18n();
  const {
    mimeFilter,
    flagsFilter,
    aiStatusFilter,
    orientationFilter,
    authorFilter,
    dateFromFilter,
    dateToFilter,
    setDateFromFilter,
    setDateToFilter,
    clearAllFilters,
  } = useUiStore();

  const active =
    mimeFilter.length > 0 ||
    flagsFilter.length > 0 ||
    aiStatusFilter.length > 0 ||
    orientationFilter.length > 0 ||
    authorFilter.length > 0 ||
    Boolean(dateFromFilter) ||
    Boolean(dateToFilter);

  return (
    <>
      <OrientationFilter />
      <AuthorFilter />

      <div className="frkt-toolbar__dates">
        <label className="frkt-toolbar__date-field">
          <span className="frkt-toolbar__date-label">{t('uploadedFrom')}</span>
          <input
            type="date"
            className="frkt-toolbar__date"
            value={dateFromFilter}
            max={dateToFilter || undefined}
            onChange={(e) => setDateFromFilter(e.target.value)}
            aria-label={t('uploadedFrom')}
            title={t('uploadedFrom')}
          />
        </label>
        <label className="frkt-toolbar__date-field">
          <span className="frkt-toolbar__date-label">{t('uploadedTo')}</span>
          <input
            type="date"
            className="frkt-toolbar__date"
            value={dateToFilter}
            min={dateFromFilter || undefined}
            onChange={(e) => setDateToFilter(e.target.value)}
            aria-label={t('uploadedTo')}
            title={t('uploadedTo')}
          />
        </label>
      </div>

      {active ? (
        <button type="button" className="button-link frkt-toolbar__clear-filters" onClick={clearAllFilters}>
          {t('clear')}
        </button>
      ) : null}
    </>
  );
}
