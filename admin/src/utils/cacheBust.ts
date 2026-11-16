/** Append a cache-busting query param so browsers reload updated media files. */
export function withCacheBust(url: string | null | undefined, token: string | number): string {
  if (!url) return '';
  const clean = url.split('#')[0];
  const sep = clean.includes('?') ? '&' : '?';
  return `${clean}${sep}frkt=${encodeURIComponent(String(token))}`;
}

/** Cache-bust every URL candidate while preserving its width/density descriptor. */
export function withCacheBustSrcSet(srcSet: string | null | undefined, token: string | number): string {
  if (!srcSet) return '';
  return srcSet
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/);
      const url = parts.shift();
      if (!url) return '';
      return [withCacheBust(url, token), ...parts].join(' ');
    })
    .filter(Boolean)
    .join(', ');
}

/** Stable-ish revision from asset fields that change when the binary is rewritten. */
export function mediaRevisionToken(asset: {
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  optimizationStatus?: string | null;
} | null | undefined): string {
  if (!asset) return '0';
  const path = (asset.thumbnailUrl || asset.url || '').split('?')[0];
  return [
    asset.fileSize ?? 0,
    asset.width ?? 0,
    asset.height ?? 0,
    asset.mimeType ?? '',
    asset.optimizationStatus ?? '',
    path,
  ].join('-');
}
