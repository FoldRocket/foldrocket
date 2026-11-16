import { toastT } from '../i18n/toastMessages';
import { postFormData, request, restEndpoint, withTimeout } from './transport';
import type { FeatureItem, LicenseStatus } from './types';

export const settingsApi = {
  getSettings: () =>
    request<{
      settings: Record<string, unknown>;
      providers: Array<{ id: string; label: string; configured: boolean; kind?: string }>;
      featureFlags?: Record<string, boolean>;
      whiteLabel?: { logoUrl: string; iconUrl: string };
    }>('/settings'),
  uploadWhiteLabel: async (kind: 'logo' | 'icon', file: File) => {
    const body = new FormData();
    body.append('file', file, file.name || 'brand.png');
    body.append('kind', kind);
    return postFormData<{ logoUrl: string; iconUrl: string }>(
      restEndpoint('/settings/white-label'),
      body,
      toastT('whiteLabelUploadFailed')
    );
  },
  removeWhiteLabel: (kind: 'logo' | 'icon') =>
    request<{ logoUrl: string; iconUrl: string }>('/settings/white-label', {
      method: 'DELETE',
      data: { kind },
    }),
  saveSettings: (payload: {
    settings?: unknown;
    apiKeys?: Record<string, string>;
    uninstallMode?: string;
  }) => request('/settings', { method: 'PATCH', data: payload }),
  getFeatures: () =>
    request<{
      items: FeatureItem[];
      enabled: Record<string, boolean>;
      available: Record<string, boolean>;
      edition: 'free' | 'pro';
    }>('/features'),
  saveFeatures: (features: Record<string, boolean>) =>
    request<{
      items: FeatureItem[];
      enabled: Record<string, boolean>;
      available: Record<string, boolean>;
      edition: 'free' | 'pro';
    }>('/features', { method: 'PATCH', data: { features } }),
  getProviderModels: (provider: string, refresh = false) =>
    withTimeout(
      (signal) =>
        request<{
          items: Array<{ id: string; label: string; recommended?: boolean }>;
          source: 'live' | 'fallback';
        }>(`/providers/${encodeURIComponent(provider)}/models${refresh ? '?refresh=true' : ''}`, {
          signal,
        }),
      40_000,
      toastT('providerTestTimeout')
    ),
  testProvider: (provider: string) =>
    withTimeout(
      (signal) =>
        request<{ ok: boolean; message: string }>('/providers/test', {
          method: 'POST',
          data: { provider },
          signal,
        }),
      30_000,
      toastT('providerTestTimeout')
    ),
  revealProviderSecret: (provider: string) =>
    request<{ provider: string; apiKey: string }>(
      `/settings/secrets/${encodeURIComponent(provider)}`
    ),
  getLicense: () => request<LicenseStatus>('/license'),
  activateLicense: (licenseKey: string) =>
    withTimeout(
      (signal) =>
        request<LicenseStatus>('/license/activate', {
          method: 'POST',
          data: { licenseKey },
          signal,
        }),
      30_000,
      toastT('licenseTimeout')
    ),
  deactivateLicense: () =>
    request<LicenseStatus>('/license/deactivate', { method: 'POST' }),
};
