import type { Folder, Job, MediaAsset } from '../types';
import { toastT } from '../i18n/toastMessages';
import { settingsApi } from './settings';
import { postFormData, request, restEndpoint, withTimeout } from './transport';
import type { LibraryScan } from './types';

export type { FeatureItem, LibraryScan, LicenseStatus } from './types';

export type BulkAiField = 'title' | 'altText' | 'caption' | 'description' | 'filename';

export type DownloadZipParams = Record<string, string | number | boolean | number[] | undefined>;

export type ActiveBulkOperation = {
  operationId: string;
  kind: 'analyze' | 'convert';
  total: number;
  current: number;
  failed: number;
  jobIds: number[];
  openJobIds: number[];
  attachmentIds: number[];
  openAttachmentIds: number[];
};

export const api = {
  ...settingsApi,
  downloadZip: (params: DownloadZipParams) =>
    request<{ queued: boolean; jobId: number }>('/assets/download-zip', {
      method: 'POST',
      data: params,
    }),
  listAssets: (params: Record<string, string | number | boolean | undefined>) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null && v !== false) q.set(k, String(v));
    });
    return request<{ items: MediaAsset[]; total: number; page: number; per_page: number }>(`/assets?${q}`);
  },
  listAssetAuthors: () =>
    request<{ items: Array<{ id: number; name: string; count: number }> }>('/assets/authors'),
  getAsset: (id: number) => request<MediaAsset>(`/assets/${id}`),
  updateAsset: (
    id: number,
    data: { title?: string; altText?: string; caption?: string; description?: string; locale?: string }
  ) => request<MediaAsset>(`/assets/${id}`, { method: 'PATCH', data }),
  analyze: (id: number) =>
    request<{ asset?: MediaAsset; jobId?: number; queued: boolean }>(`/assets/${id}/analyze`, {
      method: 'POST',
    }),
  generateField: (
    id: number,
    field: 'all' | 'title' | 'altText' | 'caption' | 'description',
    locale?: string,
    signal?: AbortSignal,
    regenerateFilename = false,
    translateAll = false
  ) =>
    withTimeout(
      (sig) =>
        request<{
          queued?: boolean;
          jobId?: number;
          field: string;
          value?: string;
          values?: { title: string; altText: string; caption: string; description: string };
          asset?: MediaAsset;
        }>(`/assets/${id}/generate`, {
          method: 'POST',
          data: { field, regenerate_filename: field === 'all' && regenerateFilename, translate_all: translateAll, ...(locale ? { locale } : {}) },
          signal: sig,
        }),
      30_000,
      toastT('aiQueueFailed'),
      signal
    ),
  getAiEditAvailability: (id: number) =>
    request<{ available: boolean; provider: string | null; providerNote: string }>(`/assets/${id}/ai-edit`),
  generateAiImageEdit: (id: number, prompt: string, draftToken?: string) =>
    request<{ queued: boolean; jobId: number }>(`/assets/${id}/ai-edit`, {
      method: 'POST',
      data: { prompt, ...(draftToken ? { draftToken } : {}) },
    }),
  getAiImageEditStatus: (id: number, jobId: number) =>
    request<{
      jobId: number;
      status: string;
      progress: number;
      updatedAt: string;
      error: string | null;
      previewUrl: string;
      draftToken: string;
      applied: boolean;
    }>(`/assets/${id}/ai-edit?jobId=${jobId}`),
  applyAiImageEdit: (id: number, draftToken: string) =>
    request<{ queued: boolean; jobId: number }>(`/assets/${id}/ai-edit/apply`, {
      method: 'POST',
      data: { draftToken, confirmed: true },
    }),
  discardAiImageEdit: (id: number, draftToken: string) =>
    request<{ discarded: boolean }>(`/assets/${id}/ai-edit`, {
      method: 'DELETE',
      data: { draftToken },
    }),
  retryJob: (id: number) => request<{ retried: boolean }>(`/jobs/${id}/retry`, { method: 'POST' }),
  getJob: (id: number) => request<Job>(`/jobs/${id}`),
  getActiveBulkOperation: () =>
    request<{ operation: ActiveBulkOperation | null }>('/bulk-operations/active'),
  cancelJob: (id: number) =>
    request<{ cancelled: boolean }>(`/jobs/${id}/cancel`, { method: 'POST' }),
  runJob: () =>
    withTimeout(
      (sig) =>
        request<{ ran: boolean; locked: boolean; scheduled: number; pending: number; job: Job | null }>('/jobs/run', {
          method: 'POST',
          signal: sig,
        }),
      15_000,
      toastT('jobRunnerTimeout')
    ),
  scanReferences: (id: number) =>
    request<{ jobId: number; queued: true }>(`/assets/${id}/references`, {
      method: 'POST',
    }),
  rebuildReferences: (opts?: { limit?: number }) =>
    request<LibraryScan & { queued?: number; scanned?: number }>('/references/rebuild', {
      method: 'POST',
      data: opts || {},
    }),
  bulkAnalyze: (attachmentIds: number[], fields?: BulkAiField[]) =>
    request<{ queued: number; message: string; jobIds: number[]; operationId: string }>('/bulk/analyze', {
      method: 'POST',
      data: { attachmentIds, ...(fields ? { fields } : {}) },
    }),
  bulkConvert: (attachmentIds: number[], format: 'jpeg' | 'png' | 'webp', quality = 100) =>
    request<{ queued: number; message: string; jobIds: number[]; skipped: number[]; missing: number[]; operationId: string }>('/bulk/convert', {
      method: 'POST',
      data: { attachmentIds, format, quality, confirmed: true },
    }),
  bulkAltPreview: (attachmentIds: number[], locale?: string, signal?: AbortSignal) =>
    withTimeout(
      (inner) =>
        request<{
          locale: string;
          items: Array<{
            attachmentId: number;
            filename: string;
            thumbnailUrl: string;
            mimeType: string;
            currentAlt: string;
            proposedAlt: string;
            status: string;
            error: string;
            selected: boolean;
          }>;
          generated: number;
          reused: number;
          failed: number;
        }>('/bulk/alt/preview', {
          method: 'POST',
          data: { attachmentIds, ...(locale ? { locale } : {}) },
          signal: inner,
        }),
      180_000,
      toastT('altPreviewTimeout'),
      signal
    ),
  bulkAltApply: (
    items: Array<{ attachmentId: number; proposedAlt: string }>,
    locale?: string
  ) =>
    request<{
      applied: number[];
      skipped: number[];
      locale: string;
      message: string;
    }>('/bulk/alt/apply', {
      method: 'POST',
      data: { confirmed: true, items, ...(locale ? { locale } : {}) },
    }),
  bulkScanReferences: (attachmentIds: number[]) =>
    request<{ queued?: number; scanned?: number; message: string }>('/bulk/scan-references', {
      method: 'POST',
      data: { attachmentIds },
    }),
  bulkDelete: (
    attachmentIds: number[],
    opts: { confirmed: boolean; force?: boolean; skipUsed?: boolean }
  ) =>
    request<{
      trashed: number[];
      deleted: number[];
      skipped: number[];
      blocked: number[];
      message: string;
    }>('/bulk/delete', {
      method: 'POST',
      data: { attachmentIds, ...opts },
    }),
  indexLibrary: (opts?: { limit?: number; prune?: boolean; mode?: 'differential' | 'full' }) =>
    request<{
      scan?: LibraryScan;
      queued?: number;
      processed?: number;
      indexed?: number;
      attachments?: number;
      remaining?: number;
      pruned?: number;
      done?: boolean;
      note?: string;
    }>('/assets/index', {
      method: 'POST',
      data: {
        limit: opts?.limit,
        prune: opts?.prune,
        mode: opts?.mode ?? 'differential',
      },
    }),
  uploadAsset: async (
    file: File,
    folderId?: number | null,
    options?: { analyze?: boolean; aiRename?: boolean }
  ) => {
    const body = new FormData();
    // Field name must match AssetsController expectations.
    body.append('file', file, file.name || 'upload.bin');
    if (folderId != null && Number(folderId) > 0) {
      body.append('folder_id', String(folderId));
    }
    body.append('analyze', options?.analyze ? '1' : '0');
    body.append('ai_rename', options?.aiRename ? '1' : '0');

    const json = await postFormData<Record<string, unknown>>(
      restEndpoint('/assets/upload'),
      body,
      toastT('uploadNetworkError')
    );

    const wrapped = json.asset;
    const asset = (wrapped && typeof wrapped === 'object' ? wrapped : json) as MediaAsset;
    const id = Number((asset as { attachmentId?: unknown; attachment_id?: unknown }).attachmentId
      ?? (asset as { attachment_id?: unknown }).attachment_id
      ?? 0);
    if (!id) {
      throw new Error(toastT('uploadNoAsset'));
    }
    if (!(asset as { attachmentId?: number }).attachmentId) {
      (asset as { attachmentId: number }).attachmentId = id;
    }
    return { asset };
  },
  listFolders: () => request<{ items: Folder[] }>('/folders'),
  happyFilesImport: () =>
    request<{ source: string; available: boolean; folders: number; files: number }>(
      '/folder-imports/happyfiles'
    ),
  importHappyFiles: (offset: number) =>
    request<{ folders: number; files: number; assigned: number; nextOffset: number; done: boolean }>(
      '/folder-imports/happyfiles',
      { method: 'POST', data: { offset } }
    ),
  wpMediaFolderImport: () =>
    request<{ source: string; available: boolean; folders: number; files: number }>(
      '/folder-imports/wp-media-folder'
    ),
  importWpMediaFolder: (offset: number) =>
    request<{ folders: number; files: number; assigned: number; nextOffset: number; done: boolean }>(
      '/folder-imports/wp-media-folder',
      { method: 'POST', data: { offset } }
    ),
  fileBirdImport: () =>
    request<{ source: string; available: boolean; folders: number; files: number }>(
      '/folder-imports/filebird'
    ),
  importFileBird: (offset: number) =>
    request<{ folders: number; files: number; assigned: number; nextOffset: number; done: boolean }>(
      '/folder-imports/filebird',
      { method: 'POST', data: { offset } }
    ),
  realMediaImport: () =>
    request<{ source: string; available: boolean; folders: number; files: number }>(
      '/folder-imports/real-media-library'
    ),
  importRealMedia: (offset: number) =>
    request<{ folders: number; files: number; assigned: number; nextOffset: number; done: boolean }>(
      '/folder-imports/real-media-library',
      { method: 'POST', data: { offset } }
    ),
  createFolder: (name: string, parentId?: number | null) => {
    const data: { name: string; parentId?: number } = { name };
    if (parentId != null && parentId > 0) {
      data.parentId = parentId;
    }
    return request<Folder>('/folders', { method: 'POST', data });
  },
  updateFolder: (id: number, data: { name?: string; parentId?: number | null; sortOrder?: number; color?: string }) =>
    request<Folder>(`/folders/${id}`, { method: 'PATCH', data }),
  assignToFolder: (folderId: number, assetIds: number[]) =>
    request<{ assigned: number }>(`/folders/${folderId}/assign`, { method: 'POST', data: { assetIds } }),
  assignAttachmentsToFolder: (folderId: number, attachmentIds: number[]) =>
    request<{ assigned: number }>(`/folders/${folderId}/assign`, { method: 'POST', data: { attachmentIds } }),
  reorderFolderAttachments: (
    folderId: number,
    attachmentIds: number[],
    targetAttachmentId: number,
    place: 'before' | 'after'
  ) =>
    request<{ reordered: boolean }>(`/folders/${folderId}/order`, {
      method: 'POST',
      data: { attachmentIds, targetAttachmentId, place },
    }),
  unassignAttachmentsFromFolder: (folderId: number, attachmentIds: number[]) =>
    request<{ removed: number }>(`/folders/${folderId}/assign`, {
      method: 'DELETE',
      data: { attachmentIds },
    }),
  deleteFolder: (id: number) =>
    request<{ deleted: boolean; folderId: number; detached: number; reparented: number }>(
      `/folders/${id}`,
      { method: 'DELETE' }
    ),
  getLibraryScan: (kind: 'index' | 'references' | 'duplicates') => request<LibraryScan>(`/library-scans/${kind}`),
  listJobs: () => request<{ items: Job[]; total: number }>('/jobs'),
  listUnused: (page = 1) =>
    request<{ items: MediaAsset[]; total: number; warning?: string; scan?: LibraryScan }>(`/unused?page=${page}`),
  rescanUnused: (limit = 100) =>
    request<LibraryScan & { queued: number }>('/unused', { method: 'POST', data: { limit } }),
  listDuplicates: (page = 1, type: 'all' | 'exact' | 'near' = 'all', perPage = 10) =>
    request<{
      items: Array<{
        hash: string;
        count: number;
        type: string;
        suggestedKeepId: number;
        reason: string;
        itemsTruncated?: boolean;
        items: MediaAsset[];
      }>;
      total: number;
      page?: number;
      per_page?: number;
      exactTotal?: number;
      nearTotal?: number;
    }>(`/duplicates?page=${page}&per_page=${perPage}&type=${type}`),
  scanDuplicates: () =>
    request<{
      hashed?: number;
      groups?: number;
      nearGroups?: number;
      marked?: number;
      jobId?: number;
      queued?: boolean;
    }>('/duplicates', { method: 'POST' }),
  getHealth: () =>
    request<{
      totals: Record<string, number>;
      issues: Array<{ id: string; severity: string; label: string; count: number; hint: string }>;
      generatedAt: string;
    }>('/health'),
  getSystemStatus: () =>
    request<{
      ok: boolean;
      summary: { pass: number; warn: number; fail: number; info: number };
      groups: Array<{
        id: string;
        label: string;
        checks: Array<{
          id: string;
          label: string;
          status: 'pass' | 'warn' | 'fail' | 'info';
          value: string;
          required: boolean;
          ideal: string;
          info: string;
          hint: string;
        }>;
      }>;
      generatedAt: string;
    }>('/system'),
  listCollections: () =>
    request<{
      items: Array<{
        id: number;
        name: string;
        filters: Record<string, unknown>;
        isSmart: boolean;
        count?: number;
      }>;
    }>('/collections'),
  createCollection: (name: string, filters: Record<string, unknown> = {}) =>
    request<{
      id: number;
      name: string;
      filters: Record<string, unknown>;
      isSmart: boolean;
      count?: number;
    }>('/collections', { method: 'POST', data: { name, filters, isSmart: true } }),
  updateCollection: (
    id: number,
    data: { name?: string; filters?: Record<string, unknown> }
  ) =>
    request<{
      id: number;
      name: string;
      filters: Record<string, unknown>;
      isSmart: boolean;
      count?: number;
    }>(`/collections/${id}`, { method: 'PATCH', data }),
  deleteCollection: (id: number) =>
    request<{ deleted: boolean }>(`/collections/${id}`, { method: 'DELETE' }),
  collectionAssets: (id: number, page = 1) =>
    request<{ items: MediaAsset[]; total: number }>(`/collections/${id}/assets?page=${page}`),
  optimizeAsset: (
    id: number,
    opts: { preview?: boolean; confirmed?: boolean; quality?: number } = { preview: true }
  ) =>
    withTimeout(
      (signal) =>
        request<Record<string, unknown>>(`/assets/${id}/optimize`, {
          method: 'POST',
          data: opts,
          signal,
        }),
      opts.preview ? 30_000 : 180_000,
      opts.preview
        ? toastT('optimizePreviewTimeout')
        : toastT('optimizeTimeout')
    ),
  restoreOptimizedAsset: (id: number) =>
    withTimeout(
      (signal) =>
        request<Record<string, unknown>>(`/assets/${id}/optimize/restore`, {
          method: 'POST',
          data: { confirmed: true },
          signal,
        }),
      180_000,
      toastT('restoreTimeout')
    ),
  deleteOriginalBackup: (id: number) =>
    request<{ deleted: number; hasBackup: boolean; canRestore: boolean }>(`/assets/${id}/optimize/backup`, {
      method: 'POST',
      data: { confirmed: true },
    }),
  previewImageEdit: (id: number) =>
    request<{
      attachmentId: number;
      mime: string;
      width: number;
      height: number;
      canEdit: boolean;
      hasBackup: boolean;
      modified?: number;
      note: string;
    }>(`/assets/${id}/edit`),
  editAsset: (
    id: number,
    opts: {
      rotate?: number;
      crop?: { x: number; y: number; width: number; height: number } | null;
      backup?: boolean;
    }
  ) => {
    const { crop, ...rest } = opts;
    const data: Record<string, unknown> = { confirmed: true, ...rest };
    if (crop) {
      data.crop = crop;
    }
    return request<{
      applied?: boolean;
      width?: number;
      height?: number;
      modified?: number;
      message?: string;
    }>(`/assets/${id}/edit`, {
      method: 'POST',
      data,
    });
  },
  previewImageResize: (id: number) =>
    request<{
      attachmentId: number;
      mime: string;
      width: number;
      height: number;
      canResize: boolean;
      hasBackup: boolean;
      allowUpscale: boolean;
      note: string;
    }>(`/assets/${id}/resize`),
  resizeAsset: (
    id: number,
    opts: { width: number; height: number; allowUpscale?: boolean; backup?: boolean }
  ) =>
    request<{
      applied?: boolean;
      width?: number;
      height?: number;
      previousWidth?: number;
      previousHeight?: number;
      modified?: number;
      message?: string;
    }>(`/assets/${id}/resize`, {
      method: 'POST',
      data: { confirmed: true, ...opts },
    }),
  previewImageConvert: (id: number) =>
    request<{
      attachmentId: number;
      mime: string;
      format: string;
      formats: Array<{ id: string; label: string; mime: string; current: boolean }>;
      currentBytes: number;
      canConvert: boolean;
      hasBackup: boolean;
      quality: number;
      note: string;
    }>(`/assets/${id}/convert`),
  convertAsset: (
    id: number,
    opts: { format: string; quality?: number; backup?: boolean }
  ) =>
    request<{
      applied?: boolean;
      format?: string;
      mime?: string;
      previousBytes?: number;
      currentBytes?: number;
      message?: string;
      rewrittenTotal?: number;
    }>(`/assets/${id}/convert`, {
      method: 'POST',
      data: { confirmed: true, ...opts },
    }),
  previewVideoOptimize: (id: number) =>
    request<{
      attachmentId: number;
      available: boolean;
      ffmpeg: boolean;
	      processControl: boolean;
      format: 'mp4' | 'webm' | 'mov';
      currentFormat: '' | 'mp4' | 'webm' | 'mov';
      formats: Array<{ id: 'mp4' | 'webm' | 'mov'; label: string; mime: string; current: boolean }>;
      width: number;
      height: number;
      duration: number;
      currentBytes: number;
      hasOriginal: boolean;
      poster: { attachmentId: number; url: string; title: string } | null;
      job: Job | null;
      result: Record<string, unknown> | null;
      note: string;
    }>(`/assets/${id}/video-optimize`),
  optimizeVideo: (
    id: number,
    opts: {
      mode: 'optimize' | 'convert' | 'resize';
      format: 'mp4' | 'webm' | 'mov';
      strength: number;
      width: number;
      height: number;
      keepRatio: boolean;
    }
  ) =>
    request<{ queued: boolean; jobId: number }>(`/assets/${id}/video-optimize`, {
      method: 'POST',
      data: { confirmed: true, ...opts },
    }),
  restoreVideo: (id: number) =>
    request<{ queued: boolean; jobId: number }>(`/assets/${id}/video-optimize/restore`, {
      method: 'POST',
      data: { confirmed: true },
    }),
  generateVideoPoster: (id: number, second: number) =>
    request<{ queued: boolean; jobId: number }>(`/assets/${id}/video-poster`, {
      method: 'POST',
      data: { confirmed: true, second },
    }),
  previewRemoveBackground: (id: number) =>
    request<{
      attachmentId: number;
      mime: string;
      currentBytes: number;
      canRemove: boolean;
      hasBackup: boolean;
      note: string;
    }>(`/assets/${id}/remove-background`),
  applyRemoveBackground: async (id: number, file: Blob | File, opts: { backup?: boolean } = {}) => {
    const body = new FormData();
    // Always upload as a PNG File so WP stores a transparent PNG (not the original JPEG/WebP).
    const png =
      file instanceof File && file.type === 'image/png' && /\.png$/i.test(file.name)
        ? file
        : new File([file], 'cutout.png', { type: 'image/png' });
    body.append('file', png, png.name);
    body.append('confirmed', '1');
    if (typeof opts.backup === 'boolean') {
      body.append('backup', opts.backup ? '1' : '0');
    }
    return postFormData<{
      applied?: boolean;
      mime?: string;
      format?: string;
      filename?: string;
      currentBytes?: number;
      width?: number;
      height?: number;
      modified?: number;
      message?: string;
      asset?: import('../types').MediaAsset;
    }>(
      restEndpoint(`/assets/${id}/remove-background`),
      body,
      toastT('removeBgNetworkError')
    );
  },
  replaceAsset: async (
    id: number,
    file: File,
    options: {
      confirmed?: boolean;
    } = {}
  ) => {
    const body = new FormData();
    body.append('file', file, file.name || 'replace.bin');
    if (typeof options.confirmed === 'boolean') {
      body.append('confirmed', options.confirmed ? '1' : '0');
    }

    return postFormData<{
      applied?: boolean;
      preview?: boolean;
      message?: string;
      newFilename?: string;
      currentFilename?: string;
      backupPath?: string | null;
      asset?: MediaAsset;
      [key: string]: unknown;
    }>(
      restEndpoint(`/assets/${id}/replace`),
      body,
      toastT('replaceNetworkError')
    );
  },
  renameAsset: (
    id: number,
    opts: { filename: string; confirmed?: boolean }
  ) =>
    request<{
      applied?: boolean;
      preview?: boolean;
      requiresConfirm?: boolean;
      message?: string;
      currentFilename?: string;
      newFilename?: string;
      currentUrl?: string;
      newUrl?: string;
      referencesCount?: number;
      rewritten?: { posts?: number; meta?: number; options?: number };
      asset?: MediaAsset;
      [key: string]: unknown;
    }>(`/assets/${id}/rename`, {
      method: 'POST',
      data: {
        filename: opts.filename,
        confirmed: opts.confirmed ?? false,
      },
    }),
  suggestFilename: (id: number, signal?: AbortSignal) =>
    withTimeout(
      (sig) =>
        request<{ stem: string; filename: string; asset?: MediaAsset | null }>(
          `/assets/${id}/suggest-filename`,
          { method: 'POST', signal: sig }
        ),
      60_000,
      toastT('suggestNameFailed'),
      signal
    ),
};
