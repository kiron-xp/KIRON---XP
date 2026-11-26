import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Film,
  Hash,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Package,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  cacheProfileMediaObjectUrl,
  getCachedProfileMediaObjectUrl,
  loadProfileMediaObjectUrl,
  MAX_MEDIA_FILE_BYTES,
  sanitizeDocId,
} from '../lib/firestoreVault';
import { Translations } from '../lib/i18n';
import { compressImageForVault, fileToBase64DataUrl } from '../lib/storage';
import { ProfileMediaEntry, ProfileMediaKind } from '../types';

interface SecurityBackupViewProps {
  t: Translations;
  profileMedia: ProfileMediaEntry[];
  openAddNonce?: number;
  onAddProfileMedia: (
    entry: ProfileMediaEntry,
    onProgress?: (pct: number) => void
  ) => Promise<void>;
  onDeleteProfileMedia: (id: string) => Promise<void>;
}

interface PendingMediaUpload {
  kind: 'photo' | 'screenshot' | 'video' | 'apk';
  files: File[];
  title: string;
  caption: string;
  previewUrl?: string;
  thumbnailDataUrl?: string;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMediaDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

export function SecurityBackupView({
  t,
  profileMedia,
  openAddNonce = 0,
  onAddProfileMedia,
  onDeleteProfileMedia,
}: SecurityBackupViewProps) {
  // Gallery & Media Vault state (upload panel opened via XP - 4 menu)
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [filterKind, setFilterKind] = useState<ProfileMediaKind>('photo');
  const [pendingUpload, setPendingUpload] = useState<PendingMediaUpload | null>(null);
  const [numberFormOpen, setNumberFormOpen] = useState(false);
  const [numberValue, setNumberValue] = useState('');
  const [numberTitle, setNumberTitle] = useState('');
  const [numberNote, setNumberNote] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});

  const [copiedMediaId, setCopiedMediaId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<ProfileMediaEntry | null>(null);

  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [loadingMediaIds, setLoadingMediaIds] = useState<Record<string, boolean>>({});
  const mediaUrlsRef = useRef<Record<string, string>>({});
  const loadingMediaIdsRef = useRef<Record<string, boolean>>({});
  const pendingPreviewRef = useRef<string | undefined>(undefined);
  mediaUrlsRef.current = mediaUrls;
  loadingMediaIdsRef.current = loadingMediaIds;
  pendingPreviewRef.current = pendingUpload?.previewUrl;

  const clearPendingUpload = () => {
    setPendingUpload((prev) => {
      if (prev?.previewUrl && prev.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  };

  useEffect(() => {
    if (openAddNonce > 0) {
      setUploadError('');
      setNumberFormOpen(false);
      clearPendingUpload();
      setUploadPanelOpen(true);
    }
  }, [openAddNonce]);

  useEffect(() => {
    return () => {
      if (pendingPreviewRef.current && pendingPreviewRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(pendingPreviewRef.current);
      }
    };
  }, []);

  const counts = useMemo(() => {
    let photo = 0;
    let screenshot = 0;
    let video = 0;
    let number = 0;
    let apk = 0;
    for (const item of profileMedia) {
      if (item.kind === 'photo') photo += 1;
      else if (item.kind === 'screenshot') screenshot += 1;
      else if (item.kind === 'video') video += 1;
      else if (item.kind === 'number') number += 1;
      else if (item.kind === 'apk') apk += 1;
    }
    return { photo, screenshot, video, number, apk };
  }, [profileMedia]);

  // Strictly isolated per-category list: PHOTO, VIDEO, KIRON, NUMBER, APK never mix together
  const categoryItems = useMemo(() => {
    const seen = new Set<string>();
    const list: ProfileMediaEntry[] = [];
    for (const item of profileMedia) {
      if (item.kind === filterKind && !seen.has(item.id)) {
        seen.add(item.id);
        list.push(item);
      }
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [profileMedia, filterKind]);

  // Auto-load chunked photos & videos in active category (skip APK chunks until user taps Download)
  useEffect(() => {
    const targets = categoryItems.filter((item) => {
      if (item.kind === 'number' || item.kind === 'apk' || item.dataUrl || item.chunkCount <= 0) {
        return false;
      }
      const existing = mediaUrlsRef.current[item.id] || getCachedProfileMediaObjectUrl(item.id);
      if (existing) {
        if (!mediaUrlsRef.current[item.id]) {
          mediaUrlsRef.current[item.id] = existing;
          setMediaUrls((prev) => ({ ...prev, [item.id]: existing }));
        }
        return false;
      }
      return !loadingMediaIdsRef.current[item.id];
    });
    if (targets.length === 0) return;

    let cancelled = false;
    const loadNextBatch = async () => {
      for (const item of targets) {
        if (cancelled) break;
        if (mediaUrlsRef.current[item.id] || loadingMediaIdsRef.current[item.id]) continue;
        loadingMediaIdsRef.current[item.id] = true;
        setLoadingMediaIds((prev) => ({ ...prev, [item.id]: true }));
        try {
          const url = await loadProfileMediaObjectUrl(item);
          if (!cancelled) {
            mediaUrlsRef.current[item.id] = url;
            setMediaUrls((prev) => ({ ...prev, [item.id]: url }));
          }
        } catch {
          // ignore fetch error for individual item
        } finally {
          loadingMediaIdsRef.current[item.id] = false;
          if (!cancelled) {
            setLoadingMediaIds((prev) => ({ ...prev, [item.id]: false }));
          }
        }
      }
    };

    void loadNextBatch();
    return () => {
      cancelled = true;
    };
  }, [categoryItems]);

  const handleSelectFilesForComposer = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'photo' | 'screenshot' | 'video' | 'apk'
  ) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploadError('');
    for (const file of files) {
      if (file.size > MAX_MEDIA_FILE_BYTES) {
        setUploadError(t.mediaVideoTooLarge);
        return;
      }
    }

    setNumberFormOpen(false);
    clearPendingUpload();
    setUploadPanelOpen(true);
    const previewUrl =
      kind === 'photo' || kind === 'screenshot' ? URL.createObjectURL(files[0]) : undefined;
    setPendingUpload({
      kind,
      files,
      title: '',
      caption: '',
      previewUrl,
      thumbnailDataUrl: undefined,
    });
  };

  const handleSelectApkThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    e.target.value = '';
    if (!imgFile) return;

    setUploadError('');
    try {
      const compressed = await compressImageForVault(imgFile, 800, 180000);
      setPendingUpload((prev) => {
        if (!prev || prev.kind !== 'apk') return prev;
        if (prev.previewUrl && prev.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return {
          ...prev,
          thumbnailDataUrl: compressed,
          previewUrl: compressed,
        };
      });
    } catch {
      setUploadError(t.importErrorToast);
    }
  };

  const handleRemoveApkThumbnail = () => {
    setPendingUpload((prev) => {
      if (!prev || prev.kind !== 'apk') return prev;
      if (prev.previewUrl && prev.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return {
        ...prev,
        thumbnailDataUrl: undefined,
        previewUrl: undefined,
      };
    });
  };

  const handleConfirmMediaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUpload || pendingUpload.files.length === 0) return;

    const { kind, files, title, caption, thumbnailDataUrl } = pendingUpload;
    const customTitle = title.trim();
    const customCaption = caption.trim().slice(0, 500) || undefined;

    setUploadError('');
    setUploading(true);
    setUploadProgress(8);

    try {
      const progressByFile = new Array<number>(files.length).fill(0);
      const updateAggregateProgress = () => {
        const total = progressByFile.reduce((sum, p) => sum + p, 0);
        setUploadProgress(Math.max(8, Math.min(100, Math.round(total / files.length))));
      };

      const uploadSingleFile = async (file: File, i: number) => {
        let rawDataUrl: string;
        if ((kind === 'photo' || kind === 'screenshot') && file.size > 460000) {
          try {
            // Fast HD optimization (~2048px WebP) so photos save in a single instant Firestore write
            rawDataUrl = await compressImageForVault(file, 2048, 680000);
          } catch {
            rawDataUrl = await fileToBase64DataUrl(file);
          }
        } else {
          rawDataUrl = await fileToBase64DataUrl(file);
        }

        const now = Date.now() + i;
        const id = sanitizeDocId(
          crypto.randomUUID ? crypto.randomUUID() : `${kind}-${now}-${i}`
        );
        const fallbackTitle =
          file.name.replace(/\.[^.]+$/, '') ||
          (kind === 'video' ? 'Video' : kind === 'apk' ? 'App' : kind.toUpperCase());
        const resolvedTitle = customTitle
          ? files.length > 1
            ? `${customTitle} (${i + 1})`.slice(0, 160)
            : customTitle.slice(0, 160)
          : fallbackTitle.slice(0, 160);

        const resolvedFileName =
          kind === 'apk'
            ? file.name.toLowerCase().endsWith('.apk')
              ? file.name.slice(0, 200)
              : `${file.name.slice(0, 195)}.apk`
            : file.name.slice(0, 200);

        const resolvedMimeType =
          kind === 'apk'
            ? 'application/vnd.android.package-archive'
            : file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg');

        const entry: ProfileMediaEntry = {
          id,
          kind,
          title: resolvedTitle,
          note: customCaption,
          mimeType: resolvedMimeType,
          fileName: resolvedFileName,
          fileSize: file.size,
          dataUrl: rawDataUrl,
          thumbnailDataUrl: kind === 'apk' ? thumbnailDataUrl : undefined,
          chunkCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        // Cache local object URL so large files download/play instantly without re-fetching chunks
        if (rawDataUrl.length > 680000) {
          const objUrl = URL.createObjectURL(file);
          cacheProfileMediaObjectUrl(id, objUrl);
          mediaUrlsRef.current[id] = objUrl;
          setMediaUrls((prev) => ({ ...prev, [id]: objUrl }));
        }

        await onAddProfileMedia(entry, (pct) => {
          progressByFile[i] = pct;
          updateAggregateProgress();
        });
        progressByFile[i] = 100;
        updateAggregateProgress();
      };

      // Upload up to 3 files concurrently for rapid multi-file adds
      for (let start = 0; start < files.length; start += 3) {
        const batch = files.slice(start, start + 3);
        await Promise.all(batch.map((file, offset) => uploadSingleFile(file, start + offset)));
      }

      clearPendingUpload();
      setFilterKind(kind);
      setUploadPanelOpen(false);
    } catch (err) {
      if (err instanceof Error && err.message === 'VIDEO_TOO_LARGE') {
        setUploadError(t.mediaVideoTooLarge);
      } else {
        setUploadError(t.importErrorToast);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    const cleanNum = numberValue.trim();
    if (!cleanNum) {
      setUploadError(t.mediaNumberRequired);
      return;
    }

    setUploading(true);
    try {
      const now = Date.now();
      const id = sanitizeDocId(
        crypto.randomUUID ? crypto.randomUUID() : `num-${now}`
      );
      const entry: ProfileMediaEntry = {
        id,
        kind: 'number',
        title: numberTitle.trim().slice(0, 160) || cleanNum.slice(0, 160),
        numberValue: cleanNum.slice(0, 120),
        note: numberNote.trim().slice(0, 500) || undefined,
        mimeType: 'text/plain',
        chunkCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      await onAddProfileMedia(entry);
      setNumberValue('');
      setNumberTitle('');
      setNumberNote('');
      setNumberFormOpen(false);
      setFilterKind('number');
      setUploadPanelOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const handleCopyNumber = async (id: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedMediaId(id);
      window.setTimeout(() => {
        setCopiedMediaId((prev) => (prev === id ? null : prev));
      }, 1500);
    } catch {
      // ignore
    }
  };

  const handleLoadChunkedVideo = async (item: ProfileMediaEntry) => {
    if (mediaUrls[item.id] || loadingMediaIds[item.id]) return;
    loadingMediaIdsRef.current[item.id] = true;
    setLoadingMediaIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      const url = await loadProfileMediaObjectUrl(item);
      mediaUrlsRef.current[item.id] = url;
      setMediaUrls((prev) => ({ ...prev, [item.id]: url }));
    } catch {
      setUploadError(t.importErrorToast);
    } finally {
      loadingMediaIdsRef.current[item.id] = false;
      setLoadingMediaIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDownloadMedia = async (item: ProfileMediaEntry) => {
    if (downloadingIds[item.id]) return;
    setDownloadingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      let href =
        item.dataUrl ?? mediaUrls[item.id] ?? getCachedProfileMediaObjectUrl(item.id);
      if (!href && item.chunkCount > 0) {
        href = await loadProfileMediaObjectUrl(item);
        mediaUrlsRef.current[item.id] = href;
        setMediaUrls((prev) => ({ ...prev, [item.id]: href! }));
      }
      if (!href) return;
      const a = document.createElement('a');
      a.href = href;
      const baseName = item.fileName || `${item.title || item.kind}-${item.id}`;
      a.download =
        item.kind === 'apk' && !baseName.toLowerCase().endsWith('.apk')
          ? `${baseName}.apk`
          : baseName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setUploadError(t.importErrorToast);
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const getKindBadgeLabel = (kind: ProfileMediaKind): string => {
    if (kind === 'photo') return t.mediaFilterPhoto;
    if (kind === 'video') return t.mediaFilterVideo;
    if (kind === 'screenshot') return t.mediaFilterScreenshot;
    if (kind === 'apk') return t.mediaFilterApk;
    return t.mediaFilterNumber;
  };

  const lightboxMediaSrc = lightboxItem
    ? lightboxItem.kind === 'apk'
      ? lightboxItem.thumbnailDataUrl
      : lightboxItem.dataUrl ||
        mediaUrls[lightboxItem.id] ||
        getCachedProfileMediaObjectUrl(lightboxItem.id)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Upload Panel (shown via Hamburger Menu -> XP - 4 or + APK) */}
      {uploadPanelOpen && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t.menuAddMedia}
            </span>
            <button
              type="button"
              onClick={() => {
                setUploadPanelOpen(false);
                setNumberFormOpen(false);
                clearPendingUpload();
                setUploadError('');
              }}
              aria-label={t.close}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 dark:hover:border-emerald-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer transition-colors whitespace-nowrap">
              <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{t.mediaUploadPhotoBtn}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => handleSelectFilesForComposer(e, 'photo')}
                className="sr-only"
              />
            </label>

            <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:border-violet-300 dark:hover:border-violet-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer transition-colors whitespace-nowrap">
              <Film className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>{t.mediaUploadVideoBtn}</span>
              <input
                type="file"
                accept="video/*"
                disabled={uploading}
                onChange={(e) => handleSelectFilesForComposer(e, 'video')}
                className="sr-only"
              />
            </label>

            <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:border-sky-300 dark:hover:border-sky-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer transition-colors whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{t.mediaUploadScreenshotBtn}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                onChange={(e) => handleSelectFilesForComposer(e, 'screenshot')}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                setUploadError('');
                clearPendingUpload();
                setNumberFormOpen((v) => !v);
              }}
              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                numberFormOpen
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700 text-slate-800 dark:text-slate-100'
              }`}
            >
              <Hash className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{t.mediaAddNumberBtn}</span>
            </button>

            <label className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:border-teal-300 dark:hover:border-teal-700 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer transition-colors whitespace-nowrap">
              <Package className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{t.mediaUploadApkBtn}</span>
              <input
                type="file"
                disabled={uploading}
                onChange={(e) => handleSelectFilesForComposer(e, 'apk')}
                className="sr-only"
              />
            </label>
          </div>

          {pendingUpload && (
            <form
              onSubmit={handleConfirmMediaUpload}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3"
            >
              <div className="flex items-center gap-3">
                {pendingUpload.previewUrl ? (
                  <img
                    src={pendingUpload.previewUrl}
                    alt={pendingUpload.files[0]?.name}
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : pendingUpload.kind === 'apk' ? (
                  <div className="w-14 h-14 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 flex items-center justify-center shrink-0">
                    <Film className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold shrink-0">
                      {getKindBadgeLabel(pendingUpload.kind)}
                    </span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {pendingUpload.files.length > 1
                        ? `${pendingUpload.files.length} files`
                        : pendingUpload.files[0]?.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {formatFileSize(
                      pendingUpload.files.reduce((sum, f) => sum + f.size, 0)
                    )}
                  </p>
                </div>
              </div>

              {pendingUpload.kind === 'apk' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.mediaApkThumbnailLabel}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        {pendingUpload.thumbnailDataUrl
                          ? t.mediaApkChangeThumbnailBtn
                          : t.mediaApkPickThumbnailBtn}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading}
                        onChange={handleSelectApkThumbnail}
                        className="sr-only"
                      />
                    </label>
                    {pendingUpload.thumbnailDataUrl && (
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={handleRemoveApkThumbnail}
                        className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        {t.mediaApkRemoveThumbnailBtn}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.mediaUploadTitleLabel}
                </label>
                <input
                  type="text"
                  value={pendingUpload.title}
                  disabled={uploading}
                  onChange={(e) =>
                    setPendingUpload((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev
                    )
                  }
                  placeholder={t.mediaUploadTitlePlaceholder}
                  autoFocus
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.mediaUploadCaptionLabel}
                </label>
                <textarea
                  rows={2}
                  value={pendingUpload.caption}
                  disabled={uploading}
                  onChange={(e) =>
                    setPendingUpload((prev) =>
                      prev ? { ...prev, caption: e.target.value } : prev
                    )
                  }
                  placeholder={t.mediaUploadCaptionPlaceholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={clearPendingUpload}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t.mediaConfirmUploadBtn}</span>
                </button>
              </div>
            </form>
          )}

          {uploading && (
            <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <span>{t.mediaUploadingLabel}</span>
                <span className="tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-emerald-200 dark:bg-emerald-900 overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-200"
                  style={{ width: `${Math.max(8, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {numberFormOpen && (
            <form
              onSubmit={handleSaveNumber}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.mediaNumberLabel}
                  </label>
                  <input
                    type="text"
                    value={numberValue}
                    onChange={(e) => setNumberValue(e.target.value)}
                    placeholder={t.mediaNumberPlaceholder}
                    autoFocus
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.mediaTitleLabel}
                  </label>
                  <input
                    type="text"
                    value={numberTitle}
                    onChange={(e) => setNumberTitle(e.target.value)}
                    placeholder={t.mediaTitlePlaceholder}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.mediaNoteLabel}
                </label>
                <input
                  type="text"
                  value={numberNote}
                  onChange={(e) => setNumberNote(e.target.value)}
                  placeholder={t.mediaNotePlaceholder}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNumberFormOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                >
                  {t.mediaSaveNumberBtn}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Strictly Separated Category Sections */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['photo', t.mediaFilterPhoto, counts.photo],
                ['video', t.mediaFilterVideo, counts.video],
                ['screenshot', t.mediaFilterScreenshot, counts.screenshot],
                ['number', t.mediaFilterNumber, counts.number],
                ['apk', t.mediaFilterApk, counts.apk],
              ] as const
            ).map(([id, label, count]) => {
              const active = filterKind === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterKind(id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {filterKind === 'apk' && (
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-xs whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" />
              <span>{t.mediaUploadApkBtn}</span>
              <input
                type="file"
                disabled={uploading}
                onChange={(e) => handleSelectFilesForComposer(e, 'apk')}
                className="sr-only"
              />
            </label>
          )}
        </div>

        {/* Category Content */}
        {categoryItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center space-y-3 shadow-xs">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.mediaEmptyTitle}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t.mediaEmptyDesc}
            </p>
            {filterKind === 'apk' && (
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer transition-colors">
                  <Package className="w-4 h-4" />
                  <span>{t.mediaUploadApkBtn}</span>
                  <input
                    type="file"
                    disabled={uploading}
                    onChange={(e) => handleSelectFilesForComposer(e, 'apk')}
                    className="sr-only"
                  />
                </label>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {categoryItems.map((item) => {
              const isConfirming = confirmDeleteId === item.id;
              const isCopied = copiedMediaId === item.id;
              const isDownloading = Boolean(downloadingIds[item.id]);
              const resolvedSrc =
                item.dataUrl || mediaUrls[item.id] || getCachedProfileMediaObjectUrl(item.id);
              const isLoadingMedia = Boolean(loadingMediaIds[item.id]);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between shadow-xs"
                >
                  {/* PHOTO & KIRON Visual Preview (Full uncropped photo on display) */}
                  {(item.kind === 'photo' || item.kind === 'screenshot') && (
                    <div
                      onClick={() => {
                        if (resolvedSrc) setLightboxItem(item);
                      }}
                      className="relative min-h-[160px] bg-slate-950 cursor-pointer group overflow-hidden flex items-center justify-center"
                    >
                      {resolvedSrc ? (
                        <img
                          src={resolvedSrc}
                          alt={item.title || item.kind}
                          loading="lazy"
                          className="w-full h-auto max-h-[560px] object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-44 text-slate-400">
                          <Loader2 className={`w-5 h-5 ${isLoadingMedia ? 'animate-spin' : ''}`} />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/75 text-white text-[10px] font-semibold">
                        {getKindBadgeLabel(item.kind)}
                      </span>
                      {resolvedSrc && (
                        <span className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-950/65 text-white opacity-90 group-hover:opacity-100">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* APK Preview (Gallery photo if attached, otherwise crisp APK emblem) */}
                  {item.kind === 'apk' && (
                    <div
                      onClick={() => {
                        if (item.thumbnailDataUrl) setLightboxItem(item);
                      }}
                      className={`relative min-h-[140px] flex items-center justify-center overflow-hidden ${
                        item.thumbnailDataUrl
                          ? 'bg-slate-950 cursor-pointer group'
                          : 'bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-950/50 dark:to-slate-900 py-8'
                      }`}
                    >
                      {item.thumbnailDataUrl ? (
                        <img
                          src={item.thumbnailDataUrl}
                          alt={item.title || 'APK'}
                          loading="lazy"
                          className="w-full h-auto max-h-[420px] object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-teal-700 dark:text-teal-300">
                          <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-teal-200 dark:border-teal-700 flex items-center justify-center shadow-xs">
                            <Package className="w-6 h-6" />
                          </div>
                          <span className="text-[11px] font-mono font-semibold opacity-80">
                            .apk
                          </span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-teal-700/90 text-white text-[10px] font-semibold">
                        {getKindBadgeLabel('apk')}
                      </span>
                      {item.thumbnailDataUrl && (
                        <span className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-950/65 text-white opacity-90 group-hover:opacity-100">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* VIDEO Player (Full uncropped video on display + fullscreen lightbox) */}
                  {item.kind === 'video' && (
                    <div className="relative bg-black flex items-center justify-center min-h-[180px] group">
                      {resolvedSrc ? (
                        <video
                          src={resolvedSrc}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-auto max-h-[560px] object-contain bg-black"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLoadChunkedVideo(item)}
                          disabled={isLoadingMedia}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                        >
                          {isLoadingMedia ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          <span>{isLoadingMedia ? t.mediaLoadingVideo : t.mediaPlayVideoBtn}</span>
                        </button>
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/75 text-white text-[10px] font-semibold pointer-events-none">
                        {getKindBadgeLabel(item.kind)}
                      </span>
                      {resolvedSrc && (
                        <button
                          type="button"
                          onClick={() => setLightboxItem(item)}
                          aria-label="Fullscreen video"
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/75 hover:bg-slate-900 text-white opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* NUMBER Card */}
                  {item.kind === 'number' && (
                    <div className="p-4 pb-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          {getKindBadgeLabel('number')}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                          {formatMediaDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 break-all select-all">
                        {item.numberValue || item.title}
                      </p>
                      {item.title && item.title !== item.numberValue && (
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                          {item.title}
                        </p>
                      )}
                      {item.note && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                          {item.note}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer Actions & Title/Caption */}
                  <div className="p-3.5 pt-2.5 space-y-2">
                    {item.kind !== 'number' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                            {formatFileSize(item.fileSize)}
                          </span>
                        </div>
                        {item.kind === 'apk' && item.fileName && (
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                            {item.fileName}
                          </p>
                        )}
                        {item.note && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 break-words leading-relaxed">
                            {item.note}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums truncate">
                        {item.kind !== 'number' ? formatMediaDate(item.createdAt) : ''}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.kind === 'number' ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyNumber(item.id, item.numberValue || item.title)
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${
                              isCopied
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>
                              {isCopied
                                ? t.copied
                                : t.secondsShort === 'সে.'
                                ? 'কপি'
                                : 'Copy'}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isDownloading}
                            onClick={() => handleDownloadMedia(item)}
                            title={t.mediaDownloadBtn}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>{isDownloading ? t.mediaDownloadingApk : t.mediaDownloadBtn}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setConfirmDeleteId(isConfirming ? null : item.id)
                          }
                          title={t.deleteAccount}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs">
                        <span className="text-red-700 dark:text-red-200 font-medium">
                          {t.mediaDeleteConfirm}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              void onDeleteProfileMedia(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                          >
                            {t.confirmDelete}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Fullscreen Lightbox Modal for Full Photo & Full Video */}
      {lightboxItem && lightboxMediaSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/92 backdrop-blur-xs"
          onClick={() => setLightboxItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-5xl w-full bg-slate-950/95 border border-white/20 rounded-2xl overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {lightboxItem.title}
                </p>
                {lightboxItem.note && (
                  <p className="text-xs text-white/70 truncate mt-0.5">
                    {lightboxItem.note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={Boolean(downloadingIds[lightboxItem.id])}
                  onClick={() => handleDownloadMedia(lightboxItem)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {downloadingIds[lightboxItem.id] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {downloadingIds[lightboxItem.id]
                      ? t.mediaDownloadingApk
                      : t.mediaDownloadBtn}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxItem(null)}
                  aria-label={t.close}
                  className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[85vh] overflow-auto">
              {lightboxItem.kind === 'video' ? (
                <video
                  src={lightboxMediaSrc}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-full max-h-[82vh] w-full object-contain rounded-lg bg-black"
                />
              ) : (
                <img
                  src={lightboxMediaSrc}
                  alt={lightboxItem.title}
                  className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
