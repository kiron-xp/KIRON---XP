import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
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
import { compressImageForVault, fileToBase64DataUrl, optimize4kImageForVault } from '../lib/storage';
import { ProfileMediaEntry, ProfileMediaKind } from '../types';

interface SecurityBackupViewProps {
  t: Translations;
  profileMedia: ProfileMediaEntry[];
  openAddNonce?: number;
  onAddProfileMedia: (
    entry: ProfileMediaEntry,
    onProgress?: (pct: number) => void
  ) => Promise<void>;
  onUpdateProfileMedia?: (
    entry: ProfileMediaEntry,
    options?: { newFilePicked?: boolean; onProgress?: (pct: number) => void }
  ) => Promise<void>;
  onDeleteProfileMedia: (id: string) => Promise<void>;
}

interface PendingMediaUpload {
  kind: 'photo' | 'screenshot' | 'video' | 'apk';
  files: File[];
  title: string;
  caption: string;
  category?: string;
  previewUrls: string[];
  thumbnailDataUrl?: string;
}

const APK_CATEGORIES = [
  'WHATSAPP',
  'FACEBOOK',
  'FACEBOOK LITE',
  'MESSENGER',
  'INSTAGRAM',
  'TELEGRAM',
  'TELEGRAM X',
  'TIK TOK',
  'IMO',
  'WECHAT',
  'SNAPCHAT',
  'X (TWITTER)',
  'YOUTUBE',
  'THREADS',
  'DISCORD',
  'LINE',
  'VIBER',
  'SIGNAL',
  'BIP',
  'LIKEE',
  'CAPCUT',
  'SHAREIT',
  'GOOGLE',
  'CHROME',
  'GMAIL',
  'PLAY STORE',
  'BKASH',
  'NAGAD',
  'OTHER',
] as const;

function stripBaseApkName(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/\(\s*base\.apk\s*\)/gi, '').trim();
  const lower = cleaned.toLowerCase();
  if (lower === 'base.apk' || lower === 'base') return '';
  return cleaned;
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
  onUpdateProfileMedia,
  onDeleteProfileMedia,
}: SecurityBackupViewProps) {
  // Gallery & Media Vault state (upload panel opened via XP - 4 menu)
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [filterKind, setFilterKind] = useState<ProfileMediaKind>('apk');
  const [selectedApkCategory, setSelectedApkCategory] = useState<string>('ALL');
  const [pendingUpload, setPendingUpload] = useState<PendingMediaUpload | null>(null);
  const [numberFormOpen, setNumberFormOpen] = useState(false);
  const [numberValue, setNumberValue] = useState('');
  const [numberTitle, setNumberTitle] = useState('');
  const [numberNote, setNumberNote] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});
  const [revealedApkIds, setRevealedApkIds] = useState<Record<string, boolean>>({});

  const [copiedMediaId, setCopiedMediaId] = useState<string | null>(null);
  const [openApkMenuId, setOpenApkMenuId] = useState<string | null>(null);
  const [openPhotoMenuId, setOpenPhotoMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<ProfileMediaEntry | null>(null);
  const [lightboxGroup, setLightboxGroup] = useState<ProfileMediaEntry[]>([]);
  const [editingPhotoPost, setEditingPhotoPost] = useState<{
    groupKey: string;
    items: ProfileMediaEntry[];
    title: string;
    caption: string;
  } | null>(null);
  const [savingPhotoEdit, setSavingPhotoEdit] = useState(false);
  const [editPhotoError, setEditPhotoError] = useState('');
  const [editingApk, setEditingApk] = useState<{
    item: ProfileMediaEntry;
    title: string;
    fileName: string;
    caption: string;
    category: string;
    thumbnailDataUrl?: string;
    replacementFile?: File;
  } | null>(null);
  const [savingApkEdit, setSavingApkEdit] = useState(false);
  const [editApkProgress, setEditApkProgress] = useState(0);
  const [editApkError, setEditApkError] = useState('');

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-apk-menu]')) {
        setOpenApkMenuId(null);
      }
      if (!target?.closest('[data-photo-menu]')) {
        setOpenPhotoMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenApkMenuId(null);
        setOpenPhotoMenuId(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [loadingMediaIds, setLoadingMediaIds] = useState<Record<string, boolean>>({});
  const mediaUrlsRef = useRef<Record<string, string>>({});
  const loadingMediaIdsRef = useRef<Record<string, boolean>>({});
  const pendingPreviewsRef = useRef<string[]>([]);
  const uploadSectionRef = useRef<HTMLElement | null>(null);
  mediaUrlsRef.current = mediaUrls;
  loadingMediaIdsRef.current = loadingMediaIds;
  pendingPreviewsRef.current = pendingUpload?.previewUrls ?? [];

  const revokeBlobUrls = (urls: string[]) => {
    for (const url of urls) {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
  };

  const clearPendingUpload = () => {
    setPendingUpload((prev) => {
      if (prev?.previewUrls?.length) {
        revokeBlobUrls(prev.previewUrls);
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
      revokeBlobUrls(pendingPreviewsRef.current);
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

  const apkCategoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of categoryItems) {
      if (item.kind !== 'apk') continue;
      const cat = item.category?.trim();
      if (cat) {
        map.set(cat, (map.get(cat) ?? 0) + 1);
      }
    }
    return Array.from(map.entries());
  }, [categoryItems]);

  const visibleApkItems = useMemo(() => {
    if (filterKind !== 'apk' || selectedApkCategory === 'ALL') {
      return categoryItems;
    }
    return categoryItems.filter((item) => item.category === selectedApkCategory);
  }, [categoryItems, filterKind, selectedApkCategory]);

  // Group multi-photo posts (post:<groupId>) while keeping single photos as 1-item posts
  const photoPosts = useMemo(() => {
    if (filterKind !== 'photo' && filterKind !== 'screenshot') return [];
    const groups = new Map<string, ProfileMediaEntry[]>();
    for (const item of categoryItems) {
      const groupKey =
        item.category && item.category.startsWith('post:') ? item.category : `single:${item.id}`;
      const arr = groups.get(groupKey);
      if (arr) arr.push(item);
      else groups.set(groupKey, [item]);
    }
    return Array.from(groups.entries())
      .map(([groupKey, items]) => {
        const sortedItems = [...items].sort((a, b) => a.createdAt - b.createdAt);
        const first = sortedItems[0];
        return {
          groupKey,
          items: sortedItems,
          createdAt: Math.max(...sortedItems.map((x) => x.createdAt)),
          title: first.title?.trim() || '',
          note: first.note?.trim() || '',
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [categoryItems, filterKind]);

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
    const previewUrls =
      kind === 'photo' || kind === 'screenshot'
        ? files.map((file) => URL.createObjectURL(file))
        : [];
    setPendingUpload({
      kind,
      files,
      title: '',
      caption: '',
      category: kind === 'apk' ? 'WHATSAPP' : undefined,
      previewUrls,
      thumbnailDataUrl: undefined,
    });
    window.setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleAppendMorePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const addedFiles = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (addedFiles.length === 0) return;

    setUploadError('');
    for (const file of addedFiles) {
      if (file.size > MAX_MEDIA_FILE_BYTES) {
        setUploadError(t.mediaVideoTooLarge);
        return;
      }
    }

    const addedPreviews = addedFiles.map((file) => URL.createObjectURL(file));
    setPendingUpload((prev) => {
      if (!prev || (prev.kind !== 'photo' && prev.kind !== 'screenshot')) {
        revokeBlobUrls(addedPreviews);
        return prev;
      }
      return {
        ...prev,
        files: [...prev.files, ...addedFiles],
        previewUrls: [...prev.previewUrls, ...addedPreviews],
      };
    });
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingUpload((prev) => {
      if (!prev) return null;
      const targetUrl = prev.previewUrls[index];
      if (targetUrl && targetUrl.startsWith('blob:')) {
        URL.revokeObjectURL(targetUrl);
      }
      const nextFiles = prev.files.filter((_, i) => i !== index);
      const nextPreviews = prev.previewUrls.filter((_, i) => i !== index);
      if (nextFiles.length === 0) {
        return null;
      }
      return {
        ...prev,
        files: nextFiles,
        previewUrls: nextPreviews,
      };
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
        revokeBlobUrls(prev.previewUrls);
        return {
          ...prev,
          thumbnailDataUrl: compressed,
          previewUrls: [compressed],
        };
      });
    } catch {
      setUploadError(t.importErrorToast);
    }
  };

  const handleRemoveApkThumbnail = () => {
    setPendingUpload((prev) => {
      if (!prev || prev.kind !== 'apk') return prev;
      revokeBlobUrls(prev.previewUrls);
      return {
        ...prev,
        thumbnailDataUrl: undefined,
        previewUrls: [],
      };
    });
  };

  const handleConfirmMediaUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUpload || pendingUpload.files.length === 0) return;

    const { kind, files, title, caption, category, thumbnailDataUrl } = pendingUpload;
    const customTitle = stripBaseApkName(title.trim());
    const customCaption = caption.trim().slice(0, 500) || undefined;
    const selectedCategory = kind === 'apk' ? (category || 'WHATSAPP') : undefined;

    setUploadError('');
    setUploading(true);
    setUploadProgress(8);

    try {
      const batchBaseTime = Date.now();
      const postGroupCategory =
        (kind === 'photo' || kind === 'screenshot') && files.length > 1
          ? `post:${batchBaseTime.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
          : undefined;
      const resolvedCategory = selectedCategory ?? postGroupCategory;
      const progressByFile = new Array<number>(files.length).fill(0);
      const updateAggregateProgress = () => {
        const total = progressByFile.reduce((sum, p) => sum + p, 0);
        setUploadProgress(Math.max(8, Math.min(100, Math.round(total / files.length))));
      };

      const uploadSingleFile = async (file: File, i: number) => {
        let rawDataUrl: string;
        if (kind === 'photo' || kind === 'screenshot') {
          try {
            // Preserve true 4K / HD resolution (up to 4096px) with hardware-accelerated fast encoding
            rawDataUrl = await optimize4kImageForVault(file, 4096, 680000);
          } catch {
            rawDataUrl = await fileToBase64DataUrl(file);
          }
        } else {
          rawDataUrl = await fileToBase64DataUrl(file);
        }

        const now = batchBaseTime + i;
        const id = sanitizeDocId(
          crypto.randomUUID ? crypto.randomUUID() : `${kind}-${now}-${i}`
        );
        const cleanRawName = stripBaseApkName(file.name).replace(/\.[^.]+$/, '');
        const fallbackTitle =
          cleanRawName ||
          (kind === 'video'
            ? 'Video'
            : kind === 'apk'
            ? selectedCategory || 'App'
            : kind.toUpperCase());
        const resolvedTitle =
          kind === 'photo' || kind === 'screenshot'
            ? customTitle.slice(0, 160)
            : (customTitle || fallbackTitle).slice(0, 160);

        const dataMimeMatch = rawDataUrl.match(/^data:([^;]+);/i);
        const resolvedMimeType =
          kind === 'apk'
            ? 'application/vnd.android.package-archive'
            : dataMimeMatch?.[1] || file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg');

        const cleanApkNameRaw = file.name.trim();
        let resolvedFileName: string;
        if (kind === 'apk') {
          resolvedFileName = cleanApkNameRaw
            ? cleanApkNameRaw.slice(0, 200)
            : `${(
                (cleanRawName || selectedCategory || 'base')
                  .replace(/[^a-zA-Z0-9._ -]+/g, '')
                  .trim()
                  .replace(/\s+/g, '_') || 'base'
              ).slice(0, 195)}.apk`;
        } else if (
          (kind === 'photo' || kind === 'screenshot') &&
          resolvedMimeType === 'image/webp'
        ) {
          const stem = file.name.replace(/\.[^.]+$/, '') || `${kind}-${now}`;
          resolvedFileName = `${stem}.webp`.slice(0, 200);
        } else {
          resolvedFileName = file.name.slice(0, 200);
        }

        const entry: ProfileMediaEntry = {
          id,
          kind,
          title: resolvedTitle,
          category: resolvedCategory,
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

        // Cache local object URL so large files download/view instantly without re-fetching chunks
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

      // Upload up to 6 files concurrently for ultra-fast multi-photo posting
      for (let start = 0; start < files.length; start += 6) {
        const batch = files.slice(start, start + 6);
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
      const storedFile =
        item.kind === 'apk' ? item.fileName?.trim() : stripBaseApkName(item.fileName);
      const cleanTitle = stripBaseApkName(item.title);
      const baseName =
        storedFile ||
        cleanTitle ||
        (item.category ? item.category.replace(/\s+/g, '_') : '') ||
        `${item.kind}-${item.id}`;
      const isWebpData =
        href.startsWith('data:image/webp') || item.mimeType === 'image/webp';
      if (item.kind === 'apk') {
        a.download = !baseName.toLowerCase().endsWith('.apk')
          ? `${baseName}.apk`
          : baseName;
      } else if ((item.kind === 'photo' || item.kind === 'screenshot') && isWebpData) {
        a.download = /\.[a-z0-9]+$/i.test(baseName)
          ? baseName.replace(/\.[^.]+$/, '.webp')
          : `${baseName}.webp`;
      } else {
        a.download = baseName;
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setUploadError(t.importErrorToast);
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDownloadPhotoPost = async (items: ProfileMediaEntry[]) => {
    if (items.length === 0) return;
    if (items.length === 1) {
      await handleDownloadMedia(items[0]);
      return;
    }
    for (let idx = 0; idx < items.length; idx += 1) {
      await handleDownloadMedia(items[idx]);
      if (idx < items.length - 1) {
        await new Promise((r) => window.setTimeout(r, 140));
      }
    }
  };

  const openEditPhotoPostModal = (post: {
    groupKey: string;
    items: ProfileMediaEntry[];
    title: string;
    note: string;
  }) => {
    setEditPhotoError('');
    setEditingPhotoPost({
      groupKey: post.groupKey,
      items: post.items,
      title: post.title,
      caption: post.note,
    });
  };

  const handleSavePhotoPostEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhotoPost || !onUpdateProfileMedia) return;
    const cleanTitle = editingPhotoPost.title.trim().slice(0, 160);
    const cleanCaption = editingPhotoPost.caption.trim().slice(0, 500) || undefined;

    setSavingPhotoEdit(true);
    setEditPhotoError('');
    try {
      await Promise.all(
        editingPhotoPost.items.map((item) =>
          onUpdateProfileMedia(
            {
              ...item,
              title: cleanTitle,
              note: cleanCaption,
            },
            { newFilePicked: false }
          )
        )
      );
      setEditingPhotoPost(null);
    } catch {
      setEditPhotoError(t.importErrorToast);
    } finally {
      setSavingPhotoEdit(false);
    }
  };

  const openEditApkModal = (item: ProfileMediaEntry) => {
    const cleanTitle = stripBaseApkName(item.title);
    setEditApkError('');
    setEditApkProgress(0);
    setEditingApk({
      item,
      title: cleanTitle || stripBaseApkName(item.fileName).replace(/\.apk$/i, '') || '',
      fileName: item.fileName ?? '',
      caption: item.note ?? '',
      category: item.category || 'WHATSAPP',
      thumbnailDataUrl: item.thumbnailDataUrl,
      replacementFile: undefined,
    });
  };

  const handleEditApkThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const imgFile = e.target.files?.[0];
    e.target.value = '';
    if (!imgFile) return;
    setEditApkError('');
    try {
      const compressed = await compressImageForVault(imgFile, 800, 180000);
      setEditingApk((prev) => (prev ? { ...prev, thumbnailDataUrl: compressed } : prev));
    } catch {
      setEditApkError(t.importErrorToast);
    }
  };

  const handleEditApkReplacementFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_MEDIA_FILE_BYTES) {
      setEditApkError(t.mediaVideoTooLarge);
      return;
    }
    setEditApkError('');
    setEditingApk((prev) =>
      prev ? { ...prev, replacementFile: file, fileName: file.name.trim() } : prev
    );
  };

  const handleSaveApkEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApk || !onUpdateProfileMedia) return;
    const { item, title, fileName, caption, category, thumbnailDataUrl, replacementFile } =
      editingApk;
    const cleanTitle = stripBaseApkName(title.trim()) || category || 'Android App';
    const cleanCaption = caption.trim().slice(0, 500) || undefined;
    const selectedCategory = category || 'WHATSAPP';
    const editedFileName = fileName.trim().slice(0, 200) || undefined;

    setSavingApkEdit(true);
    setEditApkError('');
    setEditApkProgress(replacementFile ? 8 : 50);

    try {
      if (replacementFile) {
        const rawDataUrl = await fileToBase64DataUrl(replacementFile);
        const cleanReplacementRaw = replacementFile.name.trim();
        const resolvedFileName =
          editedFileName || (cleanReplacementRaw ? cleanReplacementRaw.slice(0, 200) : 'base.apk');

        const updatedEntry: ProfileMediaEntry = {
          ...item,
          title: cleanTitle.slice(0, 160),
          category: selectedCategory,
          note: cleanCaption,
          thumbnailDataUrl,
          mimeType: 'application/vnd.android.package-archive',
          fileName: resolvedFileName,
          fileSize: replacementFile.size,
          dataUrl: rawDataUrl,
          chunkCount: 0,
        };

        if (rawDataUrl.length > 680000) {
          const objUrl = URL.createObjectURL(replacementFile);
          cacheProfileMediaObjectUrl(item.id, objUrl);
          mediaUrlsRef.current[item.id] = objUrl;
          setMediaUrls((prev) => ({ ...prev, [item.id]: objUrl }));
        }

        await onUpdateProfileMedia(updatedEntry, {
          newFilePicked: true,
          onProgress: (pct) => setEditApkProgress(pct),
        });
      } else {
        const updatedEntry: ProfileMediaEntry = {
          ...item,
          title: cleanTitle.slice(0, 160),
          category: selectedCategory,
          fileName: editedFileName ?? item.fileName,
          note: cleanCaption,
          thumbnailDataUrl,
        };
        await onUpdateProfileMedia(updatedEntry, { newFilePicked: false });
      }
      setEditingApk(null);
    } catch (err) {
      if (err instanceof Error && err.message === 'VIDEO_TOO_LARGE') {
        setEditApkError(t.mediaVideoTooLarge);
      } else {
        setEditApkError(t.importErrorToast);
      }
    } finally {
      setSavingApkEdit(false);
      setEditApkProgress(0);
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
      {/* Upload Panel (shown exclusively via Hamburger Menu -> XP - 4) */}
      {uploadPanelOpen && (
        <section
          ref={uploadSectionRef}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs"
        >
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
              {(pendingUpload.kind === 'photo' || pendingUpload.kind === 'screenshot') ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold shrink-0">
                        {getKindBadgeLabel(pendingUpload.kind)}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {pendingUpload.files.length} {t.mediaSelectedPhotosLabel}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatFileSize(
                        pendingUpload.files.reduce((sum, f) => sum + f.size, 0)
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {pendingUpload.files.map((file, idx) => (
                      <div
                        key={`${file.name}-${file.size}-${idx}`}
                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900"
                      >
                        {pendingUpload.previewUrls[idx] ? (
                          <img
                            src={pendingUpload.previewUrls[idx]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-semibold tabular-nums">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => handleRemovePendingFile(idx)}
                          aria-label={t.deleteAccount}
                          className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/75 hover:bg-red-600 text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <label className="aspect-square rounded-lg border-2 border-dashed border-emerald-400/70 dark:border-emerald-700 bg-white/80 dark:bg-slate-900/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex flex-col items-center justify-center gap-1 p-2 text-center cursor-pointer transition-colors">
                      <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 leading-tight">
                        {t.mediaAddMorePhotosBtn}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={handleAppendMorePhotos}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {pendingUpload.previewUrls[0] ? (
                    <img
                      src={pendingUpload.previewUrls[0]}
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
                        {pendingUpload.kind === 'apk'
                          ? pendingUpload.title.trim() ||
                            stripBaseApkName(pendingUpload.files[0]?.name) ||
                            pendingUpload.category ||
                            'APK App'
                          : pendingUpload.files.length > 1
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
              )}

              {pendingUpload.kind === 'apk' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      {t.categoryLabel}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {APK_CATEGORIES.map((cat) => {
                        const active = (pendingUpload.category || 'WHATSAPP') === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            disabled={uploading}
                            onClick={() =>
                              setPendingUpload((prev) =>
                                prev ? { ...prev, category: cat } : prev
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg border text-center text-[11px] font-semibold tracking-wide transition-colors truncate ${
                              active
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

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
                </>
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
                  <span>
                    {pendingUpload.kind === 'photo' || pendingUpload.kind === 'screenshot'
                      ? `${t.mediaPostBtn} (${pendingUpload.files.length})`
                      : t.mediaConfirmUploadBtn}
                  </span>
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
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['apk', t.mediaFilterApk, counts.apk],
              ['photo', t.mediaFilterPhoto, counts.photo],
              ['video', t.mediaFilterVideo, counts.video],
              ['screenshot', t.mediaFilterScreenshot, counts.screenshot],
              ['number', t.mediaFilterNumber, counts.number],
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

        {/* APK Category Filter Bar */}
        {filterKind === 'apk' && apkCategoryCounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedApkCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-colors whitespace-nowrap ${
                selectedApkCategory === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.mediaAllCategories} ({categoryItems.length})
            </button>
            {apkCategoryCounts.map(([cat, count]) => {
              const active = selectedApkCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedApkCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Category Content */}
        {categoryItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center space-y-2 shadow-xs">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t.mediaEmptyTitle}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {t.mediaEmptyDesc}
            </p>
          </div>
        ) : filterKind === 'apk' ? (
          <div className="space-y-3">
            {visibleApkItems.map((item) => {
              const isConfirming = confirmDeleteId === item.id;
              const isDownloading = Boolean(downloadingIds[item.id]);
              const isApkNameRevealed = Boolean(revealedApkIds[item.id]);
              const cleanTitle = stripBaseApkName(item.title);
              const cleanFile = stripBaseApkName(item.fileName).replace(/\.apk$/i, '').trim();
              const apkDisplayName =
                cleanTitle || cleanFile || item.category || 'Android App';
              const apkCategoryLine = item.category ? `${item.category} - APK` : 'APK';
              const originalApkFileName = item.fileName?.trim() || 'base.apk';

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3 sm:gap-5">
                    {/* Left: Gallery Photo + Center Info (MD KIRON MONDAL -> CATEGORY - APK -> Title -> Caption) */}
                    <div className="min-w-0 flex-1 flex items-center gap-3 sm:gap-4">
                      {item.thumbnailDataUrl ? (
                        <button
                          type="button"
                          onClick={() => setLightboxItem(item)}
                          title={apkDisplayName}
                          className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        >
                          <img
                            src={item.thumbnailDataUrl}
                            alt={apkDisplayName}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-300 flex flex-col items-center justify-center shrink-0">
                          <Package className="w-5 h-5" />
                          <span className="text-[9px] font-mono font-bold mt-0.5">.apk</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            MD KIRON MONDAL
                          </h3>

                          <div className="relative shrink-0" data-apk-menu>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenApkMenuId((prev) => (prev === item.id ? null : item.id))
                              }
                              aria-expanded={openApkMenuId === item.id}
                              aria-haspopup="menu"
                              title={t.editAccount}
                              aria-label={t.editAccount}
                              className={`inline-flex items-center justify-center p-0.5 rounded transition-colors ${
                                openApkMenuId === item.id
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {openApkMenuId === item.id && (
                              <div
                                role="menu"
                                className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-40 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5 z-40"
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenApkMenuId(null);
                                    openEditApkModal(item);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors whitespace-nowrap"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{t.editAccount}</span>
                                </button>

                                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenApkMenuId(null);
                                    setConfirmDeleteId(isConfirming ? null : item.id);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors whitespace-nowrap"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>{t.deleteAccount}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">
                          {apkCategoryLine}
                        </p>

                        <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 break-words">
                          {apkDisplayName}
                        </p>

                        {item.note && (
                          <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white break-words">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Tapping SADIYA reveals original filename; tapping fileSize downloads */}
                    <div className="self-center flex flex-col items-center gap-2 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-slate-50/80 dark:bg-slate-950/60 shrink-0 min-w-[116px] max-w-[175px]">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedApkIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                        }
                        title={originalApkFileName}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200/90 dark:border-emerald-800/70 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold tracking-wider text-emerald-700 dark:text-emerald-400 transition-colors hover:border-emerald-400 dark:hover:border-emerald-600 cursor-pointer"
                      >
                        <span className="truncate font-mono">
                          {isApkNameRevealed ? originalApkFileName : 'SADIYA'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleDownloadMedia(item)}
                        title={t.mediaDownloadBtn}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:hover:bg-emerald-500 dark:hover:text-slate-950 disabled:opacity-60 text-[11px] font-semibold tracking-wide transition-all duration-150 active:scale-[0.97] whitespace-nowrap cursor-pointer"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>
                          {isDownloading
                            ? t.mediaDownloadingApk
                            : item.fileSize
                            ? formatFileSize(item.fileSize)
                            : t.mediaDownloadBtn}
                        </span>
                      </button>
                    </div>
                  </div>

                  {isConfirming && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs">
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
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          {t.confirmDelete}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : filterKind === 'photo' || filterKind === 'screenshot' ? (
          <div className="max-w-2xl mx-auto space-y-4">
            {photoPosts.map((post) => {
              const isConfirming = confirmDeleteId === post.groupKey;
              const isPostDownloading = post.items.some((entry) =>
                Boolean(downloadingIds[entry.id])
              );
              const count = post.items.length;
              const getSrc = (entry: ProfileMediaEntry) =>
                entry.dataUrl || mediaUrls[entry.id] || getCachedProfileMediaObjectUrl(entry.id);
              const openPhotoLightbox = (entry: ProfileMediaEntry) => {
                if (!getSrc(entry)) return;
                setLightboxGroup(post.items);
                setLightboxItem(entry);
              };

              const renderTile = (
                entry: ProfileMediaEntry,
                extraClass = '',
                overlayCount = 0
              ) => {
                const src = getSrc(entry);
                const loading = Boolean(loadingMediaIds[entry.id]);
                return (
                  <div
                    key={entry.id}
                    onClick={() => openPhotoLightbox(entry)}
                    className={`relative bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-pointer group ${extraClass}`}
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={entry.title || post.title || entry.kind}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full min-h-[140px] text-slate-400">
                        <Loader2 className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      </div>
                    )}
                    {overlayCount > 0 && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                        <span className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
                          +{overlayCount}
                        </span>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <article
                  key={post.groupKey}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
                >
                  {/* Auto Header: MD KIRON MONDAL + Pencil Menu (Edit / Download / Delete), Title above Caption */}
                  <div className="px-4 py-3 space-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        MD KIRON MONDAL
                      </h3>

                      <div className="relative shrink-0" data-photo-menu>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenPhotoMenuId((prev) =>
                              prev === post.groupKey ? null : post.groupKey
                            )
                          }
                          aria-expanded={openPhotoMenuId === post.groupKey}
                          aria-haspopup="menu"
                          title={t.editAccount}
                          aria-label={t.editAccount}
                          className={`inline-flex items-center justify-center p-0.5 rounded transition-colors ${
                            openPhotoMenuId === post.groupKey
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {openPhotoMenuId === post.groupKey && (
                          <div
                            role="menu"
                            className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5 z-40"
                          >
                            {onUpdateProfileMedia && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenPhotoMenuId(null);
                                  openEditPhotoPostModal(post);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors whitespace-nowrap"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{t.editAccount}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              role="menuitem"
                              disabled={isPostDownloading}
                              onClick={() => {
                                setOpenPhotoMenuId(null);
                                void handleDownloadPhotoPost(post.items);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 disabled:opacity-60 text-left transition-colors whitespace-nowrap"
                            >
                              {isPostDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                              ) : (
                                <Download className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>
                                {isPostDownloading ? t.mediaDownloadingApk : t.mediaDownloadBtn}
                              </span>
                            </button>

                            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setOpenPhotoMenuId(null);
                                setConfirmDeleteId(isConfirming ? null : post.groupKey);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors whitespace-nowrap"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span>{t.deleteAccount}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {post.title && (
                      <p className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 break-words">
                        {post.title}
                      </p>
                    )}
                    {post.note && (
                      <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white break-words leading-snug whitespace-pre-wrap">
                        {post.note}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                      <span>{formatMediaDate(post.createdAt)}</span>
                      {count > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {count} {t.secondsShort === 'সে.' ? 'টি ছবি' : 'photos'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Facebook-Style Multi-Photo Collage Layout */}
                  <div className={isConfirming ? 'overflow-hidden' : 'rounded-b-xl overflow-hidden'}>
                    {count === 1 ? (
                      <div
                        onClick={() => openPhotoLightbox(post.items[0])}
                        className="relative min-h-[180px] bg-slate-950 cursor-pointer group overflow-hidden flex items-center justify-center"
                      >
                        {getSrc(post.items[0]) ? (
                          <img
                            src={getSrc(post.items[0])}
                            alt={post.title || post.items[0].kind}
                            loading="lazy"
                            className="w-full h-auto max-h-[580px] object-contain mx-auto transition-transform duration-200 group-hover:scale-[1.01]"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-56 text-slate-400">
                            <Loader2
                              className={`w-5 h-5 ${loadingMediaIds[post.items[0].id] ? 'animate-spin' : ''}`}
                            />
                          </div>
                        )}
                        {getSrc(post.items[0]) && (
                          <span className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-slate-950/65 text-white opacity-90 group-hover:opacity-100">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    ) : count === 2 ? (
                      <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-950">
                        {post.items.map((entry) =>
                          renderTile(entry, 'aspect-[3/4] sm:aspect-[4/5]')
                        )}
                      </div>
                    ) : count === 3 ? (
                      <div className="grid grid-cols-2 grid-rows-2 gap-1 h-[360px] sm:h-[460px] bg-white dark:bg-slate-950">
                        {renderTile(post.items[0], 'row-span-2 h-full')}
                        {renderTile(post.items[1], 'h-full')}
                        {renderTile(post.items[2], 'h-full')}
                      </div>
                    ) : count === 4 ? (
                      <div className="grid grid-cols-2 grid-rows-3 gap-1 h-[390px] sm:h-[490px] bg-white dark:bg-slate-950">
                        {renderTile(post.items[0], 'row-span-3 h-full')}
                        {renderTile(post.items[1], 'h-full')}
                        {renderTile(post.items[2], 'h-full')}
                        {renderTile(post.items[3], 'h-full')}
                      </div>
                    ) : (
                      <div className="space-y-1 bg-white dark:bg-slate-950">
                        <div className="grid grid-cols-2 gap-1 h-[195px] sm:h-[240px]">
                          {renderTile(post.items[0], 'h-full')}
                          {renderTile(post.items[1], 'h-full')}
                        </div>
                        <div className="grid grid-cols-3 gap-1 h-[135px] sm:h-[175px]">
                          {renderTile(post.items[2], 'h-full')}
                          {renderTile(post.items[3], 'h-full')}
                          {renderTile(post.items[4], 'h-full', count > 5 ? count - 5 : 0)}
                        </div>
                      </div>
                    )}
                  </div>

                  {isConfirming && (
                    <div className="m-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs">
                      <span className="text-red-700 dark:text-red-200 font-medium">
                        {t.mediaDeleteConfirm}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await Promise.all(
                              post.items.map((entry) => onDeleteProfileMedia(entry.id))
                            );
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          {t.confirmDelete}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
                        >
                          {t.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
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
                        <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white break-words">
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
                        {item.note && (
                          <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white break-words leading-relaxed">
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

      {/* Fullscreen Lightbox Modal for Full Photo & Full Video (with multi-photo Prev/Next) */}
      {lightboxItem && lightboxMediaSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/92 backdrop-blur-xs"
          onClick={() => {
            setLightboxItem(null);
            setLightboxGroup([]);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-5xl w-full bg-slate-950/95 border border-white/20 rounded-2xl overflow-hidden shadow-2xl text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2.5">
                {lightboxGroup.length > 1 && (
                  <span className="px-2 py-0.5 rounded bg-white/15 text-xs font-semibold tabular-nums shrink-0">
                    {Math.max(
                      1,
                      lightboxGroup.findIndex((x) => x.id === lightboxItem.id) + 1
                    )}{' '}
                    / {lightboxGroup.length}
                  </span>
                )}
                <div className="min-w-0">
                  {(lightboxItem.kind === 'apk' || lightboxItem.title) && (
                    <p className="text-sm font-semibold text-white truncate">
                      {lightboxItem.kind === 'apk'
                        ? stripBaseApkName(lightboxItem.title) ||
                          lightboxItem.category ||
                          'Android App'
                        : lightboxItem.title}
                    </p>
                  )}
                  {lightboxItem.note && (
                    <p className="text-xs text-white/75 truncate mt-0.5">
                      {lightboxItem.note}
                    </p>
                  )}
                </div>
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
                  onClick={() => {
                    setLightboxItem(null);
                    setLightboxGroup([]);
                  }}
                  aria-label={t.close}
                  className="p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative p-2 bg-black flex items-center justify-center max-h-[85vh] overflow-auto">
              {lightboxGroup.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous"
                    onClick={() => {
                      const idx = lightboxGroup.findIndex((x) => x.id === lightboxItem.id);
                      const prevIdx =
                        (idx - 1 + lightboxGroup.length) % lightboxGroup.length;
                      setLightboxItem(lightboxGroup[prevIdx]);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/65 hover:bg-black/85 border border-white/20 text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    onClick={() => {
                      const idx = lightboxGroup.findIndex((x) => x.id === lightboxItem.id);
                      const nextIdx = (idx + 1) % lightboxGroup.length;
                      setLightboxItem(lightboxGroup[nextIdx]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/65 hover:bg-black/85 border border-white/20 text-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
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
                  alt={lightboxItem.title || 'Photo'}
                  className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit APK Modal (Category, Photo, Title, Caption, or Optional File Replace) */}
      {editingApk && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => {
            if (!savingApkEdit) setEditingApk(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveApkEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.mediaApkEditTitle}</span>
              </h3>
              <button
                type="button"
                disabled={savingApkEdit}
                onClick={() => setEditingApk(null)}
                aria-label={t.close}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.categoryLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {APK_CATEGORIES.map((cat) => {
                  const active = editingApk.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={savingApkEdit}
                      onClick={() =>
                        setEditingApk((prev) => (prev ? { ...prev, category: cat } : prev))
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-center text-[11px] font-semibold tracking-wide transition-colors truncate ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gallery Thumbnail */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                {t.mediaApkThumbnailLabel}
              </label>
              <div className="flex items-center gap-3">
                {editingApk.thumbnailDataUrl ? (
                  <img
                    src={editingApk.thumbnailDataUrl}
                    alt={editingApk.title || 'APK'}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-300 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {editingApk.thumbnailDataUrl
                        ? t.mediaApkChangeThumbnailBtn
                        : t.mediaApkPickThumbnailBtn}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={savingApkEdit}
                      onChange={handleEditApkThumbnail}
                      className="sr-only"
                    />
                  </label>
                  {editingApk.thumbnailDataUrl && (
                    <button
                      type="button"
                      disabled={savingApkEdit}
                      onClick={() =>
                        setEditingApk((prev) =>
                          prev ? { ...prev, thumbnailDataUrl: undefined } : prev
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      {t.mediaApkRemoveThumbnailBtn}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.mediaUploadTitleLabel}
              </label>
              <input
                type="text"
                value={editingApk.title}
                disabled={savingApkEdit}
                onChange={(e) =>
                  setEditingApk((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                }
                placeholder={t.mediaUploadTitlePlaceholder}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            {/* Original APK File Name (shown on SADIYA tap) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.secondsShort === 'সে.' ? 'APK ফাইলের আসল নাম' : 'APK File Name'}
              </label>
              <input
                type="text"
                value={editingApk.fileName}
                disabled={savingApkEdit}
                onChange={(e) =>
                  setEditingApk((prev) => (prev ? { ...prev, fileName: e.target.value } : prev))
                }
                placeholder="base.apk"
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            {/* Caption */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.mediaUploadCaptionLabel}
              </label>
              <textarea
                rows={2}
                value={editingApk.caption}
                disabled={savingApkEdit}
                onChange={(e) =>
                  setEditingApk((prev) => (prev ? { ...prev, caption: e.target.value } : prev))
                }
                placeholder={t.mediaUploadCaptionPlaceholder}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Optional Replace APK Binary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
                <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>{t.mediaApkReplaceFileBtn}</span>
                <input
                  type="file"
                  disabled={savingApkEdit}
                  onChange={handleEditApkReplacementFile}
                  className="sr-only"
                />
              </label>
              {editingApk.replacementFile && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatFileSize(editingApk.replacementFile.size)}
                </span>
              )}
            </div>

            {savingApkEdit && editApkProgress > 0 && editingApk.replacementFile && (
              <div className="space-y-1 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <span>{t.mediaUploadingLabel}</span>
                  <span className="tabular-nums">{editApkProgress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-emerald-200 dark:bg-emerald-900 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200"
                    style={{ width: `${Math.max(8, editApkProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {editApkError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editApkError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={savingApkEdit}
                onClick={() => setEditingApk(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={savingApkEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
              >
                {savingApkEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t.mediaApkSaveEditBtn}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Photo Post Modal (Title above Caption) */}
      {editingPhotoPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs"
          onClick={() => {
            if (!savingPhotoEdit) setEditingPhotoPost(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSavePhotoPostEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{t.mediaPhotoEditTitle}</span>
              </h3>
              <button
                type="button"
                disabled={savingPhotoEdit}
                onClick={() => setEditingPhotoPost(null)}
                aria-label={t.close}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.mediaUploadTitleLabel}
              </label>
              <input
                type="text"
                value={editingPhotoPost.title}
                disabled={savingPhotoEdit}
                onChange={(e) =>
                  setEditingPhotoPost((prev) =>
                    prev ? { ...prev, title: e.target.value } : prev
                  )
                }
                placeholder={t.mediaUploadTitlePlaceholder}
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t.mediaUploadCaptionLabel}
              </label>
              <textarea
                rows={3}
                value={editingPhotoPost.caption}
                disabled={savingPhotoEdit}
                onChange={(e) =>
                  setEditingPhotoPost((prev) =>
                    prev ? { ...prev, caption: e.target.value } : prev
                  )
                }
                placeholder={t.mediaUploadCaptionPlaceholder}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
              />
            </div>

            {editPhotoError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editPhotoError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={savingPhotoEdit}
                onClick={() => setEditingPhotoPost(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={savingPhotoEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
              >
                {savingPhotoEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{t.mediaApkSaveEditBtn}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
