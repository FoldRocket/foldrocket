import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Lock, X } from 'lucide-react';
import { api, type FeatureItem } from '../../api/client';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/catalogs';
import { syncBootFeatures } from './useFeature';
import { toastError, toastT } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { InfoTip } from '../../ui/InfoTip';
import { iconProps } from '../../ui/icons';
import { isFreeBuild } from '../../edition';

const FEATURE_COPY: Record<string, { label: MessageKey; desc: MessageKey }> = {
  upload: { label: 'featUploadLabel', desc: 'featUploadDesc' },
  folders: { label: 'featFoldersLabel', desc: 'featFoldersDesc' },
  advanced_filters: { label: 'featFiltersLabel', desc: 'featFiltersDesc' },
  bulk_actions: { label: 'featBulkLabel', desc: 'featBulkDesc' },
  media_modal_search: { label: 'featModalLabel', desc: 'featModalDesc' },
  smart_views: { label: 'featSmartLabel', desc: 'featSmartDesc' },
  ai_analysis: { label: 'featAnalysisLabel', desc: 'featAnalysisDesc' },
  ai_metadata: { label: 'featMetaLabel', desc: 'featMetaDesc' },
  ai_image_edit: { label: 'featAiEditLabel', desc: 'featAiEditDesc' },
  bulk_alt: { label: 'featBulkAltLabel', desc: 'featBulkAltDesc' },
  multilingual: { label: 'featMultiLabel', desc: 'featMultiDesc' },
  duplicates: { label: 'featDupLabel', desc: 'featDupDesc' },
  unused_detection: { label: 'featUnusedLabel', desc: 'featUnusedDesc' },
  usage_detection: { label: 'featUsageLabel', desc: 'featUsageDesc' },
  health: { label: 'featHealthLabel', desc: 'featHealthDesc' },
  system: { label: 'featSystemLabel', desc: 'featSystemDesc' },
  optimize: { label: 'featOptimizeLabel', desc: 'featOptimizeDesc' },
  image_edit: { label: 'featEditLabel', desc: 'featEditDesc' },
  image_resize: { label: 'featResizeLabel', desc: 'featResizeDesc' },
  format_convert: { label: 'featConvertLabel', desc: 'featConvertDesc' },
  remove_background: { label: 'featRmbgLabel', desc: 'featRmbgDesc' },
  replace_file: { label: 'featReplaceLabel', desc: 'featReplaceDesc' },
  rename_file: { label: 'featRenameLabel', desc: 'featRenameDesc' },
  ai_rename_on_upload: { label: 'featAiRenameLabel', desc: 'featAiRenameDesc' },
  white_label: { label: 'featWhiteLabelLabel', desc: 'featWhiteLabelDesc' },
};

const CATEGORY_KEY: Record<string, MessageKey> = {
  library: 'catLibrary',
  search: 'catSearch',
  ai: 'catAi',
  insights: 'catInsights',
  system: 'catSystem',
  tools: 'catTools',
  integrations: 'catIntegrations',
};

function AvailabilityMark({ available, label, yes }: { available: boolean; label: string; yes: string }) {
  const Icon = available ? Check : X;
  return (
    <span
      className={`frkt-features__matrix-cell ${available ? 'is-available' : 'is-unavailable'}`}
      role="cell"
      data-label={label}
      title={label}
    >
      <Icon {...iconProps} size={17} />
      <span className="frkt-sr-only">{available ? yes : '—'}</span>
    </span>
  );
}

export function FeaturesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['features'],
    queryFn: () => api.getFeatures(),
  });

  const save = useMutation({
    mutationFn: (features: Record<string, boolean>) => api.saveFeatures(features),
    onSuccess: (res) => {
      syncBootFeatures(res.available ?? res.enabled, res.edition);
      qc.setQueryData(['features'], res);
      toast.success(toastT('toastFeaturesSaved'));
    },
    onError: (e: Error) => toast.error(toastError('toastFeaturesSaveFailed', e)),
  });

  const items = data?.items ?? [];
  const edition = data?.edition ?? 'free';
  const byCategory = items.reduce<Record<string, FeatureItem[]>>((acc, item) => {
    const key = item.category || 'other';
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  const categoryOrder = [
    'library',
    'search',
    'ai',
    'insights',
    'tools',
    'integrations',
    'system',
  ];

  const orderedCategories = [
    ...categoryOrder.filter((c) => byCategory[c]?.length),
    ...Object.keys(byCategory).filter((c) => !categoryOrder.includes(c)),
  ];

  const toggle = (item: FeatureItem, next: boolean) => {
    if (item.locked || save.isPending) return;
    save.mutate({ [item.id]: next });
  };

  if (isLoading) {
    return (
      <div className="frkt-page frkt-features">
        <p className="frkt-muted">{t('featuresLoading')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="frkt-page frkt-features">
        <div className="frkt-state">
          <h2>{t('featuresLoadFailed')}</h2>
          <p className="frkt-muted">{(error as Error)?.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="frkt-page frkt-features">
      {!isFreeBuild && edition === 'free' ? (
        <div className="frkt-page-head">
          <p className="frkt-features__edition-note">
            {t('featuresFreeNote')}{' '}
            <a href="https://foldrocket.com/#pricing" target="_blank" rel="noreferrer">
              {t('licenseBuyCta')}
            </a>
          </p>
        </div>
      ) : null}

      {orderedCategories.map((category) => (
        <section key={category} className="frkt-features__section frkt-table-block">
          <header className="frkt-features__section-head frkt-table-block__heading">
            <h3 className="frkt-features__category">
              {CATEGORY_KEY[category] ? t(CATEGORY_KEY[category]) : category}
            </h3>
          </header>
          <div className="frkt-features__table frkt-data-table" role="table">
            <div className="frkt-features__row frkt-features__row--head frkt-data-table__head" role="row">
              <span role="columnheader">{t('featuresColFeature')}</span>
              <span role="columnheader">{t('aiPowered')}</span>
              <span role="columnheader">{t('freeTier')}</span>
              <span role="columnheader">Pro</span>
              <span role="columnheader">{t('featuresColStatus')}</span>
            </div>
            {byCategory[category].map((item) => {
              const copy = FEATURE_COPY[item.id];
              const label = copy ? t(copy.label) : item.label;
              const description = copy ? t(copy.desc) : item.description;
              return (
              <div
                key={item.id}
                className={`frkt-features__row frkt-data-table__row${item.locked ? ' is-locked' : ''}`}
                role="row"
              >
                <div className="frkt-features__info" role="cell">
                  <div className="frkt-features__info-main">
                    <strong>{label}</strong>
                    <InfoTip text={description} />
                  </div>
                  {item.requiresPro && !item.entitled ? (
                    <p className="frkt-features__pro-hint">{t('proFeatureLocked')}</p>
                  ) : null}
                </div>
                <AvailabilityMark available={item.aiPowered} label={t('aiPowered')} yes={t('yes')} />
                <AvailabilityMark available={!item.requiresPro} label={t('freeTier')} yes={t('yes')} />
                <AvailabilityMark available label="Pro" yes={t('yes')} />
                <div className="frkt-features__toggle" role="cell" data-label={t('featuresColStatus')}>
                  {item.requiresPro && !item.entitled ? (
                    <span
                      className="frkt-features__locked-status"
                      title={t('proFeatureLocked')}
                      aria-label={t('proFeatureLocked')}
                    >
                      <Lock {...iconProps} size={14} aria-hidden="true" />
                    </span>
                  ) : (
                    <label className="frkt-switch">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        disabled={item.locked || save.isPending}
                        onChange={(e) => toggle(item, e.target.checked)}
                        aria-label={label}
                      />
                      <span className="frkt-switch__track" aria-hidden="true" />
                    </label>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
