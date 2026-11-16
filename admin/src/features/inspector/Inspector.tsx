import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, History, LoaderCircle, Lock, Sparkles, Undo2, X, ZoomIn } from 'lucide-react';
import { api } from '../../api/client';
import { invalidateLibraryQueries, refreshDuplicatesAfterAttachmentChange } from '../../api/invalidate';
import { kickJobPump } from '../../api/jobPump';
import { trackAssetJob, trackJobNotification } from '../../api/jobNotifications';
import { refreshMediaAfterFileChange } from '../../api/refreshMedia';
import { useI18n } from '../../i18n';
import { METADATA_LOCALES } from '../../i18n/locales';
import type { MessageKey } from '../../i18n/catalogs';
import { useUiStore, type InspectorToolFocus } from '../../stores/ui';
import type { MediaAsset, MediaReference } from '../../types';
import { FolderAssignControl } from '../folders/FolderAssignControl';
import { uiSlots } from '../../app/slots';
import { isFreeBuild } from '../../edition';
import { toastError, toastT } from '../../i18n/toastMessages';
import { toast } from '../../ui/toast';
import { ConfirmModal, Modal } from '../../ui/Modal';
import { UiErrorBoundary } from '../../ui/UiErrorBoundary';
import { isFeatureEnabled, useFeaturesMap } from '../features/useFeature';
import { AssetInspectorPreview } from '../library/AssetThumb';
import { isImageMime } from '../library/fileTypes';
import { runWithAssetEditing, useAssetEditing } from '../library/useAssetEditing';
import { iconProps, iconPropsSm } from '../../ui/icons';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { handleTablistKey } from '../../ui/tabs';
import { AssetInfoPanel, FolderMembership } from './InspectorPanels';
import {
  INSPECTOR_DEFAULT_WIDTH,
  INSPECTOR_MIN_WIDTH,
  useInspectorResize,
} from './useInspectorResize';

type AiField = 'all' | 'title' | 'altText' | 'caption' | 'description';
type InspectorTab = 'details' | 'tools' | 'ai-edit' | 'info';

function isOpenJob(status?: string): boolean {
  return status === 'pending' || status === 'running' || status === 'retrying';
}

const INSPECTOR_TABS: { id: InspectorTab; label: MessageKey }[] = [
  { id: 'details', label: 'details' },
  { id: 'tools', label: 'tools' },
  { id: 'ai-edit', label: 'editWithAi' },
  { id: 'info', label: 'info' },
];

const PRO_TOOL_PREVIEW: Array<{ label: MessageKey; description: MessageKey }> = [
  { label: 'featRenameLabel', description: 'featRenameDesc' },
  { label: 'featOptimizeLabel', description: 'featOptimizeDesc' },
  { label: 'featEditLabel', description: 'featEditDesc' },
  { label: 'featResizeLabel', description: 'featResizeDesc' },
  { label: 'featConvertLabel', description: 'featConvertDesc' },
  { label: 'videoOptimizer', description: 'videoOptimizerDesc' },
  { label: 'featRmbgLabel', description: 'featRmbgDesc' },
  { label: 'featReplaceLabel', description: 'featReplaceDesc' },
];

const PRO_AI_EDIT_PREVIEW: Array<{ label: MessageKey; description: MessageKey }> = [
  { label: 'featAiEditLabel', description: 'featAiEditDesc' },
];

function LockedProShowcase({
  items,
}: {
  items: Array<{ label: MessageKey; description: MessageKey }>;
}) {
  const { t } = useI18n();

  return (
    <section className="frkt-pro-showcase" aria-label={t('proUpgradeTitle')}>
      <div className="frkt-pro-showcase__intro">
        <span className="frkt-pro-showcase__lock" aria-hidden="true">
          <Lock {...iconProps} size={18} />
        </span>
        <div>
          <h3>{t('proUpgradeTitle')}</h3>
          <p>{t('proUpgradeBody')}</p>
        </div>
      </div>
      <div className="frkt-pro-showcase__list">
        {items.map((item) => (
          <div className="frkt-pro-showcase__item" key={item.label} aria-disabled="true">
            <div>
              <strong>{t(item.label)}</strong>
              <span>{t(item.description)}</span>
            </div>
            <Lock {...iconPropsSm} aria-hidden="true" />
          </div>
        ))}
      </div>
      <a
        className="button button-primary frkt-pro-showcase__cta"
        href="https://foldrocket.com/#pricing"
        target="_blank"
        rel="noreferrer"
      >
        {t('licenseBuyCta')}
      </a>
    </section>
  );
}

function readFields(asset: MediaAsset, locale: string, defaultLocale: string) {
  const wp = {
    title: asset.title || '',
    altText: asset.altText || '',
    caption: asset.caption || '',
    description: asset.description || '',
  };

  // Default locale: WordPress attachment fields are canonical.
  if (locale === defaultLocale) {
    return { ...wp };
  }

  const localized = asset.metadata?.[locale];
  if (!localized) {
    return { title: '', altText: '', caption: '', description: '' };
  }

  const pick = (value?: string | null) => (value && value.trim() ? value : '');

  return {
    title: pick(localized.title),
    altText: pick(localized.altText),
    caption: pick(localized.caption),
    description: pick(localized.description),
  };
}

function isOptimizableMime(mime?: string | null): boolean {
  const m = (mime || '').toLowerCase();
  return m === 'image/jpeg' || m === 'image/jpg' || m === 'image/png' || m === 'image/webp';
}

function splitFilename(name: string): { stem: string; ext: string } {
  const base = (name || '').trim();
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return { stem: base, ext: '' };
  return { stem: base.slice(0, dot), ext: base.slice(dot + 1) };
}

function formatConfidence(
  value: string,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
): string {
  const key = (
    {
      high: 'confHigh',
      medium: 'confMedium',
      low: 'confLow',
      unknown: 'confUnknown',
    } as Record<string, MessageKey>
  )[value.toLowerCase()];
  return key ? t(key) : value;
}

export function Inspector() {
  useFeaturesMap();
  const { t } = useI18n();
  const {
    activeAsset,
    inspectorQueue,
    inspectorOpen,
    setInspectorOpen,
    setActiveAsset,
    inspectorFocusToken,
    folderId: browseFolderId,
    selectedIds,
    setSelectedIds,
  } = useUiStore();
  const qc = useQueryClient();

  const attachmentId = activeAsset?.attachmentId;
  const queueIndex =
    attachmentId && inspectorQueue.length
      ? inspectorQueue.findIndex((a) => a.attachmentId === attachmentId)
      : -1;
  const prevAsset = queueIndex > 0 ? inspectorQueue[queueIndex - 1] : null;
  const nextAsset =
    queueIndex >= 0 && queueIndex < inspectorQueue.length - 1
      ? inspectorQueue[queueIndex + 1]
      : null;
  const previewEpoch = useUiStore((s) =>
    attachmentId ? s.mediaPreviewBust[attachmentId] ?? 0 : 0
  );

  const detailQuery = useQuery({
    queryKey: ['asset', attachmentId],
    queryFn: () => api.getAsset(attachmentId!),
    enabled: !!attachmentId,
    refetchInterval: (q) => (q.state.data?.aiStatus === 'analyzing' ? 2000 : false),
    placeholderData: keepPreviousData,
  });

  // Set when the user dismisses Generate with AI. Polls must not put the overlay back.
  const aiDismissed = useRef(false);

  // Prefer store optimistic "analyzing" over a stale query payload so the overlay
  // does not blink off when Generate queues a job (query still has the old status).
  // keepPreviousData can leave the prior attachment in `data` after upload/selection —
  // never paint or sync that mismatched payload (it would reopen the previous file).
  const asset: MediaAsset | null = (() => {
    const fromQuery = detailQuery.data ?? null;
    const fromStore = activeAsset;
    if (!fromQuery && !fromStore) return null;
    if (!fromQuery) return fromStore;
    if (attachmentId && fromQuery.attachmentId !== attachmentId) {
      return fromStore?.attachmentId === attachmentId ? fromStore : null;
    }
    if (!fromStore || fromStore.attachmentId !== fromQuery.attachmentId) return fromQuery;
    if (aiDismissed.current && fromQuery.aiStatus === 'analyzing') {
      return { ...fromQuery, aiStatus: 'pending' };
    }
    if (
      fromStore.aiStatus === 'analyzing' &&
      fromQuery.aiStatus !== 'analyzed' &&
      fromQuery.aiStatus !== 'failed'
    ) {
      return { ...fromQuery, aiStatus: 'analyzing' };
    }
    return fromQuery;
  })();
  const isAiAnalyzing = asset?.aiStatus === 'analyzing';
  const wasAnalyzing = useRef(false);
  const canShowOptimize = !isFreeBuild && isOptimizableMime(asset?.mimeType) && isFeatureEnabled('optimize');
  const canShowImageEdit = !isFreeBuild && isOptimizableMime(asset?.mimeType) && isFeatureEnabled('image_edit');
  const canShowResize = !isFreeBuild && isOptimizableMime(asset?.mimeType) && isFeatureEnabled('image_resize');
  const canShowConvert = !isFreeBuild && isOptimizableMime(asset?.mimeType) && isFeatureEnabled('format_convert');
  const canShowVideoOptimizer = !isFreeBuild && Boolean(asset?.mimeType?.toLowerCase().startsWith('video/')) && isFeatureEnabled('video_optimizer');
  const canShowRemoveBg = !isFreeBuild && isOptimizableMime(asset?.mimeType) && isFeatureEnabled('remove_background');
  const canShowReplace = !isFreeBuild && isFeatureEnabled('replace_file');
  const canShowRename = !isFreeBuild && isFeatureEnabled('rename_file');
  const canShowRenameAi = canShowRename && isFeatureEnabled('ai_analysis');
  const canShowAiMeta = !isFreeBuild && isFeatureEnabled('ai_metadata');
  const canShowAiImageEdit = !isFreeBuild;
  const canScanUsage = !isFreeBuild && isFeatureEnabled('usage_detection');
  const ImageEditTool = uiSlots.ImageEditTool;
  const ResizeTool = uiSlots.ResizeTool;
  const FormatConvertTool = uiSlots.FormatConvertTool;
  const RemoveBackgroundTool = uiSlots.RemoveBackgroundTool;
  const AiImageEditTool = uiSlots.AiImageEditTool;
  const VideoOptimizerTool = uiSlots.VideoOptimizerTool;
  const canShowFolders = isFeatureEnabled('folders');
  const canShowAltText = isImageMime(asset?.mimeType);
  const currentNameParts = splitFilename(asset?.filename || '');
  const isMissingFile = asset?.missingFile === true || asset?.details?.file?.exists === false;

  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [locale, setLocale] = useState('it_IT');
  const [tab, setTab] = useState<InspectorTab>('details');
  const [toolFocus, setToolFocus] = useState<InspectorToolFocus | null>(null);
  /** Attachment opened from the context menu, so a later asset refresh does not jump back to Details. */
  const toolOpenFor = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const {
    inspectorRef,
    inspectorWidth,
    inspectorMaxWidth,
    updateInspectorWidth,
    startInspectorResize,
    resizeInspectorWithKeyboard,
  } = useInspectorResize();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [generatingField, setGeneratingField] = useState<AiField | null>(null);
  const [generateAllConfirm, setGenerateAllConfirm] = useState(false);
  const [generateTranslationConfirm, setGenerateTranslationConfirm] = useState<AiField | null>(null);
  const [translateOtherLanguages, setTranslateOtherLanguages] = useState(false);
  const [regenerateFilename, setRegenerateFilename] = useState(false);
  const [quality, setQuality] = useState(100);
  const [optimizeConfirm, setOptimizeConfirm] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [videoRestoreConfirm, setVideoRestoreConfirm] = useState(false);
  const [videoRestoreJobId, setVideoRestoreJobId] = useState<number | null>(null);
  const completedVideoRestoreJob = useRef<number | null>(null);
  const [originalPreviewOpen, setOriginalPreviewOpen] = useState(false);
  const [currentPreviewOpen, setCurrentPreviewOpen] = useState(false);
  const [deleteOriginalConfirm, setDeleteOriginalConfirm] = useState(false);
  const [optimizeStatus, setOptimizeStatus] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState(false);
  const [replaceStatus, setReplaceStatus] = useState('');
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const [renameStem, setRenameStem] = useState('');
  const [renameExtension, setRenameExtension] = useState('');
  const [renameConfirm, setRenameConfirm] = useState(false);
  const [renameStatus, setRenameStatus] = useState('');
  const [renamePreview, setRenamePreview] = useState<{
    message?: string;
    newFilename?: string;
    referencesCount?: number;
  } | null>(null);

  const autosaveReady = useRef(false);
  const lastSaved = useRef({ title: '', altText: '', caption: '', description: '', locale: '' });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const aiJobIdRef = useRef<number | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });

  const locales = (() => {
    const langs = (settingsQuery.data?.settings as { languages?: { enabled?: string[]; default?: string } })?.languages;
    const enabled = langs?.enabled;
    if (Array.isArray(enabled) && enabled.length) return enabled;
    return ['it_IT', 'en_US'];
  })();
  const defaultLocale =
    (settingsQuery.data?.settings as { languages?: { default?: string } })?.languages?.default || locales[0] || 'it_IT';
  const hasMultipleLocales = isFeatureEnabled('multilingual') && locales.length > 1;

  const hasAiApiKey = (settingsQuery.data?.providers ?? []).some((p) => p.configured);

  const localeLabel = (code: string) =>
    METADATA_LOCALES.find((language) => language.code === code)?.native || code;

  useEffect(() => {
    if (!asset) return;
    setLocale(defaultLocale);
  }, [asset?.attachmentId, defaultLocale]);

  // Drop in-flight Generate with AI when switching media or unmounting.
  useEffect(() => {
    return () => {
      generateAbortRef.current?.abort();
      renameAiAbortRef.current?.abort();
    };
  }, [attachmentId]);

  // Keep store in sync while polling analysis progress.
  useEffect(() => {
    if (!detailQuery.data || !attachmentId) return;
    if (detailQuery.isPlaceholderData) return;
    if (detailQuery.data.attachmentId !== attachmentId) return;
    const current = useUiStore.getState().activeAsset;
    if (!current || current.attachmentId !== attachmentId) return;

    let next = detailQuery.data;
    if (aiDismissed.current && next.aiStatus === 'analyzed') {
      aiDismissed.current = false;
    } else if (aiDismissed.current && next.aiStatus === 'analyzing') {
      next = { ...next, aiStatus: 'pending' };
    }
    // Don't clobber an in-flight generate/analyze with a stale non-terminal status.
    if (
      (current.aiStatus === 'analyzing' || wasAnalyzing.current) &&
      next.aiStatus !== 'analyzing' &&
      next.aiStatus !== 'analyzed' &&
      next.aiStatus !== 'failed'
    ) {
      next = { ...next, aiStatus: 'analyzing' };
    }

    if (
      current.aiStatus === next.aiStatus &&
      current.title === next.title &&
      current.altText === next.altText &&
      current.caption === next.caption &&
      current.description === next.description
    ) {
      return;
    }
    setActiveAsset(next);
  }, [
    detailQuery.dataUpdatedAt,
    attachmentId,
    detailQuery.data,
    detailQuery.isPlaceholderData,
    setActiveAsset,
  ]);

  // After background AI finishes, refresh editable fields from the analyzed asset.
  useEffect(() => {
    if (!asset) return;
    if (asset.aiStatus === 'analyzing') {
      wasAnalyzing.current = true;
      // Make sure someone is actually executing the queued job (no-op if a pump is running).
      kickJobPump();
      return;
    }
    if (!wasAnalyzing.current) return;

    if (asset.aiStatus === 'failed') {
      wasAnalyzing.current = false;
      aiJobIdRef.current = null;
      toast.error(toastT('toastAiFailed'));
      autosaveReady.current = true;
      return;
    }

    if (asset.aiStatus !== 'analyzed') return;
    wasAnalyzing.current = false;
    aiJobIdRef.current = null;
    autosaveReady.current = false;
    const fields = readFields(asset, locale, defaultLocale);
    setTitle(fields.title);
    setAltText(fields.altText);
    setCaption(fields.caption);
    setDescription(fields.description);
    lastSaved.current = {
      title: fields.title,
      altText: fields.altText,
      caption: fields.caption,
      description: fields.description,
      locale,
    };
    setSaveStatus('idle');
    const nextNameParts = splitFilename(asset.filename || '');
    setRenameStem(nextNameParts.stem);
    setRenameExtension(nextNameParts.ext);
    toast.success(toastT('toastAiAllSaved'));
    window.setTimeout(() => {
      autosaveReady.current = true;
    }, 50);
    if (attachmentId) {
      void refreshMediaAfterFileChange(qc, attachmentId, { asset });
    } else {
      void qc.invalidateQueries({ queryKey: ['assets'] });
    }
  }, [asset?.aiStatus, asset, locale, defaultLocale, qc, attachmentId]);

  useEffect(() => {
    if (!asset) return;
    autosaveReady.current = false;
    aiDismissed.current = false;
    wasAnalyzing.current = asset.aiStatus === 'analyzing';
    const fields = readFields(asset, locale, defaultLocale);
    setTitle(fields.title);
    setAltText(fields.altText);
    setCaption(fields.caption);
    setDescription(fields.description);
    lastSaved.current = {
      title: fields.title,
      altText: fields.altText,
      caption: fields.caption,
      description: fields.description,
      locale,
    };
    setSaveStatus('idle');
    const pendingFocus = useUiStore.getState().inspectorFocus;
    if (pendingFocus && pendingFocus.attachmentId === asset.attachmentId) {
      setTab(pendingFocus.tab);
      setToolFocus(pendingFocus.tab === 'tools' ? pendingFocus.tool ?? null : null);
      toolOpenFor.current = pendingFocus.tab === 'tools' ? asset.attachmentId : null;
      useUiStore.getState().clearInspectorFocus();
    } else if (toolOpenFor.current === asset.attachmentId) {
      // Locale sync and asset refresh must not jump away from the tool the menu opened.
    } else {
      setTab('details');
      setToolFocus(null);
      toolOpenFor.current = null;
    }
    setQuality(75);
    setOptimizeConfirm(false);
    setRestoreConfirm(false);
    setDeleteOriginalConfirm(false);
    setOptimizeStatus('');
    setDeleteConfirm(false);
    setReplaceFile(null);
    setReplaceConfirm(false);
    setReplaceStatus('');
    const nextNameParts = splitFilename(asset?.filename || '');
    setRenameStem(nextNameParts.stem);
    setRenameExtension(nextNameParts.ext);
    setRenameConfirm(false);
    setGenerateAllConfirm(false);
    setGenerateTranslationConfirm(null);
    setTranslateOtherLanguages(false);
    setRegenerateFilename(false);
    setRenameStatus('');
    setRenamePreview(null);
    if (scrollRef.current && toolOpenFor.current !== asset.attachmentId) scrollRef.current.scrollTop = 0;
    if (replaceInputRef.current) replaceInputRef.current.value = '';
    const readyTimer = window.setTimeout(() => {
      autosaveReady.current = true;
    }, 0);
    return () => window.clearTimeout(readyTimer);
  }, [asset?.attachmentId, locale, defaultLocale, asset?.filename]);

  useEffect(() => {
    const focus = useUiStore.getState().inspectorFocus;
    if (!asset || !focus || focus.attachmentId !== asset.attachmentId) return;
    setTab(focus.tab);
    setToolFocus(focus.tab === 'tools' ? focus.tool ?? null : null);
    toolOpenFor.current = focus.tab === 'tools' ? asset.attachmentId : null;
    useUiStore.getState().clearInspectorFocus();
  }, [asset, inspectorFocusToken]);

  useEffect(() => {
    if (tab !== 'tools' || !toolFocus) return;
    const panel = panelRef.current;
    if (!panel) return;
    const scrollToTool = () => {
      const target = panel.querySelector<HTMLElement>(`[data-frkt-tool="${toolFocus}"]`);
      const scroller = scrollRef.current;
      if (!target || !scroller) return;
      const tabs = scroller.querySelector<HTMLElement>('.frkt-inspector__tabs');
      const gap = 16;
      const stickyOffset = tabs?.offsetHeight ?? 0;
      const delta = target.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top
        - stickyOffset
        - gap;
      if (Math.abs(delta) > 2) scroller.scrollTop += delta;
    };
    const frame = window.requestAnimationFrame(scrollToTool);
    const observer = new ResizeObserver(scrollToTool);
    panel.querySelectorAll<HTMLElement>('[data-frkt-tool]').forEach((section) => observer.observe(section));
    const stop = window.setTimeout(() => observer.disconnect(), 1200);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.clearTimeout(stop);
    };
  }, [tab, toolFocus, asset?.attachmentId]);

  const optimizePreviewQuery = useQuery({
    queryKey: ['optimize-preview', attachmentId, quality],
    queryFn: () => api.optimizeAsset(attachmentId!, { preview: true, quality }),
    enabled: !!attachmentId && (canShowOptimize || canShowReplace),
    placeholderData: keepPreviousData,
  });
  const videoPreviewQuery = useQuery({
    queryKey: ['video-optimize', attachmentId],
    queryFn: () => api.previewVideoOptimize(attachmentId!),
    enabled: !!attachmentId && canShowVideoOptimizer,
    refetchInterval: (query) => (isOpenJob(query.state.data?.job?.status) ? 1500 : false),
  });
  const videoRestoreJobQuery = useQuery({
    queryKey: ['job', videoRestoreJobId],
    queryFn: () => api.getJob(videoRestoreJobId!),
    enabled: Boolean(videoRestoreJobId),
    refetchInterval: (query) => (isOpenJob(query.state.data?.status) ? 1000 : false),
  });
  const originalPreviewUrl = typeof optimizePreviewQuery.data?.originalPreviewUrl === 'string'
    ? optimizePreviewQuery.data.originalPreviewUrl
    : '';

  useEffect(() => {
    const last = Number(optimizePreviewQuery.data?.lastQuality);
    if (Number.isFinite(last) && last >= 1 && last <= 100) {
      setQuality(last);
    } else if (attachmentId) {
      setQuality(100);
    }
  }, [attachmentId, optimizePreviewQuery.data?.lastQuality]);

  useEffect(() => {
    setOptimizeConfirm(false);
    setRestoreConfirm(false);
    setVideoRestoreConfirm(false);
    setVideoRestoreJobId(null);
    completedVideoRestoreJob.current = null;
    setOriginalPreviewOpen(false);
    setCurrentPreviewOpen(false);
    setDeleteOriginalConfirm(false);
    setOptimizeStatus('');
  }, [quality, attachmentId]);

  useEffect(() => {
    if (scrollRef.current && !(tab === 'tools' && toolFocus)) scrollRef.current.scrollTop = 0;
  }, [tab, toolFocus]);

  useEffect(() => {
    if (!attachmentId || !autosaveReady.current || generatingField) return;

    const next = { title, altText, caption, description, locale };
    const prev = lastSaved.current;
    const dirty =
      next.title !== prev.title ||
      next.altText !== prev.altText ||
      next.caption !== prev.caption ||
      next.description !== prev.description ||
      next.locale !== prev.locale;
    if (!dirty) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      api
        .updateAsset(attachmentId, { title, altText, caption, description, locale })
        .then((updated) => {
          lastSaved.current = { title, altText, caption, description, locale };
          setActiveAsset(updated);
          setSaveStatus('saved');
          toast.success(toastT('toastChangesSaved'));
          qc.invalidateQueries({ queryKey: ['assets'] });
          qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
        })
        .catch((e: Error) => {
          setSaveStatus('error');
          toast.error(toastError('toastChangesSaveFailed', e));
        });
    }, 700);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, altText, caption, description, locale, attachmentId, generatingField]);

  const optimizeMutation = useMutation({
    mutationFn: () =>
      runWithAssetEditing(asset, () =>
        api.optimizeAsset(attachmentId!, { preview: false, confirmed: true, quality })
      ),
    onMutate: () => {
      setOptimizeStatus('');
    },
    onSuccess: (res) => {
      const saved = Number(res.savingsBytes ?? 0);
      const applied = res.applied !== false && res.status === 'optimized';
      const text = applied
        ? toastT('toastOptimized', { bytes: saved.toLocaleString(), quality })
        : typeof res.message === 'string' && res.message
          ? String(res.message)
          : toastT('toastOptimizeSkipped');
      setOptimizeStatus(text);
      if (applied) toast.success(text);
      else toast.info(text);
      setOptimizeConfirm(false);
      // Don't await refresh — keeps isPending stuck if refetch hangs.
      if (applied && attachmentId) {
        void refreshMediaAfterFileChange(qc, attachmentId);
      } else if (attachmentId) {
        void qc.invalidateQueries({ queryKey: ['optimize-preview', attachmentId] });
      }
    },
    onError: (e: Error) => {
      const text = toastError('toastOptimizeFailed', e);
      setOptimizeStatus(text);
      toast.error(text);
      setOptimizeConfirm(false);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => runWithAssetEditing(asset, () => api.restoreOptimizedAsset(attachmentId!)),
    onMutate: () => {
      setOptimizeStatus('');
    },
    onSuccess: () => {
      const text = toastT('toastRestored');
      setOptimizeStatus(text);
      toast.success(text);
      setRestoreConfirm(false);
      if (attachmentId) {
        void refreshMediaAfterFileChange(qc, attachmentId).then(() =>
          Promise.all([
            qc.invalidateQueries({ queryKey: ['optimize-preview', attachmentId] }),
            qc.invalidateQueries({ queryKey: ['image-edit', attachmentId] }),
          ])
        );
      }
    },
    onError: (e: Error) => {
      const text = toastError('toastRestoreFailed', e);
      setOptimizeStatus(text);
      toast.error(text);
      setRestoreConfirm(false);
    },
  });

  const videoRestoreMutation = useMutation({
    mutationFn: () => runWithAssetEditing(asset, () => api.restoreVideo(attachmentId!)),
    onSuccess: (response) => {
      completedVideoRestoreJob.current = null;
      setVideoRestoreJobId(response.jobId);
      setVideoRestoreConfirm(false);
      toast.success(t('videoRestoreQueued'));
      trackJobNotification(response.jobId, { success: t('videoCompleted'), failure: t('videoFailed') }, asset);
      kickJobPump();
      if (attachmentId) void qc.invalidateQueries({ queryKey: ['video-optimize', attachmentId] });
    },
    onError: (e: Error) => {
      toast.error(e.message || t('videoFailed'));
      setVideoRestoreConfirm(false);
    },
  });

  const videoRestoreJob = videoRestoreJobQuery.data ?? null;
  const videoRestoreBusy = videoRestoreMutation.isPending || isOpenJob(videoRestoreJob?.status);

  useEffect(() => {
    if (!videoRestoreJobId || !videoRestoreJob || isOpenJob(videoRestoreJob.status)) return;
    if (completedVideoRestoreJob.current === videoRestoreJobId) return;
    completedVideoRestoreJob.current = videoRestoreJobId;
    if (videoRestoreJob.status === 'completed') {
      if (attachmentId) {
        void refreshMediaAfterFileChange(qc, attachmentId).then(() =>
          qc.invalidateQueries({ queryKey: ['video-optimize', attachmentId] })
        );
      }
      return;
    }
  }, [videoRestoreJobId, videoRestoreJob?.status, videoRestoreJob?.error, attachmentId, qc, t]);

  const deleteOriginalMutation = useMutation({
    mutationFn: () => api.deleteOriginalBackup(attachmentId!),
    onMutate: () => setOptimizeStatus(''),
    onSuccess: () => {
      const text = toastT('toastOriginalDeleted');
      setOptimizeStatus(text);
      toast.success(text);
      setDeleteOriginalConfirm(false);
      if (attachmentId) {
        void refreshMediaAfterFileChange(qc, attachmentId).then(() =>
          qc.invalidateQueries({ queryKey: ['optimize-preview', attachmentId] })
        );
      }
    },
    onError: (e: Error) => {
      const text = toastError('toastOriginalDeleteFailed', e);
      setOptimizeStatus(text);
      toast.error(text);
      setDeleteOriginalConfirm(false);
    },
  });

  const replaceMutation = useMutation({
    mutationFn: () => {
      if (!replaceFile || !attachmentId) {
        throw new Error(toastT('toastReplaceFailed'));
      }
      return runWithAssetEditing(asset, () =>
        api.replaceAsset(attachmentId, replaceFile, { confirmed: true })
      );
    },
    onMutate: () => {
      setReplaceStatus('');
    },
    onSuccess: (res) => {
      const text = toastT('toastReplaced');
      setReplaceStatus(String(res.message || text));
      toast.success(text);
      setReplaceConfirm(false);
      setReplaceFile(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
      if (attachmentId) {
        void refreshMediaAfterFileChange(qc, attachmentId, {
          asset: (res.asset as MediaAsset | undefined) ?? null,
        });
      }
    },
    onError: (e: Error) => {
      const text = toastError('toastReplaceFailed', e);
      setReplaceStatus(text);
      toast.error(text);
      setReplaceConfirm(false);
    },
  });

  const proposedRenameFilename = (() => {
    const stem = renameStem.trim();
    if (!stem) return '';
    const extension = isMissingFile ? renameExtension.trim() : currentNameParts.ext;
    return extension ? `${stem}.${extension}` : stem;
  })();

  const renamePreviewMutation = useMutation({
    mutationFn: () => {
      if (!attachmentId || !proposedRenameFilename) {
        throw new Error(toastT('toastRenameFailed'));
      }
      return api.renameAsset(attachmentId, {
        filename: proposedRenameFilename,
        confirmed: false,
      });
    },
    onMutate: () => {
      setRenameStatus('');
      setRenamePreview(null);
    },
    onSuccess: (res) => {
      setRenamePreview({
        message: String(res.message || ''),
        newFilename: String(res.newFilename || proposedRenameFilename),
        referencesCount: Number(res.referencesCount ?? 0),
      });
      setRenameConfirm(true);
    },
    onError: (e: Error) => {
      const text = toastError('toastRenameFailed', e);
      setRenameStatus(text);
      toast.error(text);
    },
  });

  const renameApplyMutation = useMutation({
    mutationFn: () => {
      if (!attachmentId || !proposedRenameFilename) {
        throw new Error(toastT('toastRenameFailed'));
      }
      return runWithAssetEditing(asset, () =>
        api.renameAsset(attachmentId, {
          filename: proposedRenameFilename,
          confirmed: true,
        })
      );
    },
    onSuccess: (res) => {
      const text = toastT('toastRenamed');
      setRenameStatus(String(res.message || text));
      toast.success(text);
      setRenameConfirm(false);
      setRenamePreview(null);
      const nextName = String(res.newFilename || proposedRenameFilename);
      const nextNameParts = splitFilename(nextName);
      setRenameStem(nextNameParts.stem);
      setRenameExtension(nextNameParts.ext);
      if (attachmentId) {
        void refreshMediaAfterFileChange(qc, attachmentId, {
          asset: (res.asset as MediaAsset | undefined) ?? null,
        });
      }
    },
    onError: (e: Error) => {
      const text = toastError('toastRenameFailed', e);
      setRenameStatus(text);
      toast.error(text);
      setRenameConfirm(false);
    },
  });

  const renameAiAbortRef = useRef<AbortController | null>(null);
  const renameAiMutation = useMutation({
    mutationFn: () => {
      if (!attachmentId) throw new Error(toastT('toastRenameAiFailed'));
      renameAiAbortRef.current?.abort();
      const ac = new AbortController();
      renameAiAbortRef.current = ac;
      return runWithAssetEditing(asset, () => api.suggestFilename(attachmentId, ac.signal));
    },
    onMutate: () => {
      setRenameStatus('');
      setRenamePreview(null);
      aiDismissed.current = false;
      wasAnalyzing.current = true;
      if (attachmentId) {
        qc.setQueryData(['asset', attachmentId], (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return { ...(old as object), aiStatus: 'analyzing' };
        });
        const current = useUiStore.getState().activeAsset;
        if (current && current.attachmentId === attachmentId) {
          setActiveAsset({ ...current, aiStatus: 'analyzing' });
        }
      }
    },
    onSuccess: (res) => {
      const stem = String(res.stem || '').trim();
      if (!stem) {
        toast.error(toastT('toastRenameAiFailed'));
        return;
      }
      setRenameStem(stem);
      setRenameStatus('');
      setRenamePreview(null);
      toast.success(toastT('toastRenameAiSuggested'));
      if (res.asset) setActiveAsset(res.asset as MediaAsset);
      else if (attachmentId) {
        void qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
      }
      void qc.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (e: Error) => {
      const aborted = e.name === 'AbortError' || /abort/i.test(e.message);
      if (aborted) {
        toast.info(toastT('toastAiCancelled'));
        return;
      }
      const msg = e.message || '';
      toast.error(/api key/i.test(msg) ? toastT('toastAiNoApiKey') : toastError('toastRenameAiFailed', e));
      if (attachmentId) void qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
    },
    onSettled: () => {
      renameAiAbortRef.current = null;
      wasAnalyzing.current = false;
    },
  });

  const requestRenameAi = () => {
    if (!hasAiApiKey) {
      toast.error(toastT('toastAiNoApiKey'));
      return;
    }
    renameAiMutation.mutate();
  };

  const generateMutation = useMutation({
    mutationFn: ({ field, regenerateFilename = false, translateAll = false }: { field: AiField; regenerateFilename?: boolean; translateAll?: boolean }) => {
      generateAbortRef.current?.abort();
      const ac = new AbortController();
      generateAbortRef.current = ac;
      return runWithAssetEditing(asset, () =>
        api.generateField(attachmentId!, field, locale, ac.signal, regenerateFilename, translateAll)
      );
    },
    onMutate: ({ field }) => {
      autosaveReady.current = false;
      setGeneratingField(field);
      setSaveStatus('idle');
      aiDismissed.current = false;
      wasAnalyzing.current = true;
      // Optimistic analyzing so the overlay stays up across the queue → poll handoff.
      if (attachmentId) {
        qc.setQueryData(['asset', attachmentId], (old: unknown) => {
          if (!old || typeof old !== 'object') return old;
          return { ...(old as object), aiStatus: 'analyzing' };
        });
        const current = useUiStore.getState().activeAsset;
        if (current && current.attachmentId === attachmentId) {
          setActiveAsset({ ...current, aiStatus: 'analyzing' });
        }
      }
    },
    onSuccess: (res) => {
      // Background job — keep overlay via aiStatus=analyzing and poll.
      if (res.queued) {
        aiJobIdRef.current = typeof res.jobId === 'number' && res.jobId > 0 ? res.jobId : null;
        if (aiJobIdRef.current) trackAssetJob(aiJobIdRef.current, asset);
        wasAnalyzing.current = true;
        if (attachmentId) {
          qc.setQueryData(['asset', attachmentId], (old: unknown) => {
            if (!old || typeof old !== 'object') return old;
            return { ...(old as object), aiStatus: 'analyzing' };
          });
        }
        const current = useUiStore.getState().activeAsset;
        if (current && current.attachmentId === attachmentId) {
          setActiveAsset({ ...current, aiStatus: 'analyzing' });
        }
        toast.info(toastT('toastAiQueued'));
        kickJobPump();
        // List badges only — avoid refetching the open asset (causes overlay flicker).
        void qc.invalidateQueries({ queryKey: ['assets'] });
        autosaveReady.current = true;
        return;
      }
      if (res.field === 'all' && res.values) {
        setTitle(res.values.title);
        setAltText(res.values.altText);
        setCaption(res.values.caption);
        setDescription(res.values.description);
        lastSaved.current = {
          title: res.values.title,
          altText: res.values.altText,
          caption: res.values.caption,
          description: res.values.description,
          locale,
        };
        toast.success(toastT('toastAiAllSaved'));
      } else if (res.value != null && res.field) {
        if (res.field === 'title') setTitle(res.value);
        else if (res.field === 'altText') setAltText(res.value);
        else if (res.field === 'caption') setCaption(res.value);
        else if (res.field === 'description') setDescription(res.value);
        lastSaved.current = {
          ...lastSaved.current,
          locale,
          ...(res.field === 'title' ? { title: res.value } : {}),
          ...(res.field === 'altText' ? { altText: res.value } : {}),
          ...(res.field === 'caption' ? { caption: res.value } : {}),
          ...(res.field === 'description' ? { description: res.value } : {}),
        };
        const fieldLabel =
          res.field === 'title'
            ? t('titleField')
            : res.field === 'altText'
              ? t('altText')
              : res.field === 'caption'
                ? t('caption')
                : res.field === 'description'
                  ? t('description')
                  : res.field;
        toast.success(toastT('toastAiFieldSaved', { field: fieldLabel }));
      }
      setSaveStatus('saved');
      if (res.field === 'all' && attachmentId) {
        const next = (res.asset as MediaAsset | undefined) ?? null;
        if (next?.filename) {
          const nextNameParts = splitFilename(next.filename);
          setRenameStem(nextNameParts.stem);
          setRenameExtension(nextNameParts.ext);
        }
        void refreshMediaAfterFileChange(qc, attachmentId, { asset: next });
      } else {
        if (res.asset) setActiveAsset(res.asset as MediaAsset);
        qc.invalidateQueries({ queryKey: ['assets'] });
        qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
      }
      window.setTimeout(() => {
        autosaveReady.current = true;
      }, 50);
    },
    onError: (e: Error) => {
      const aborted =
        e.name === 'AbortError' || /abort/i.test(e.message) || generateAbortRef.current?.signal.aborted;
      if (aborted) {
        toast.info(toastT('toastAiCancelled'));
        autosaveReady.current = true;
        return;
      }
      wasAnalyzing.current = false;
      if (attachmentId) {
        void qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
      }
      const current = useUiStore.getState().activeAsset;
      if (current && current.attachmentId === attachmentId && current.aiStatus === 'analyzing') {
        setActiveAsset({ ...current, aiStatus: 'pending' });
      }
      const msg = e.message || '';
      toast.error(/api key/i.test(msg) ? toastT('toastAiNoApiKey') : toastError('toastAiFailed', e));
      autosaveReady.current = true;
    },
    onSettled: () => {
      generateAbortRef.current = null;
      setGeneratingField(null);
    },
  });

  const requestGenerate = (field: AiField) => {
    if (!hasAiApiKey) {
      toast.error(toastT('toastAiNoApiKey'));
      return;
    }
    if (field === 'all') {
      setRegenerateFilename(false);
      setTranslateOtherLanguages(false);
      setGenerateAllConfirm(true);
      return;
    }
    if (hasMultipleLocales) {
      setTranslateOtherLanguages(false);
      setGenerateTranslationConfirm(field);
      return;
    }
    generateMutation.mutate({ field });
  };

  const cancelAiGeneration = () => {
    const ac = generateAbortRef.current;
    generateAbortRef.current = null;
    ac?.abort();
    renameAiAbortRef.current?.abort();
    renameAiAbortRef.current = null;
    setGeneratingField(null);
    aiDismissed.current = true;
    wasAnalyzing.current = false;
    if (attachmentId) {
      qc.setQueryData(['asset', attachmentId], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        return { ...(old as object), aiStatus: 'pending' };
      });
    }
    if (asset) {
      setActiveAsset({ ...asset, aiStatus: 'pending' });
    }
    const jobId = aiJobIdRef.current;
    aiJobIdRef.current = null;
    if (jobId) {
      void api
        .cancelJob(jobId)
        .then(() => {
          if (asset) setActiveAsset({ ...asset, aiStatus: 'pending' });
          void qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
          void qc.invalidateQueries({ queryKey: ['assets'] });
        })
        .catch(() => undefined);
    }
    toast.info(toastT('toastAiCancelled'));
    autosaveReady.current = true;
  };

  const scanMutation = useMutation({
    mutationFn: () => api.scanReferences(attachmentId!),
    onSuccess: () => {
      kickJobPump();
      qc.invalidateQueries({ queryKey: ['assets'] });
      qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
      toast.success(t('scanQueuedBackground'));
    },
    onError: (e: Error) => toast.error(toastError('toastUsageFailed', e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api.bulkDelete([attachmentId!], {
        confirmed: true,
        force: true,
        skipUsed: false,
      }),
    onSuccess: async (res) => {
      const id = attachmentId!;
      setDeleteConfirm(false);
      setInspectorOpen(false);
      setActiveAsset(null);
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter((x) => x !== id));
      }
      const removed = (res.deleted?.length ?? 0) > 0;
      toast.success(
        removed ? toastT('toastTrashed') : (res.message || toastT('toastTrashed'))
      );
      await Promise.all([
        refreshDuplicatesAfterAttachmentChange(qc, id),
        invalidateLibraryQueries(qc, [
          'folders',
          'collections',
          'collection-assets',
          'unused',
          'asset',
        ]),
      ]);
      qc.removeQueries({ queryKey: ['asset', id] });
    },
    onError: async (e: Error) => {
      toast.error(toastError('toastTrashFailed', e));
      setDeleteConfirm(false);
      await refreshDuplicatesAfterAttachmentChange(qc, attachmentId!);
      await invalidateLibraryQueries(qc, ['unused', 'asset']);
      setInspectorOpen(false);
      setActiveAsset(null);
    },
  });

  const open = inspectorOpen && !!activeAsset;
  const references: MediaReference[] = (detailQuery.data?.references as MediaReference[]) || [];
  const usageCount = detailQuery.data?.usageCount ?? activeAsset?.usageCount ?? 0;
  const isAiGenerating =
    generatingField !== null || generateMutation.isPending || renameAiMutation.isPending;
  const showAiLoading = !isFreeBuild && (isAiAnalyzing || isAiGenerating);
  const aiLoadingLabel = renameAiMutation.isPending
    ? t('suggestingFilename')
    : isAiGenerating
      ? generatingField === 'all'
        ? t('generatingAll')
        : t('generatingWithAi')
      : t('analyzingWithAi');
  const generateBusy =
    generateMutation.isPending || renameAiMutation.isPending || isAiAnalyzing;
  const visibleInspectorTabs = INSPECTOR_TABS.filter((item) => {
    if (item.id === 'ai-edit') {
      return isFreeBuild || (canShowAiImageEdit && Boolean(AiImageEditTool));
    }
    if (item.id !== 'tools') return true;
    if (isFreeBuild) return true;
    return (
      isFeatureEnabled('optimize') ||
      isFeatureEnabled('image_edit') ||
      isFeatureEnabled('image_resize') ||
      isFeatureEnabled('format_convert') ||
      isFeatureEnabled('video_optimizer') ||
      isFeatureEnabled('remove_background') ||
      isFeatureEnabled('replace_file') ||
      isFeatureEnabled('rename_file')
    );
  });

  const closeInspector = () => setInspectorOpen(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  const onInspectorTouchStart = (event: TouchEvent) => {
    if (!open || window.innerWidth > 782) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onInspectorTouchEnd = (event: TouchEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || !open || window.innerWidth > 782) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 72 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('input, textarea, select, .frkt-inspector__tabs')
    ) {
      return;
    }
    closeInspector();
  };

  const goPrev = () => {
    if (prevAsset) setActiveAsset(prevAsset);
  };
  const goNext = () => {
    if (nextAsset) setActiveAsset(nextAsset);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        closeInspector();
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (typing) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prevAsset, nextAsset]);

  const aiButton = (field: AiField) =>
    isFreeBuild ? (
    <button
      type="button"
      className="button-link frkt-field__ai is-pro-locked"
      disabled
      title={t('proFeatureLocked')}
    >
      <Lock {...iconPropsSm} />
      <span>{t('generateWithAi')}</span>
    </button>
    ) : canShowAiMeta ? (
    <button
      type="button"
      className="button-link frkt-field__ai"
      disabled={generateBusy}
      onClick={() => requestGenerate(field)}
    >
      {generatingField === field ? <LoaderCircle {...iconPropsSm} className="frkt-field__ai-spinner" /> : <Sparkles {...iconPropsSm} />}
      <span>{generatingField === field ? t('generating') : t('generateWithAi')}</span>
    </button>
    ) : null;

  useAssetEditing(
    asset,
    optimizeMutation.isPending ||
      restoreMutation.isPending ||
      videoRestoreBusy ||
      replaceMutation.isPending ||
      renameApplyMutation.isPending ||
      generateMutation.isPending ||
      isAiAnalyzing
  );

  const saveLabel =
    saveStatus === 'saving'
      ? t('saving')
      : saveStatus === 'saved'
        ? t('saved')
        : saveStatus === 'error'
          ? t('saveFailed')
          : null;
  const imageOriginalAvailable = !canShowVideoOptimizer && Boolean(
    optimizePreviewQuery.data?.canRestore ?? optimizePreviewQuery.data?.hasBackup
  );
  const videoOriginalAvailable = canShowVideoOptimizer && Boolean(videoPreviewQuery.data?.hasOriginal);

  return (
    <>
      <button
        type="button"
        className={`frkt-inspector-backdrop ${open ? 'is-visible' : ''}`}
        aria-label={t('closeInspector')}
        tabIndex={open ? 0 : -1}
        onClick={closeInspector}
      />
      <aside
        ref={inspectorRef}
        className={`frkt-inspector ${open ? 'is-open' : ''}`}
        style={{ '--frkt-inspector-current-w': `${inspectorWidth}px` } as CSSProperties}
        aria-hidden={!open}
        aria-label={t('mediaInspector')}
        onTouchStart={onInspectorTouchStart}
        onTouchEnd={onInspectorTouchEnd}
        onTouchCancel={() => {
          swipeStart.current = null;
        }}
      >
        <div
          className="frkt-inspector__resize-handle"
          role="separator"
          aria-orientation="vertical"
          aria-label={t('resize')}
          aria-valuemin={INSPECTOR_MIN_WIDTH}
          aria-valuemax={inspectorMaxWidth()}
          aria-valuenow={inspectorWidth}
          tabIndex={open ? 0 : -1}
          title={t('resize')}
          onPointerDown={startInspectorResize}
          onKeyDown={resizeInspectorWithKeyboard}
          onDoubleClick={() => updateInspectorWidth(INSPECTOR_DEFAULT_WIDTH, true)}
        />
        <div className="frkt-inspector__scroll" ref={scrollRef}>
        <header>
          <h2>{t('inspectorHeading')}</h2>
          <div className="frkt-inspector__header-actions">
            <button
              type="button"
              className="frkt-inspector__nav"
              disabled={!prevAsset}
              aria-label={t('inspectorPrev')}
              title={t('inspectorPrev')}
              onClick={goPrev}
            >
              <ChevronLeft {...iconProps} />
            </button>
            <button
              type="button"
              className="frkt-inspector__nav"
              disabled={!nextAsset}
              aria-label={t('inspectorNext')}
              title={t('inspectorNext')}
              onClick={goNext}
            >
              <ChevronRight {...iconProps} />
            </button>
            <button
              type="button"
              className="button-link frkt-inspector__close"
              onClick={closeInspector}
            >
              {t('inspectorClose')}
            </button>
          </div>
        </header>

        {!activeAsset ? (
          <p className="frkt-muted">{t('inspectorEmpty')}</p>
        ) : (
          <>
            <div
              className="frkt-inspector__preview"
              style={{
                '--frkt-inspector-preview-ratio':
                  asset?.width && asset?.height ? `${asset.width} / ${asset.height}` : '4 / 3',
                '--frkt-inspector-preview-ratio-value':
                  asset?.width && asset?.height ? String(asset.width / asset.height) : String(4 / 3),
              } as CSSProperties}
            >
              {asset ? (
                <AssetInspectorPreview asset={asset} bustEpoch={previewEpoch} />
              ) : (
                <div className="frkt-inspector__preview-empty">{t('noPreview')}</div>
              )}
              {(asset?.url || activeAsset?.url) ? (
                <div className="frkt-inspector__preview-actions">
                  {imageOriginalAvailable ? (
                    <button
                      type="button"
                      className="frkt-inspector__preview-action"
                      disabled={!originalPreviewUrl}
                      onClick={() => setOriginalPreviewOpen(true)}
                      title={t('original')}
                      aria-label={t('original')}
                    >
                      <History {...iconPropsSm} />
                    </button>
                  ) : null}
                  {imageOriginalAvailable || videoOriginalAvailable ? (
                    <button
                      type="button"
                      className="frkt-inspector__preview-action"
                      disabled={restoreMutation.isPending || videoRestoreBusy}
                      onClick={() => canShowVideoOptimizer ? setVideoRestoreConfirm(true) : setRestoreConfirm(true)}
                      title={t('restoreOriginal')}
                      aria-label={t('restoreOriginal')}
                    >
                      <Undo2 {...iconPropsSm} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="frkt-inspector__preview-action"
                    title={t('inspectorCopyUrl')}
                    aria-label={t('inspectorCopyUrl')}
                    onClick={async () => {
                      const url = asset?.url || activeAsset?.url || '';
                      if (!url) {
                        toast.error(toastT('toastUrlCopyFailed'));
                        return;
                      }
                      const ok = await copyToClipboard(url);
                      if (ok) {
                        toast.success(toastT('toastUrlCopied'));
                      } else {
                        toast.error(toastT('toastUrlCopyFailed'));
                      }
                    }}
                  >
                    <Copy {...iconPropsSm} />
                  </button>
                  <a
                    className="frkt-inspector__preview-action"
                    href={asset?.url || activeAsset?.url || '#'}
                    download={asset?.filename || activeAsset?.filename || true}
                    title={t('inspectorDownload')}
                    aria-label={t('inspectorDownload')}
                    rel="noopener noreferrer"
                  >
                    <Download {...iconPropsSm} />
                  </a>
                  {isImageMime(asset?.mimeType) ? (
                    <button
                      type="button"
                      className="frkt-inspector__preview-action"
                      onClick={() => setCurrentPreviewOpen(true)}
                      title={t('aiEditZoomPreview')}
                      aria-label={t('aiEditZoomPreview')}
                    >
                      <ZoomIn {...iconPropsSm} />
                    </button>
                  ) : null}
                </div>
              ) : null}
              {showAiLoading ? (
                <div className="frkt-inspector__analyzing" role="status" aria-live="polite">
                  <div className="frkt-inspector__analyzing-inner">
                    <span className="frkt-inspector__analyzing-spin" aria-hidden="true" />
                    <span>{aiLoadingLabel}</span>
                    {showAiLoading ? (
                      <button
                        type="button"
                        className="button frkt-inspector__analyzing-cancel"
                        onClick={cancelAiGeneration}
                      >
                        {toastT('cancelAiGeneration')}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {imageOriginalAvailable ? (
                <div className="frkt-inspector__preview-restore">
                  <button
                    type="button"
                    className="frkt-inspector__delete-original-btn"
                    disabled={restoreMutation.isPending || deleteOriginalMutation.isPending}
                    onClick={() => setDeleteOriginalConfirm(true)}
                  >
                    {t('deleteOriginal')}
                  </button>
                </div>
              ) : null}
              {attachmentId ? (
                <div className="frkt-inspector__preview-delete">
                  <button
                    type="button"
                    className="frkt-inspector__delete-btn"
                    disabled={deleteMutation.isPending}
                    onClick={() => setDeleteConfirm(true)}
                  >
                    {t('deleteMedia')}
                  </button>
                </div>
              ) : null}
            </div>

            <nav
              className="frkt-tabs frkt-inspector__tabs"
              role="tablist"
              aria-label={t('inspectorSections')}
              onKeyDown={(event) => handleTablistKey(
                event,
                visibleInspectorTabs.map((item) => item.id),
                tab,
                (next) => {
                  setToolFocus(null);
                  if (next !== 'tools') toolOpenFor.current = null;
                  setTab(next);
                },
                (next) => `frkt-inspector-tab-${next}`
              )}
            >
              {visibleInspectorTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`frkt-inspector-tab-${item.id}`}
                  aria-controls={`frkt-inspector-panel-${item.id}`}
                  aria-selected={tab === item.id}
                  tabIndex={tab === item.id ? 0 : -1}
                  className={`${tab === item.id ? 'is-active' : ''}${isFreeBuild && (item.id === 'tools' || item.id === 'ai-edit') ? ' is-pro-locked' : ''}`}
                  onClick={() => {
                    setToolFocus(null);
                    if (item.id !== 'tools') toolOpenFor.current = null;
                    setTab(item.id);
                  }}
                >
                  {t(item.label)}
                  {isFreeBuild && (item.id === 'tools' || item.id === 'ai-edit') ? (
                    <Lock {...iconPropsSm} size={11} aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </nav>

            <div
              className="frkt-inspector__panel"
              role="tabpanel"
              id={`frkt-inspector-panel-${tab}`}
              aria-labelledby={`frkt-inspector-tab-${tab}`}
              tabIndex={0}
              ref={panelRef}
            >
              {tab === 'details' ? (
                <>
                  <section className="frkt-inspector__form">
                    <div className="frkt-section-head">
                      <h3>{t('details')}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {saveLabel ? (
                          <span className="frkt-muted" style={{ fontSize: 12 }}>
                            {saveLabel}
                          </span>
                        ) : null}
                        {isFeatureEnabled('multilingual') ? (
                          <select value={locale} onChange={(e) => setLocale(e.target.value)} aria-label={t('localeLabel')}>
                            {locales.map((code) => (
                              <option key={code} value={code}>
                                {localeLabel(code)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    </div>
                    <p className="frkt-inspector__desc">{t('detailsHint')}</p>
                    {isFreeBuild ? (
                    <button
                      type="button"
                      className="button frkt-pro-disabled-action"
                      disabled
                      title={t('proFeatureLocked')}
                    >
                      <Lock {...iconPropsSm} />
                      <span>{t('generateAllData')}</span>
                      <span className="frkt-pro-disabled-action__badge">Pro</span>
                    </button>
                    ) : canShowAiMeta ? (
                    <button
                      type="button"
                      className="button"
                      style={{ width: '100%', marginBottom: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      disabled={generateBusy}
                      onClick={() => requestGenerate('all')}
                    >
                      {(showAiLoading && isAiAnalyzing) || generatingField === 'all' ? (
                        <LoaderCircle {...iconPropsSm} className="frkt-field__ai-spinner" />
                      ) : (
                        <Sparkles {...iconPropsSm} />
                      )}
                      <span>
                        {showAiLoading && isAiAnalyzing
                          ? t('analyzing')
                          : generatingField === 'all'
                            ? t('generating')
                            : t('generateAllData')}
                      </span>
                    </button>
                    ) : null}
                    <div data-frkt-tour="inspector">
                    <label className="frkt-field">
                      <span>{t('titleField')}</span>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                      <span className="frkt-field__hint">{t('titleHint')}</span>
                      {aiButton('title')}
                    </label>
                    {canShowAltText ? (
                      <label className="frkt-field">
                        <span>{t('altText')}</span>
                        <input type="text" value={altText} onChange={(e) => setAltText(e.target.value)} />
                        <span className="frkt-field__hint">{t('altHint')}</span>
                        {aiButton('altText')}
                      </label>
                    ) : null}
                    <label className="frkt-field">
                      <span>{canShowAltText ? t('caption') : t('shortDescription')}</span>
                      <textarea rows={2} value={caption} onChange={(e) => setCaption(e.target.value)} />
                      <span className="frkt-field__hint">
                        {canShowAltText ? t('captionHint') : t('shortDescHint')}
                      </span>
                      {aiButton('caption')}
                    </label>
                    </div>
                    <label className="frkt-field frkt-field--description">
                      <span>{t('description')}</span>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      <span className="frkt-field__hint">{t('descriptionHint')}</span>
                      {aiButton('description')}
                    </label>
                  </section>

                  <section className="frkt-inspector__form">
                    <div className="frkt-section-head">
                      <h3>{t('usageHeading', { count: usageCount })}</h3>
                      {canScanUsage ? (
                        <button
                          type="button"
                          className="button-link"
                          disabled={scanMutation.isPending}
                          onClick={() => scanMutation.mutate()}
                        >
                          {scanMutation.isPending ? t('scanning') : t('rescan')}
                        </button>
                      ) : null}
                    </div>
                    <p className="frkt-inspector__desc">
                      {canScanUsage ? t('usageHint') : t('usageHintShort')}
                    </p>
                    {detailQuery.isLoading ? (
                      <p className="frkt-muted">{t('loading')}</p>
                    ) : references.length === 0 ? (
                      <p className="frkt-muted">
                        {canScanUsage ? t('noUsageYet') : t('noUsageShort')}
                      </p>
                    ) : (
                      <ul className="frkt-usage-list">
                        {references.map((ref) => {
                          const refTitle = ref.title || ref.context || ref.sourceType;
                          const href = ref.editUrl || ref.url || undefined;
                          const where = [ref.postType, ref.detail].filter(Boolean).join(' · ');
                          return (
                            <li key={ref.id}>
                              <div className="frkt-usage-list__main">
                                {href ? (
                                  <a
                                    className="frkt-usage-list__title"
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {refTitle}
                                  </a>
                                ) : (
                                  <strong className="frkt-usage-list__title">{refTitle}</strong>
                                )}
                                {where ? <span className="frkt-usage-list__detail">{where}</span> : null}
                              </div>
                              <span className={`frkt-conf frkt-conf--${ref.confidence}`}>
                                {formatConfidence(ref.confidence, t)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  {canShowFolders ? (
                  <section className="frkt-inspector__form">
                    <h3>{t('foldersHeading')}</h3>
                    <p className="frkt-inspector__desc">
                      {t('foldersVirtualHint')}
                    </p>
                    <FolderMembership
                      folderIds={asset?.folderIds ?? []}
                      attachmentId={attachmentId}
                      onRemoved={async () => {
                        if (!attachmentId) return;
                        const updated = await api.getAsset(attachmentId);
                        setActiveAsset(updated);
                        qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
                        qc.invalidateQueries({ queryKey: ['assets'] });
                        qc.invalidateQueries({ queryKey: ['folders'] });
                      }}
                    />
                    {attachmentId ? (
                      <div className="frkt-folder-assign-block">
                        <label className="frkt-field">
                          <span>{t('addToFolder')}</span>
                          <FolderAssignControl
                            attachmentIds={[attachmentId]}
                            defaultFolderId={
                              browseFolderId && asset?.folderIds?.includes(browseFolderId)
                                ? browseFolderId
                                : asset?.folderIds?.[0] ?? browseFolderId ?? null
                            }
                            onAssigned={async () => {
                              const updated = await api.getAsset(attachmentId);
                              setActiveAsset(updated);
                              qc.invalidateQueries({ queryKey: ['asset', attachmentId] });
                              qc.invalidateQueries({ queryKey: ['assets'] });
                              qc.invalidateQueries({ queryKey: ['folders'] });
                            }}
                          />
                          <span className="frkt-field__hint">{t('assignFolderHint')}</span>
                        </label>
                      </div>
                    ) : null}
                  </section>
                  ) : null}
                </>
              ) : null}

              {isFreeBuild && tab === 'tools' ? (
                <LockedProShowcase items={PRO_TOOL_PREVIEW} />
              ) : null}

              {!isFreeBuild && tab === 'tools' ? (
                <>
                  {canShowRename ? (
                    <section className="frkt-inspector__form" data-frkt-tool="rename">
                      <h3>{t('renameFile')}</h3>
                      <p className="frkt-inspector__desc">{t('renameHint')}</p>
                      <label className="frkt-field" htmlFor="frkt-rename-stem">
                        <span>{t('newFilename')}</span>
                        <div className="frkt-rename__row">
                          <input
                            id="frkt-rename-stem"
                            type="text"
                            value={renameStem}
                            disabled={
                              !attachmentId ||
                              renamePreviewMutation.isPending ||
                              renameApplyMutation.isPending ||
                              renameAiMutation.isPending
                            }
                            onChange={(e) => {
                              setRenameStem(e.target.value);
                              setRenameStatus('');
                              setRenamePreview(null);
                            }}
                            spellCheck={false}
                            autoComplete="off"
                          />
                          {isMissingFile ? (
                            <div className="frkt-rename__ext-edit">
                              <span aria-hidden="true">.</span>
                              <input
                                id="frkt-rename-extension"
                                type="text"
                                aria-label={t('extension')}
                                value={renameExtension}
                                disabled={
                                  !attachmentId ||
                                  renamePreviewMutation.isPending ||
                                  renameApplyMutation.isPending ||
                                  renameAiMutation.isPending
                                }
                                onChange={(e) => {
                                  setRenameExtension(
                                    e.target.value
                                      .replace(/^\.+/, '')
                                      .replace(/[^a-zA-Z0-9]+/g, '')
                                      .toLowerCase(),
                                  );
                                  setRenameStatus('');
                                  setRenamePreview(null);
                                }}
                                spellCheck={false}
                                autoComplete="off"
                              />
                            </div>
                          ) : currentNameParts.ext ? (
                            <span className="frkt-rename__ext" aria-hidden="true">
                              .{currentNameParts.ext}
                            </span>
                          ) : null}
                        </div>
                        <span className="frkt-field__hint">
                          {t(isMissingFile ? 'renameMissingExtHint' : 'renameExtHint')}
                        </span>
                        {canShowRenameAi ? (
                          <button
                            type="button"
                            className="button-link frkt-field__ai"
                            disabled={
                              !attachmentId ||
                              generateBusy ||
                              renamePreviewMutation.isPending ||
                              renameApplyMutation.isPending
                            }
                            onClick={() => requestRenameAi()}
                          >
                            {renameAiMutation.isPending ? <LoaderCircle {...iconPropsSm} className="frkt-field__ai-spinner" /> : <Sparkles {...iconPropsSm} />}
                            <span>{renameAiMutation.isPending ? t('generating') : t('generateWithAi')}</span>
                          </button>
                        ) : null}
                      </label>
                      <button
                        type="button"
                        className="button button-primary"
                        disabled={
                          !attachmentId ||
                          !renameStem.trim() ||
                          !proposedRenameFilename ||
                          proposedRenameFilename.toLowerCase() === (asset?.filename || '').toLowerCase() ||
                          renamePreviewMutation.isPending ||
                          renameApplyMutation.isPending ||
                          renameAiMutation.isPending
                        }
                        onClick={() => renamePreviewMutation.mutate()}
                      >
                        {renamePreviewMutation.isPending ? t('checking') : t('renameFile')}
                      </button>
                      {renameStatus ? (
                        <p className="frkt-notice frkt-optimize__status">{renameStatus}</p>
                      ) : null}
                    </section>
                  ) : null}

                  {canShowOptimize ? (
                    <section className="frkt-inspector__form" data-frkt-tool="optimize">
                      <h3>{t('optimizeHeading')}</h3>
                      <p className="frkt-inspector__desc">{t('optimizeDesc')}</p>
                      {(() => {
                        const preview = optimizePreviewQuery.data;
                        const canOptimize = Boolean(preview?.canOptimize);
                        const currentBytes = Number(preview?.currentBytes ?? 0);
                        const sourceFile = String(preview?.sourceFile ?? '');
                        const isPng = preview?.mime === 'image/png';
                        const pngLevel = Math.round(((100 - quality) / 100) * 9);
                        const toolsBusy = optimizeMutation.isPending;
                        return (
                          <div className="frkt-optimize">
                            <label className="frkt-field frkt-optimize__slider">
                              <div className="frkt-optimize__slider-head">
                                <span>{isPng ? t('pngCompression') : t('quality')}</span>
                                <strong>{isPng ? `${pngLevel}/9` : `${quality}%`}</strong>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={100}
                                step={1}
                                value={quality}
                                disabled={!attachmentId || toolsBusy}
                                style={
                                  {
                                    ['--frkt-range-pct' as string]: `${((quality - 1) / 99) * 100}%`,
                                  } as React.CSSProperties
                                }
                                onChange={(e) => setQuality(Number(e.target.value))}
                              />
                              <div className="frkt-optimize__slider-ends">
                                <span>{t('smallerFile')}</span>
                                <span>{isPng ? t('faster') : t('higherQuality')}</span>
                              </div>
                              <span className="frkt-field__hint">{isPng ? t('pngCompressionHint') : t('qualityHint')}</span>
                            </label>
                            {optimizePreviewQuery.isLoading && !preview ? (
                              <p className="frkt-muted frkt-optimize__estimate" aria-live="polite">
                                {t('loading')}
                              </p>
                            ) : preview ? (
                              <p
                                className={`frkt-muted frkt-optimize__estimate${
                                  optimizePreviewQuery.isFetching ? ' is-updating' : ''
                                }`}
                                aria-busy={optimizePreviewQuery.isFetching}
                              >
                                {t('optimizeSourceLabel', { file: sourceFile || t('title') })}: {currentBytes.toLocaleString()} {t('bytesWord')}
                              </p>
                            ) : (
                              <p className="frkt-muted frkt-optimize__estimate" aria-hidden="true">
                                &nbsp;
                              </p>
                            )}
                            <div className="frkt-optimize__actions">
                              <button
                                type="button"
                                className="button button-primary"
                                disabled={!canOptimize || toolsBusy}
                                onClick={() => setOptimizeConfirm(true)}
                              >
                                {isPng ? t('optimize') : t('optimizeButton', { quality })}
                              </button>
                            </div>
                            {optimizeStatus ? (
                              <p className="frkt-notice frkt-optimize__status">{optimizeStatus}</p>
                            ) : null}
                            {preview && !canOptimize ? (
                              <p className="frkt-muted">{String(preview.note || '')}</p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </section>
                  ) : null}

                  {canShowImageEdit && asset && attachmentId && ImageEditTool ? (
                    <section className="frkt-inspector__form" data-frkt-tool="crop">
                      <h3>{t('cropRotate')}</h3>
                      <p className="frkt-inspector__desc">
                        {t('cropToolHint')}
                      </p>
                      <ImageEditTool
                        key={`edit-${attachmentId}-${asset.fileSize ?? 0}-${asset.width ?? 0}-${asset.height ?? 0}-${asset.url || ''}`}
                        asset={asset}
                        attachmentId={attachmentId}
                      />
                    </section>
                  ) : null}

                  {canShowResize && asset && attachmentId && ResizeTool ? (
                    <section className="frkt-inspector__form" data-frkt-tool="resize">
                      <h3>{t('resize')}</h3>
                      <p className="frkt-inspector__desc">{t('resizeToolDesc')}</p>
                      <ResizeTool
                        key={`resize-${attachmentId}-${asset.fileSize ?? 0}-${asset.width ?? 0}-${asset.height ?? 0}`}
                        asset={asset}
                        attachmentId={attachmentId}
                      />
                    </section>
                  ) : null}

                  {canShowConvert && asset && attachmentId && FormatConvertTool ? (
                    <section className="frkt-inspector__form" data-frkt-tool="convert">
                      <h3>{t('convertFormat')}</h3>
                      <p className="frkt-inspector__desc">{t('convertToolDesc')}</p>
                      <FormatConvertTool asset={asset} attachmentId={attachmentId} />
                    </section>
                  ) : null}

                  {canShowVideoOptimizer && asset && attachmentId && VideoOptimizerTool ? (
                    <section className="frkt-inspector__form frkt-inspector__form--video-group" data-frkt-tool="video-optimize">
                      <UiErrorBoundary
                        title={t('error')}
                        message={t('toastGenericError')}
                        reloadLabel={t('refresh')}
                        resetKey={`video-tool:${attachmentId}:${asset.fileSize ?? 0}:${asset.url || ''}`}
                        className="frkt-state frkt-state--error"
                      >
                        <VideoOptimizerTool
                          key={`video-${attachmentId}-${asset.fileSize ?? 0}-${asset.url || ''}`}
                          asset={asset}
                          attachmentId={attachmentId}
                        />
                      </UiErrorBoundary>
                    </section>
                  ) : null}

                  {canShowRemoveBg && asset && attachmentId && RemoveBackgroundTool ? (
                    <section className="frkt-inspector__form" data-frkt-tool="remove-bg">
                      <h3>{t('removeBackground')}</h3>
                      <p className="frkt-inspector__desc">{t('removeBgToolDesc')}</p>
                      <RemoveBackgroundTool
                        key={`rmbg-${attachmentId}-${asset.fileSize ?? 0}-${asset.url || ''}`}
                        asset={asset}
                        attachmentId={attachmentId}
                      />
                    </section>
                  ) : null}

                  {canShowReplace ? (
                  <section className="frkt-inspector__form" data-frkt-tool="replace">
                    <h3>{t('replaceMedia')}</h3>
                    <p className="frkt-inspector__desc">{t('replaceHint')}</p>
                    <div className="frkt-replace">
                      <input
                        ref={replaceInputRef}
                        type="file"
                        className="frkt-sr-only"
                        onChange={(e) => {
                          const next = e.target.files?.[0] ?? null;
                          setReplaceFile(next);
                          setReplaceConfirm(false);
                          setReplaceStatus('');
                        }}
                      />

                      <div className="frkt-field frkt-replace__pick">
                        <button
                          type="button"
                          className="button"
                          disabled={!attachmentId || replaceMutation.isPending}
                          onClick={() => replaceInputRef.current?.click()}
                        >
                          {replaceFile ? t('changeFile') : t('chooseReplacement')}
                        </button>
                        {replaceFile ? (
                          <p className="frkt-replace__file">
                            <strong>{replaceFile.name}</strong>
                            <span className="frkt-muted">
                              {' '}
                              ·{' '}
                              {(replaceFile.size / 1024).toLocaleString(undefined, {
                                maximumFractionDigits: 1,
                              })}{' '}
                              KB
                              {replaceFile.type ? ` · ${replaceFile.type}` : ''}
                            </span>
                          </p>
                        ) : null}
                      </div>

                      {replaceFile ? (
                        <button
                          type="button"
                          className="button button-primary"
                          disabled={!attachmentId || replaceMutation.isPending}
                          onClick={() => setReplaceConfirm(true)}
                        >
                          {t('featReplaceLabel')}
                        </button>
                      ) : null}
                      {replaceStatus ? (
                        <p className="frkt-notice frkt-optimize__status">{replaceStatus}</p>
                      ) : null}
                    </div>
                  </section>
                  ) : null}

                  {attachmentId ? (
                    <section className="frkt-inspector__form frkt-inspector__tool-danger-actions">
                      {imageOriginalAvailable ? (
                        <button
                          type="button"
                          className="frkt-inspector__delete-original-btn"
                          disabled={restoreMutation.isPending || deleteOriginalMutation.isPending}
                          onClick={() => setDeleteOriginalConfirm(true)}
                        >
                          {t('deleteOriginal')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="frkt-inspector__delete-btn"
                        disabled={deleteMutation.isPending}
                        onClick={() => setDeleteConfirm(true)}
                      >
                        {t('deleteMedia')}
                      </button>
                    </section>
                  ) : null}

                </>
              ) : null}

              {tab === 'info' ? (
                <AssetInfoPanel asset={asset} loading={detailQuery.isFetching && !asset?.details} />
              ) : null}
              {isFreeBuild && tab === 'ai-edit' ? (
                <LockedProShowcase items={PRO_AI_EDIT_PREVIEW} />
              ) : null}
              {!isFreeBuild && tab === 'ai-edit' && asset && attachmentId && AiImageEditTool ? (
                <AiImageEditTool asset={asset} attachmentId={attachmentId} />
              ) : null}
            </div>
          </>
        )}
        </div>
      </aside>

      <ConfirmModal
        open={generateAllConfirm}
        onClose={() => setGenerateAllConfirm(false)}
        onConfirm={() => {
          setGenerateAllConfirm(false);
          generateMutation.mutate({
            field: 'all',
            regenerateFilename: canShowRename && regenerateFilename,
            translateAll: hasMultipleLocales && translateOtherLanguages,
          });
        }}
        title={t('generateAllData')}
        confirmLabel={t('generateAllData')}
        busy={generateMutation.isPending}
      >
        <p className="frkt-modal__copy">{t('generateAllConfirmBody')}</p>
        {hasMultipleLocales ? (
          <>
            <p className="frkt-modal__copy">
              {t('translateOtherLanguagesBody', { language: localeLabel(locale) })}
            </p>
            <label className="frkt-check">
              <span className="frkt-check__box">
                <input
                  type="checkbox"
                  checked={translateOtherLanguages}
                  onChange={(e) => setTranslateOtherLanguages(e.target.checked)}
                />
                <span className="frkt-check__mark" />
              </span>
              <span>{t('translateOtherLanguagesOption')}</span>
            </label>
          </>
        ) : null}
        <label className="frkt-check">
          <span className="frkt-check__box">
            <input type="checkbox" checked={regenerateFilename} disabled={!canShowRename} onChange={(e) => setRegenerateFilename(e.target.checked)} />
            <span className="frkt-check__mark" />
          </span>
          <span>{t('generateAllRenameFilename')}</span>
        </label>
        {!canShowRename ? <p className="frkt-muted">{t('generateAllRenameUnavailable')}</p> : null}
      </ConfirmModal>

      <ConfirmModal
        open={generateTranslationConfirm !== null}
        onClose={() => setGenerateTranslationConfirm(null)}
        onConfirm={() => {
          const field = generateTranslationConfirm;
          setGenerateTranslationConfirm(null);
          if (field) generateMutation.mutate({ field, translateAll: translateOtherLanguages });
        }}
        title={t('generateWithAi')}
        confirmLabel={t('generateWithAi')}
        busy={generateMutation.isPending}
      >
        <p className="frkt-modal__copy">
          {t('translateOtherLanguagesBody', { language: localeLabel(locale) })}
        </p>
        <label className="frkt-check">
          <span className="frkt-check__box">
            <input
              type="checkbox"
              checked={translateOtherLanguages}
              onChange={(e) => setTranslateOtherLanguages(e.target.checked)}
            />
            <span className="frkt-check__mark" />
          </span>
          <span>{t('translateOtherLanguagesOption')}</span>
        </label>
      </ConfirmModal>

      <ConfirmModal
        open={restoreConfirm}
        onClose={() => !restoreMutation.isPending && setRestoreConfirm(false)}
        onConfirm={() => restoreMutation.mutate()}
        title={t('restoreOriginalTitle')}
        confirmLabel={restoreMutation.isPending ? t('restoring') : t('restoreOriginal')}
        cancelLabel={t('cancel')}
        busy={restoreMutation.isPending}
      >
        <p className="frkt-modal__copy">{t('restoreBody')}</p>
      </ConfirmModal>

      <ConfirmModal
        open={videoRestoreConfirm}
        onClose={() => !videoRestoreMutation.isPending && setVideoRestoreConfirm(false)}
        onConfirm={() => videoRestoreMutation.mutate()}
        title={t('restoreOriginalTitle')}
        confirmLabel={videoRestoreMutation.isPending ? t('restoring') : t('restoreOriginal')}
        cancelLabel={t('cancel')}
        busy={videoRestoreMutation.isPending}
      >
        <p className="frkt-modal__copy">{t('videoRestoreConfirmBody')}</p>
      </ConfirmModal>

      <Modal
        open={currentPreviewOpen && Boolean(asset?.url || activeAsset?.url)}
        onClose={() => setCurrentPreviewOpen(false)}
        title={asset?.filename || activeAsset?.filename || t('title')}
        className="frkt-modal__card--ai-preview"
      >
        <button
          type="button"
          className="frkt-ai-edit__zoom-close"
          aria-label={t('inspectorClose')}
          title={t('inspectorClose')}
          onClick={() => setCurrentPreviewOpen(false)}
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div
          className="frkt-ai-edit__zoomed-image"
          style={{
            '--frkt-ai-preview-ratio': String(
              asset?.width && asset?.height ? asset.width / asset.height : 4 / 3
            ),
            '--frkt-ai-preview-inverse-ratio': String(
              asset?.width && asset?.height ? asset.height / asset.width : 3 / 4
            ),
          } as CSSProperties}
        >
          <img src={asset?.url || activeAsset?.url || ''} alt={asset?.filename || activeAsset?.filename || t('title')} />
        </div>
      </Modal>

      <Modal
        open={originalPreviewOpen && Boolean(originalPreviewUrl)}
        onClose={() => setOriginalPreviewOpen(false)}
        title={t('original')}
        className="frkt-modal__card--ai-preview"
      >
        <button
          type="button"
          className="frkt-ai-edit__zoom-close"
          aria-label={t('inspectorClose')}
          title={t('inspectorClose')}
          onClick={() => setOriginalPreviewOpen(false)}
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div
          className="frkt-ai-edit__zoomed-image"
          style={{
            '--frkt-ai-preview-ratio': String(
              asset?.width && asset?.height ? asset.width / asset.height : 4 / 3
            ),
            '--frkt-ai-preview-inverse-ratio': String(
              asset?.width && asset?.height ? asset.height / asset.width : 3 / 4
            ),
          } as CSSProperties}
        >
          <img src={originalPreviewUrl} alt={asset?.filename || activeAsset?.filename || t('original')} />
        </div>
      </Modal>

      <ConfirmModal
        open={deleteOriginalConfirm}
        onClose={() => !deleteOriginalMutation.isPending && setDeleteOriginalConfirm(false)}
        onConfirm={() => deleteOriginalMutation.mutate()}
        title={t('deleteOriginalTitle')}
        confirmLabel={deleteOriginalMutation.isPending ? t('deleting') : t('deleteOriginal')}
        cancelLabel={t('cancel')}
        busy={deleteOriginalMutation.isPending}
      >
        <p className="frkt-modal__copy">{t('deleteOriginalBody')}</p>
      </ConfirmModal>

      <ConfirmModal
        open={optimizeConfirm}
        onClose={() => !optimizeMutation.isPending && setOptimizeConfirm(false)}
        onConfirm={() => optimizeMutation.mutate()}
        title={optimizePreviewQuery.data?.mime === 'image/png' ? t('optimizeHeading') : t('optimizeAt', { quality })}
        confirmLabel={optimizeMutation.isPending ? t('optimizing') : t('optimize')}
        cancelLabel={t('cancel')}
        busy={optimizeMutation.isPending}
      >
        <p className="frkt-modal__copy">
          {optimizePreviewQuery.data?.mime === 'image/png'
            ? t('pngCompressionHint')
            : t('optimizeBody', { quality })}
        </p>
      </ConfirmModal>

      <ConfirmModal
        open={replaceConfirm}
        onClose={() => !replaceMutation.isPending && setReplaceConfirm(false)}
        onConfirm={() => replaceMutation.mutate()}
        title={t('replaceMediaTitle')}
        confirmLabel={replaceMutation.isPending ? t('replacing') : t('replace')}
        cancelLabel={t('cancel')}
        busy={replaceMutation.isPending}
      >
        <p className="frkt-modal__copy">{t('replaceBody')}</p>
      </ConfirmModal>

      <ConfirmModal
        open={renameConfirm}
        onClose={() =>
          !renameApplyMutation.isPending &&
          !renamePreviewMutation.isPending &&
          setRenameConfirm(false)
        }
        onConfirm={() => renameApplyMutation.mutate()}
        title={t('renameFileTitle')}
        confirmLabel={renameApplyMutation.isPending ? t('renaming') : t('confirmRename')}
        cancelLabel={t('cancel')}
        busy={renameApplyMutation.isPending}
      >
        <p className="frkt-modal__copy">{renamePreview?.message || t('renameBody')}</p>
        {typeof renamePreview?.referencesCount === 'number' ? (
          <p className="frkt-modal__copy frkt-muted">
            {t('renameReferencesHint', { count: renamePreview.referencesCount })}
          </p>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        open={deleteConfirm}
        onClose={() => !deleteMutation.isPending && setDeleteConfirm(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={t('deleteMediaTitle')}
        confirmLabel={deleteMutation.isPending ? t('deleting') : t('deletePermanently')}
        cancelLabel={t('cancel')}
        busy={deleteMutation.isPending}
        danger
      >
        <p className="frkt-modal__copy">{t('deleteMediaBody')}</p>
      </ConfirmModal>
    </>
  );
}
