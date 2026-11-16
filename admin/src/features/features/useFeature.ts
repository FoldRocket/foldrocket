/** Client-side feature gate — keep in sync with Domain\Features\FeatureRegistry. */

import { useSyncExternalStore } from 'react';

export type FeatureId =
  | 'library'
  | 'upload'
  | 'folders'
  | 'folder_import'
  | 'folder_colors'
  | 'advanced_filters'
  | 'smart_views'
  | 'bulk_actions'
  | 'download_zip'
  | 'ai_analysis'
  | 'ai_metadata'
  | 'ai_image_edit'
  | 'bulk_alt'
  | 'multilingual'
  | 'duplicates'
  | 'unused_detection'
  | 'usage_detection'
  | 'health'
  | 'system'
  | 'optimize'
  | 'image_edit'
  | 'image_resize'
  | 'format_convert'
  | 'remove_background'
  | 'replace_file'
  | 'rename_file'
  | 'ai_rename_on_upload'
  | 'white_label'
  | 'bricks_media_browser'
  | 'media_modal_search';

type FeatureMap = Partial<Record<string, boolean>>;

let version = 0;
const listeners = new Set<() => void>();

function emit(): void {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getVersion(): number {
  return version;
}

function bootFeatures(): FeatureMap {
  return (window.FRKT_BOOT?.features as FeatureMap | undefined) ?? {};
}

/**
 * True when the server explicitly exposes the feature as available.
 *
 * The Free package intentionally omits the Pro catalog, so Pro ids are absent
 * from FRKT_BOOT.features rather than present with a false value. Unknown
 * ids must therefore fail closed or the Free UI will mount Pro components and
 * call REST routes that do not ship in that package.
 */
export function isFeatureEnabled(id: FeatureId | string): boolean {
  const map = bootFeatures();
  if (!(id in map)) return id === 'library';
  return Boolean(map[id]);
}

/** Subscribe to feature-flag changes (after Features page saves). */
export function useFeatureEnabled(id: FeatureId | string): boolean {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return isFeatureEnabled(id);
}

/** Snapshot of all flags; re-renders when Features page saves. */
export function useFeaturesMap(): FeatureMap {
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return bootFeatures();
}

/** After PATCH /features, refresh boot map so UI gates update without reload. */
export function syncBootFeatures(
  available: Record<string, boolean>,
  edition?: 'free' | 'pro'
): void {
  if (!window.FRKT_BOOT) return;
  window.FRKT_BOOT.features = { ...available };
  if (edition) window.FRKT_BOOT.edition = edition;
  emit();
}
