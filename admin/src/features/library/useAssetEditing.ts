import { useEffect } from 'react';
import { useUiStore } from '../../stores/ui';
import type { MediaAsset } from '../../types';

/** Keep an asset visible and marked as loading while an inspector edit runs. */
export function useAssetEditing(asset: MediaAsset | null | undefined, busy: boolean) {
  const beginAssetEditing = useUiStore((state) => state.beginAssetEditing);
  const endAssetEditing = useUiStore((state) => state.endAssetEditing);
  const attachmentId = asset?.attachmentId ?? 0;

  useEffect(() => {
    if (!busy || !asset || attachmentId <= 0) return;
    beginAssetEditing(asset);
    return () => endAssetEditing(attachmentId);
  }, [attachmentId, beginAssetEditing, busy, endAssetEditing]);
}

/**
 * Keep the library card busy for the lifetime of an operation, independently
 * from the Inspector component that started it.
 */
export async function runWithAssetEditing<T>(
  asset: MediaAsset | null | undefined,
  operation: () => Promise<T>
): Promise<T> {
  if (!asset || asset.attachmentId <= 0) return operation();

  const { beginAssetEditing } = useUiStore.getState();
  beginAssetEditing(asset);
  try {
    return await operation();
  } finally {
    // Let mutation onSuccess hand the editing lease to refreshMediaAfterFileChange
    // before releasing this operation-level lease.
    globalThis.setTimeout(() => {
      useUiStore.getState().endAssetEditing(asset.attachmentId);
    }, 0);
  }
}
