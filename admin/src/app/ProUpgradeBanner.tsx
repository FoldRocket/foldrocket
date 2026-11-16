import { useI18n } from '../i18n';

const PRICING_URL = 'https://foldrocket.com/#pricing';

/** Top banner on the WordPress.org build. Links to plans; no license field. */
export function ProUpgradeBanner() {
  const { t } = useI18n();

  return (
    <div className="frkt-free-banner" role="region" aria-label={t('proUpgradeTitle')}>
      <div className="frkt-free-banner__copy">
        <strong>{t('proUpgradeTitle')}</strong>
        <span className="frkt-muted">{t('proUpgradeBody')}</span>
      </div>
      <div className="frkt-free-banner__actions">
        <a
          className="button frkt-free-banner__unlock"
          href={PRICING_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('licenseBuyCta')}
        </a>
      </div>
    </div>
  );
}
