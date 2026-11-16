import { FileArchive, FileText, Film, Music } from 'lucide-react';
import { useState } from 'react';
import { iconPropsMd } from '../../ui/icons';
import { mediaRevisionToken, withCacheBust, withCacheBustSrcSet } from '../../utils/cacheBust';
import {
  assetPosterUrl,
  formatFileLabel,
  isAudioMime,
  isImageMime,
  isVideoMime,
} from './fileTypes';
import { useVideoFirstFrame } from './useVideoFirstFrame';

type PreviewAsset = {
  attachmentId?: number;
  mimeType?: string | null;
  filename?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  thumbnailSrcSet?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  optimizationStatus?: string | null;
};

/**
 * Raster URL safe for <img>: image file itself, or a WP-generated poster/thumb.
 * Never the raw CSV/PDF/ZIP URL (browser can't preview those as images).
 */
function rasterPreviewUrl(asset: PreviewAsset, cacheToken: string): string {
  const poster = assetPosterUrl(asset);
  if (poster) return withCacheBust(poster, cacheToken);
  if (isImageMime(asset.mimeType) && asset.url) {
    return withCacheBust(asset.url, cacheToken);
  }
  return '';
}

/** Large preview for the inspector (image / video / audio / file-type). */
export function AssetInspectorPreview({
  asset,
  bustEpoch = 0,
}: {
  asset: PreviewAsset;
  bustEpoch?: number;
}) {
  const cacheToken = `${mediaRevisionToken(asset)}-${bustEpoch}`;
  const fileUrl = asset.url ? withCacheBust(asset.url, cacheToken) : '';
  const poster = assetPosterUrl(asset);
  const posterUrl = poster ? withCacheBust(poster, cacheToken) : '';
  const rasterUrl = rasterPreviewUrl(asset, cacheToken);
  const needsFrame = isVideoMime(asset.mimeType) && Boolean(fileUrl) && !posterUrl;
  const firstFrame = useVideoFirstFrame(needsFrame ? fileUrl : null);
  const videoPoster = posterUrl || firstFrame || undefined;
  const [failedRaster, setFailedRaster] = useState<string | null>(null);
  const showRaster = Boolean(rasterUrl) && failedRaster !== rasterUrl;

  if (isVideoMime(asset.mimeType) && fileUrl) {
    return (
      <video
        key={cacheToken}
        className="frkt-inspector__preview-media"
        src={fileUrl}
        poster={videoPoster}
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  if (isAudioMime(asset.mimeType) && fileUrl) {
    return (
      <div className="frkt-inspector__preview-audio">
        <Music {...iconPropsMd} aria-hidden="true" />
        <audio key={cacheToken} src={fileUrl} controls preload="metadata" />
      </div>
    );
  }

  if (showRaster && rasterUrl) {
    // Prefer the original file for inspector images so PNG/WebP alpha isn't
    // flattened into a JPEG intermediate size (which paints transparency black).
    const src =
      isImageMime(asset.mimeType) && fileUrl ? fileUrl : rasterUrl;
    return (
      <img
        key={src}
        className="frkt-inspector__preview-media"
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        onError={() => setFailedRaster(rasterUrl)}
      />
    );
  }

  return (
    <div className="frkt-inspector__preview-empty" aria-hidden="true">
      {formatFileLabel(asset.mimeType, asset.filename) || 'FILE'}
    </div>
  );
}

/** Compact thumbnail for grid / list / insight cards. */
export function AssetThumb({
  asset,
  bustEpoch = 0,
  label,
  sizes = '240px',
  onPreviewSettled,
}: {
  asset: PreviewAsset;
  bustEpoch?: number;
  label?: string | null;
  sizes?: string;
  onPreviewSettled?: (epoch: number) => void;
}) {
  const cacheToken = `${mediaRevisionToken(asset)}-${bustEpoch}`;
  const rasterUrl = rasterPreviewUrl(asset, cacheToken);
  const rasterSrcSet = isImageMime(asset.mimeType)
    ? withCacheBustSrcSet(asset.thumbnailSrcSet, cacheToken)
    : '';
  const videoUrl =
    !rasterUrl && isVideoMime(asset.mimeType) && asset.url
      ? withCacheBust(asset.url, cacheToken)
      : '';
  const firstFrame = useVideoFirstFrame(videoUrl || null);
  const format =
    label !== undefined && label !== null
      ? label
      : formatFileLabel(asset.mimeType, asset.filename);
  const [failedRaster, setFailedRaster] = useState<string | null>(null);
  const showRaster = Boolean(rasterUrl) && failedRaster !== rasterUrl;

  if (showRaster && rasterUrl) {
    return (
      <img
        key={rasterUrl}
        src={rasterUrl}
        srcSet={rasterSrcSet || undefined}
        sizes={rasterSrcSet ? sizes : undefined}
        alt=""
        draggable={false}
        loading="lazy"
        onLoad={() => onPreviewSettled?.(bustEpoch)}
        onError={() => {
          setFailedRaster(rasterUrl);
          onPreviewSettled?.(bustEpoch);
        }}
      />
    );
  }

  if (isVideoMime(asset.mimeType)) {
    if (firstFrame) {
      return (
        <img
          key={firstFrame.slice(0, 48)}
          src={firstFrame}
          alt=""
          draggable={false}
          loading="lazy"
          className="frkt-card__thumb-video"
        />
      );
    }
    return (
      <div className="frkt-card__placeholder frkt-card__placeholder--media" aria-hidden="true">
        <Film {...iconPropsMd} />
        <span>{format || 'Video'}</span>
      </div>
    );
  }

  if (isAudioMime(asset.mimeType)) {
    return (
      <div className="frkt-card__placeholder frkt-card__placeholder--media" aria-hidden="true">
        <Music {...iconPropsMd} />
        <span>{format}</span>
      </div>
    );
  }

  const GenericFileIcon = format === 'ZIP' ? FileArchive : FileText;
  return (
    <div className="frkt-card__placeholder frkt-card__placeholder--media frkt-card__placeholder--file" aria-hidden="true">
      <GenericFileIcon {...iconPropsMd} />
      <span>{format}</span>
    </div>
  );
}
