export const DEFAULT_LARGE_FILE_MB = 2;

export const FILE_TYPE_OPTIONS = [
  { id: 'image/jpeg', label: 'JPEG' },
  { id: 'image/png', label: 'PNG' },
  { id: 'image/webp', label: 'WebP' },
  { id: 'image/gif', label: 'GIF' },
  { id: 'image/svg+xml', label: 'SVG' },
  { id: 'image/avif', label: 'AVIF' },
  { id: 'application/pdf', label: 'PDF' },
  { id: 'video/mp4', label: 'MP4' },
  { id: 'video/webm', label: 'WebM' },
  { id: 'video/quicktime', label: 'MOV' },
  { id: 'audio/mpeg', label: 'MP3' },
  { id: 'audio/wav', label: 'WAV' },
  { id: 'audio/ogg', label: 'OGG' },
  { id: 'other', label: 'Other' },
] as const;

/** Extra MIME → short format labels beyond the filter chips. */
const MIME_FORMAT_LABELS: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/pjpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
  'image/svg+xml': 'SVG',
  'image/avif': 'AVIF',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
  'image/bmp': 'BMP',
  'image/tiff': 'TIFF',
  'image/x-icon': 'ICO',
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
  'application/json': 'JSON',
  'application/xml': 'XML',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'text/html': 'HTML',
  'text/css': 'CSS',
  'text/javascript': 'JS',
  'application/javascript': 'JS',
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/quicktime': 'MOV',
  'video/x-msvideo': 'AVI',
  'video/x-matroska': 'MKV',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/ogg': 'OGG',
  'audio/aac': 'AAC',
  'audio/flac': 'FLAC',
};

/**
 * Short human format label for UI (PDF, JPEG, DOCX) — never raw MIME like application/pdf.
 */
export function formatFileLabel(mime?: string | null, filename?: string | null): string {
  const m = (mime || '').toLowerCase().trim();
  if (m && MIME_FORMAT_LABELS[m]) return MIME_FORMAT_LABELS[m];

  const fromOptions = FILE_TYPE_OPTIONS.find((t) => t.id === m);
  if (fromOptions && fromOptions.id !== 'other') return fromOptions.label;

  if (m.includes('/')) {
    let sub = m.split('/')[1] || '';
    if (sub.includes('wordprocessingml')) return 'DOCX';
    if (sub.includes('spreadsheetml')) return 'XLSX';
    if (sub.includes('presentationml')) return 'PPTX';
    if (sub === 'svg+xml') return 'SVG';
    if (sub.startsWith('x-')) sub = sub.slice(2);
    sub = sub.replace(/[^a-z0-9+.-]/gi, '');
    if (sub && !sub.includes('.') && sub.length <= 8) {
      return sub.replace(/\+/g, ' ').toUpperCase();
    }
  }

  const ext = filename?.match(/\.([a-z0-9]+)$/i)?.[1];
  if (ext) return ext.toUpperCase();

  return '—';
}

const COMMON_ASPECT_RATIOS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [5, 4],
  [4, 3],
  [3, 2],
  [16, 10],
  [16, 9],
  [2, 1],
  [21, 9],
  [4, 5],
  [3, 4],
  [2, 3],
  [10, 16],
  [9, 16],
  [1, 2],
];

export function formatAspectRatio(width?: number | null, height?: number | null): string {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return '—';

  const ratio = w / h;
  let closest = COMMON_ASPECT_RATIOS[0];
  let closestError = Number.POSITIVE_INFINITY;
  for (const candidate of COMMON_ASPECT_RATIOS) {
    const candidateRatio = candidate[0] / candidate[1];
    const error = Math.abs(ratio - candidateRatio) / candidateRatio;
    if (error < closestError) {
      closest = candidate;
      closestError = error;
    }
  }
  if (closestError <= 0.015) return `${closest[0]}:${closest[1]}`;

  const rounded = (value: number) => value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
  return ratio >= 1 ? `${rounded(ratio)}:1` : `1:${rounded(1 / ratio)}`;
}

export type FileTypeId = (typeof FILE_TYPE_OPTIONS)[number]['id'];

export function resolveLargeFileMb(override?: number | null): number {
  const fromBoot = Number(window.FRKT_BOOT?.largeFileMb);
  const raw = override != null && override > 0 ? Number(override) : fromBoot;
  const mb = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : DEFAULT_LARGE_FILE_MB;
  return Math.min(500, Math.max(1, mb));
}

export function largeFileMinBytes(mb?: number | null): number {
  return resolveLargeFileMb(mb) * 1024 * 1024;
}

export const FLAG_FILTER_OPTIONS = [
  { id: 'missing_alt', label: 'Missing Alt' },
  { id: 'missing_file', label: 'Missing file' },
  { id: 'large_files', label: 'Large files' },
  { id: 'used', label: 'Used' },
  { id: 'unused', label: 'Unused' },
] as const;

export type FlagFilterId = (typeof FLAG_FILTER_OPTIONS)[number]['id'];

export function parseListParam(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeListParam(values: string[]): string {
  return values.filter(Boolean).join(',');
}

/** @deprecated use parseListParam */
export const parseMimeFilterParam = parseListParam;
/** @deprecated use serializeListParam */
export const serializeMimeFilter = serializeListParam;

export function mimeFilterLabel(
  mimes: string[],
  t: (key: 'fileType' | 'typesCount' | 'otherType', vars?: Record<string, string | number>) => string
): string {
  if (!mimes.length) return t('fileType');
  if (mimes.length === 1) {
    const id = mimes[0];
    if (id === 'other') return t('otherType');
    return FILE_TYPE_OPTIONS.find((opt) => opt.id === id)?.label ?? id;
  }
  return t('typesCount', { count: mimes.length });
}

export function flagFilterLabel(
  flags: string[],
  largeMb: number | null | undefined,
  t: (
    key: 'flags' | 'flagsCount' | 'missingAlt' | 'missingFile' | 'used' | 'unused' | 'largeFilesOver',
    vars?: Record<string, string | number>
  ) => string
): string {
  if (!flags.length) return t('flags');
  if (flags.length === 1) {
    if (flags[0] === 'large_files') return t('largeFilesOver', { mb: resolveLargeFileMb(largeMb) });
    if (flags[0] === 'missing_alt') return t('missingAlt');
    if (flags[0] === 'missing_file') return t('missingFile');
    if (flags[0] === 'used') return t('used');
    if (flags[0] === 'unused') return t('unused');
    return flags[0];
  }
  return t('flagsCount', { count: flags.length });
}

export function flagFilterOptions(
  largeMb: number | null | undefined,
  t: (key: 'missingAlt' | 'missingFile' | 'used' | 'unused' | 'largeFilesOver', vars?: Record<string, string | number>) => string
) {
  const mb = resolveLargeFileMb(largeMb);
  return [
    { id: 'missing_alt', label: t('missingAlt') },
    { id: 'missing_file', label: t('missingFile') },
    { id: 'large_files', label: t('largeFilesOver', { mb }) },
    { id: 'used', label: t('used') },
    { id: 'unused', label: t('unused') },
  ];
}

export function flagsToAssetParams(
  flags: string[],
  largeMb?: number | null
): {
  missing_alt?: boolean;
  missing_file?: boolean;
  min_size?: number;
  usage_min?: number;
  usage_max?: number;
  indexed_only?: boolean;
} {
  const params: {
    missing_alt?: boolean;
    missing_file?: boolean;
    min_size?: number;
    usage_min?: number;
    usage_max?: number;
    indexed_only?: boolean;
  } = {};

  if (flags.includes('missing_alt')) params.missing_alt = true;
  if (flags.includes('missing_file')) params.missing_file = true;
  if (flags.includes('large_files')) params.min_size = largeFileMinBytes(largeMb);
  if (flags.includes('unused')) {
    params.usage_max = 0;
    params.indexed_only = true;
  } else if (flags.includes('used')) {
    params.usage_min = 1;
    params.indexed_only = true;
  }

  return params;
}

export function isImageMime(mime?: string | null): boolean {
  return (mime || '').toLowerCase().startsWith('image/');
}

export function isVideoMime(mime?: string | null): boolean {
  return (mime || '').toLowerCase().startsWith('video/');
}

export function isAudioMime(mime?: string | null): boolean {
  return (mime || '').toLowerCase().startsWith('audio/');
}

/** True when a URL looks like a playable media file (not a poster/image). */
export function looksLikeMediaFileUrl(url?: string | null): boolean {
  return /\.(mp4|webm|mov|m4v|avi|mkv|ogv|mpeg|mpg|mp3|wav|ogg|m4a|flac|aac)(\?|#|$)/i.test(
    url || ''
  );
}

/**
 * Poster/thumbnail suitable for <img> — never the video/audio file itself.
 */
export function assetPosterUrl(asset: {
  mimeType?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
}): string {
  const thumb = (asset.thumbnailUrl || '').trim();
  if (!thumb || looksLikeMediaFileUrl(thumb)) return '';
  const fileUrl = (asset.url || '').trim();
  if (
    fileUrl &&
    (isVideoMime(asset.mimeType) || isAudioMime(asset.mimeType)) &&
    thumb.split('?')[0] === fileUrl.split('?')[0]
  ) {
    return '';
  }
  return thumb;
}

