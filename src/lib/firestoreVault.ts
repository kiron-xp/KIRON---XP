import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AccountEntry,
  EmailEntry,
  NoteColor,
  NoteEntry,
  ProfileMediaEntry,
  ProfileMediaKind,
  RecoveryCode,
  SheetEntry,
  SiteEntryConfig,
  VaultData,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';

const ACCOUNTS_PATH = 'accounts';
const EMAILS_PATH = 'emails';
const NOTES_PATH = 'notes';
const SHEETS_PATH = 'sheets';
const RECOVERY_PATH = 'recoveryCodes';
const PROFILE_MEDIA_PATH = 'profileMedia';
const SITE_CONFIG_PATH = 'siteConfig';
const SITE_CONFIG_DOC_ID = 'entry';
const SITE_CONFIG_CACHE_KEY = 'kiron_site_entry_cache_v1';
const MIGRATION_FLAG_KEY = 'kiron_firestore_migrated_v1';

export const DEFAULT_SITE_ENTRY_CONFIG: SiteEntryConfig = {
  id: SITE_CONFIG_DOC_ID,
  headerTitle: 'KIRON - XP',
  lockTitle: 'INFINITY - KIRON - XP',
  lockDesc: 'ENTER YOUR PASSWORD TO ACCESS THE WEBSITE',
  unlockBtnText: '',
  bio: '',
  telegramUrl: '',
  whatsappUrl: '',
  tiktokUrl: '',
  instagramUrl: '',
  wechatUrl: '',
  facebookUrl: '',
  imoUrl: '',
  messengerUrl: '',
  whatsappUrl2: '',
  telegramUrl2: '',
  showSocialLinks: true,
  showLogo: true,
  overlayOpacity: 25,
  wallpaperDataUrl: undefined,
  insideWallpaperDataUrl: undefined,
  insideOverlayOpacity: 35,
  entryPasswordHash: undefined,
  updatedAt: 0,
};

export function loadCachedSiteEntryConfig(): SiteEntryConfig {
  try {
    const raw = localStorage.getItem(SITE_CONFIG_CACHE_KEY);
    if (!raw) return DEFAULT_SITE_ENTRY_CONFIG;
    const parsed = JSON.parse(raw) as Partial<SiteEntryConfig>;
    return {
      ...DEFAULT_SITE_ENTRY_CONFIG,
      ...parsed,
      id: SITE_CONFIG_DOC_ID,
    };
  } catch {
    return DEFAULT_SITE_ENTRY_CONFIG;
  }
}

function cacheSiteEntryConfig(config: SiteEntryConfig): void {
  try {
    localStorage.setItem(SITE_CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

const VALID_COLORS: NoteColor[] = ['default', 'emerald', 'amber', 'sky', 'rose', 'violet'];
const VALID_MEDIA_KINDS: ProfileMediaKind[] = ['photo', 'screenshot', 'video', 'number', 'apk'];
const CHUNK_CHAR_SIZE = 760000;
const INLINE_MEDIA_MAX_CHARS = 680000;
export const MAX_MEDIA_CHUNKS = 200;
export const MAX_MEDIA_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_CHUNKS = MAX_MEDIA_CHUNKS;
export const MAX_VIDEO_FILE_BYTES = MAX_MEDIA_FILE_BYTES;

const mediaObjectUrlCache = new Map<string, string>();

export function getCachedProfileMediaObjectUrl(id: string): string | undefined {
  return mediaObjectUrlCache.get(sanitizeDocId(id));
}

export function cacheProfileMediaObjectUrl(id: string, objectUrl: string): void {
  const docId = sanitizeDocId(id);
  const existing = mediaObjectUrlCache.get(docId);
  if (existing && existing !== objectUrl && existing.startsWith('blob:')) {
    URL.revokeObjectURL(existing);
  }
  mediaObjectUrlCache.set(docId, objectUrl);
}

export function sanitizeDocId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `id-${Date.now()}`;
}

function cleanAccountPayload(acc: AccountEntry): Record<string, unknown> {
  const id = sanitizeDocId(acc.id);
  const issuer = String(acc.issuer || 'Account').trim().slice(0, 120) || 'Account';
  const rawAccountName = String(acc.accountName ?? '').trim().slice(0, 200);
  const accountName = rawAccountName.toLowerCase() === 'user' ? '' : rawAccountName;
  const secret = String(acc.secret || 'JBSWY3DPEHPK3PXP').trim().slice(0, 256);
  const type = acc.type === 'hotp' ? 'hotp' : 'totp';
  const algorithm =
    acc.algorithm === 'SHA-256' || acc.algorithm === 'SHA-512' ? acc.algorithm : 'SHA-1';
  const digits = acc.digits === 8 ? 8 : 6;
  const period =
    acc.period === 15 || acc.period === 60 || acc.period === 90 ? acc.period : 30;
  const counter =
    typeof acc.counter === 'number' && Number.isFinite(acc.counter) && acc.counter >= 0
      ? Math.min(1000000000, Math.floor(acc.counter))
      : 0;
  const createdAt =
    typeof acc.createdAt === 'number' && acc.createdAt > 0 ? acc.createdAt : Date.now();

  const payload: Record<string, unknown> = {
    id,
    issuer,
    accountName,
    secret,
    type,
    algorithm,
    digits,
    period,
    counter,
    createdAt,
  };

  if (typeof acc.category === 'string' && acc.category.trim().length > 0) {
    payload.category = acc.category.trim().slice(0, 60);
  }
  if (typeof acc.caption === 'string' && acc.caption.trim().length > 0) {
    payload.caption = acc.caption.trim().slice(0, 300);
  }
  if (
    typeof acc.avatarDataUrl === 'string' &&
    acc.avatarDataUrl.length > 0 &&
    acc.avatarDataUrl.length <= 200000
  ) {
    payload.avatarDataUrl = acc.avatarDataUrl;
  }

  return payload;
}

function cleanEmailPayload(entry: EmailEntry): Record<string, unknown> {
  const id = sanitizeDocId(entry.id);
  const email = String(entry.email || '').trim().slice(0, 200) || 'user@example.com';
  const createdAt =
    typeof entry.createdAt === 'number' && entry.createdAt > 0 ? entry.createdAt : Date.now();
  const updatedAt =
    typeof entry.updatedAt === 'number' && entry.updatedAt >= createdAt
      ? entry.updatedAt
      : createdAt;

  const payload: Record<string, unknown> = {
    id,
    email,
    createdAt,
    updatedAt,
  };

  if (typeof entry.label === 'string' && entry.label.trim().length > 0) {
    payload.label = entry.label.trim().slice(0, 120);
  }
  if (typeof entry.password === 'string' && entry.password.length > 0) {
    payload.password = entry.password.slice(0, 200);
  }
  if (typeof entry.note === 'string' && entry.note.trim().length > 0) {
    payload.note = entry.note.trim().slice(0, 500);
  }
  if (
    typeof entry.avatarDataUrl === 'string' &&
    entry.avatarDataUrl.length > 0 &&
    entry.avatarDataUrl.length <= 200000
  ) {
    payload.avatarDataUrl = entry.avatarDataUrl;
  }

  return payload;
}

function cleanNotePayload(note: NoteEntry): Record<string, unknown> {
  const id = sanitizeDocId(note.id);
  const createdAt =
    typeof note.createdAt === 'number' && note.createdAt > 0 ? note.createdAt : Date.now();
  const updatedAt =
    typeof note.updatedAt === 'number' && note.updatedAt >= createdAt
      ? note.updatedAt
      : createdAt;

  return {
    id,
    title: String(note.title ?? '').slice(0, 200),
    content: String(note.content ?? '').slice(0, 20000),
    color: VALID_COLORS.includes(note.color) ? note.color : 'default',
    pinned: Boolean(note.pinned),
    createdAt,
    updatedAt,
  };
}

interface FirestoreSheetDoc {
  id: string;
  title: string;
  rowCount: number;
  colCount: number;
  rowsMap: Record<string, string[]>;
  createdAt: number;
  updatedAt: number;
}

function cleanSheetPayload(sheet: SheetEntry): FirestoreSheetDoc {
  const id = sanitizeDocId(sheet.id);
  const rawRows = Array.isArray(sheet.rows) ? sheet.rows : [];
  const rowCount = Math.min(500, Math.max(1, rawRows.length || 100));
  const colCount = Math.min(50, Math.max(1, rawRows[0]?.length || 10));

  const rowsMap: Record<string, string[]> = {};
  for (let r = 0; r < rowCount; r += 1) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    const normalizedRow = Array.from({ length: colCount }, (_, c) =>
      String(row[c] ?? '').slice(0, 500)
    );
    if (normalizedRow.some((cell) => cell.length > 0)) {
      rowsMap[String(r)] = normalizedRow;
    }
  }

  const createdAt =
    typeof sheet.createdAt === 'number' && sheet.createdAt > 0 ? sheet.createdAt : Date.now();
  const updatedAt =
    typeof sheet.updatedAt === 'number' && sheet.updatedAt >= createdAt
      ? sheet.updatedAt
      : createdAt;

  return {
    id,
    title: String(sheet.title ?? '').slice(0, 200),
    rowCount,
    colCount,
    rowsMap,
    createdAt,
    updatedAt,
  };
}

function firestoreDocToSheet(raw: Record<string, unknown>): SheetEntry {
  const id = String(raw.id ?? '');
  const title = String(raw.title ?? '');
  const rowCount =
    typeof raw.rowCount === 'number' && raw.rowCount >= 1 ? Math.min(500, raw.rowCount) : 100;
  const colCount =
    typeof raw.colCount === 'number' && raw.colCount >= 1 ? Math.min(50, raw.colCount) : 10;
  const rowsMap =
    raw.rowsMap && typeof raw.rowsMap === 'object'
      ? (raw.rowsMap as Record<string, unknown>)
      : {};

  const rows: string[][] = Array.from({ length: rowCount }, (_, r) => {
    const rowVal = rowsMap[String(r)];
    if (!Array.isArray(rowVal)) {
      return Array.from({ length: colCount }, () => '');
    }
    return Array.from({ length: colCount }, (_, c) => String(rowVal[c] ?? ''));
  });

  const createdAt = typeof raw.createdAt === 'number' ? raw.createdAt : Date.now();
  const updatedAt = typeof raw.updatedAt === 'number' ? raw.updatedAt : createdAt;

  return { id, title, rows, createdAt, updatedAt };
}

function cleanRecoveryPayload(rc: RecoveryCode): Record<string, unknown> {
  const id = sanitizeDocId(rc.id);
  const code = String(rc.code || '').slice(0, 64);
  const payload: Record<string, unknown> = {
    id,
    code: code.length >= 4 ? code : `REC-${id.slice(0, 8)}`,
    used: Boolean(rc.used),
  };
  if (typeof rc.usedAt === 'number' && rc.usedAt > 0) {
    payload.usedAt = rc.usedAt;
  }
  return payload;
}

export async function upsertAccountDoc(account: AccountEntry): Promise<void> {
  const payload = cleanAccountPayload(account);
  const docId = String(payload.id);
  const path = `${ACCOUNTS_PATH}/${docId}`;
  try {
    await setDoc(doc(db, ACCOUNTS_PATH, docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAccountDoc(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `${ACCOUNTS_PATH}/${docId}`;
  try {
    await deleteDoc(doc(db, ACCOUNTS_PATH, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertEmailDoc(entry: EmailEntry): Promise<void> {
  const payload = cleanEmailPayload(entry);
  const docId = String(payload.id);
  const path = `${EMAILS_PATH}/${docId}`;
  try {
    await setDoc(doc(db, EMAILS_PATH, docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEmailDoc(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `${EMAILS_PATH}/${docId}`;
  try {
    await deleteDoc(doc(db, EMAILS_PATH, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertNoteDoc(note: NoteEntry): Promise<void> {
  const payload = cleanNotePayload(note);
  const docId = String(payload.id);
  const path = `${NOTES_PATH}/${docId}`;
  try {
    await setDoc(doc(db, NOTES_PATH, docId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNoteDoc(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `${NOTES_PATH}/${docId}`;
  try {
    await deleteDoc(doc(db, NOTES_PATH, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertSheetDoc(sheet: SheetEntry): Promise<void> {
  const payload = cleanSheetPayload(sheet);
  const path = `${SHEETS_PATH}/${payload.id}`;
  try {
    await setDoc(doc(db, SHEETS_PATH, payload.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSheetDoc(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const path = `${SHEETS_PATH}/${docId}`;
  try {
    await deleteDoc(doc(db, SHEETS_PATH, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function replaceRecoveryCodesInFirestore(
  previousCodes: RecoveryCode[],
  nextCodes: RecoveryCode[]
): Promise<void> {
  try {
    await Promise.all(
      previousCodes.map((rc) => deleteDoc(doc(db, RECOVERY_PATH, sanitizeDocId(rc.id))))
    );
    await Promise.all(
      nextCodes.map((rc) => {
        const payload = cleanRecoveryPayload(rc);
        return setDoc(doc(db, RECOVERY_PATH, String(payload.id)), payload);
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, RECOVERY_PATH);
  }
}

function cleanProfileMediaPayload(
  entry: ProfileMediaEntry,
  inlineDataUrl: string,
  chunkCount: number
): Record<string, unknown> {
  const id = sanitizeDocId(entry.id);
  const kind: ProfileMediaKind = VALID_MEDIA_KINDS.includes(entry.kind) ? entry.kind : 'photo';
  const createdAt =
    typeof entry.createdAt === 'number' && entry.createdAt > 0 ? entry.createdAt : Date.now();
  const updatedAt =
    typeof entry.updatedAt === 'number' && entry.updatedAt >= createdAt
      ? entry.updatedAt
      : createdAt;

  const payload: Record<string, unknown> = {
    id,
    kind,
    title: String(entry.title ?? '').trim().slice(0, 160),
    mimeType: String(entry.mimeType ?? 'application/octet-stream').slice(0, 100),
    chunkCount: Math.max(0, Math.min(MAX_MEDIA_CHUNKS, Math.floor(chunkCount))),
    createdAt,
    updatedAt,
  };

  if (typeof entry.category === 'string' && entry.category.trim().length > 0) {
    payload.category = entry.category.trim().slice(0, 60);
  }
  if (typeof entry.numberValue === 'string' && entry.numberValue.trim().length > 0) {
    payload.numberValue = entry.numberValue.trim().slice(0, 120);
  }
  if (typeof entry.note === 'string' && entry.note.trim().length > 0) {
    payload.note = entry.note.trim().slice(0, 500);
  }
  if (typeof entry.fileName === 'string' && entry.fileName.trim().length > 0) {
    payload.fileName = entry.fileName.trim().slice(0, 200);
  }
  if (
    typeof entry.fileSize === 'number' &&
    Number.isFinite(entry.fileSize) &&
    entry.fileSize >= 0
  ) {
    payload.fileSize = Math.min(105000000, Math.floor(entry.fileSize));
  }
  if (inlineDataUrl.length > 0 && inlineDataUrl.length <= 750000) {
    payload.dataUrl = inlineDataUrl;
  }
  if (
    typeof entry.thumbnailDataUrl === 'string' &&
    entry.thumbnailDataUrl.length > 0 &&
    entry.thumbnailDataUrl.length <= 200000
  ) {
    payload.thumbnailDataUrl = entry.thumbnailDataUrl;
  }

  return payload;
}

export async function saveProfileMediaDoc(
  entry: ProfileMediaEntry,
  onProgress?: (pct: number) => void
): Promise<ProfileMediaEntry> {
  const docId = sanitizeDocId(entry.id);
  const path = `${PROFILE_MEDIA_PATH}/${docId}`;
  const rawData = entry.dataUrl ?? '';

  try {
    if (rawData.length <= INLINE_MEDIA_MAX_CHARS) {
      const payload = cleanProfileMediaPayload({ ...entry, id: docId }, rawData, 0);
      await setDoc(doc(db, PROFILE_MEDIA_PATH, docId), payload);
      onProgress?.(100);
      return { ...entry, id: docId, chunkCount: 0, dataUrl: rawData || undefined };
    }

    const totalChunks = Math.ceil(rawData.length / CHUNK_CHAR_SIZE);
    if (totalChunks > MAX_VIDEO_CHUNKS) {
      throw new Error('VIDEO_TOO_LARGE');
    }

    const parentPayload = cleanProfileMediaPayload({ ...entry, id: docId }, '', totalChunks);
    await setDoc(doc(db, PROFILE_MEDIA_PATH, docId), parentPayload);
    onProgress?.(10);

    for (let start = 0; start < totalChunks; start += 12) {
      const batchEnd = Math.min(totalChunks, start + 12);
      const writes: Promise<void>[] = [];
      for (let i = start; i < batchEnd; i += 1) {
        const slice = rawData.slice(i * CHUNK_CHAR_SIZE, (i + 1) * CHUNK_CHAR_SIZE);
        const chunkId = `chunk-${i}`;
        writes.push(
          setDoc(doc(db, PROFILE_MEDIA_PATH, docId, 'chunks', chunkId), {
            id: chunkId,
            mediaId: docId,
            index: i,
            data: slice,
          })
        );
      }
      await Promise.all(writes);
      onProgress?.(Math.min(100, Math.round(10 + (batchEnd / totalChunks) * 90)));
    }

    return { ...entry, id: docId, chunkCount: totalChunks, dataUrl: undefined };
  } catch (error) {
    if (error instanceof Error && error.message === 'VIDEO_TOO_LARGE') {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function dataUrlToBlob(dataUrl: string, fallbackMime: string): Blob {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    return new Blob([], { type: fallbackMime });
  }
  const header = dataUrl.slice(0, commaIdx);
  const base64 = dataUrl.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+);/i);
  const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function loadProfileMediaObjectUrl(entry: ProfileMediaEntry): Promise<string> {
  const docId = sanitizeDocId(entry.id);
  const cached = mediaObjectUrlCache.get(docId);
  if (cached) {
    return cached;
  }

  let fullDataUrl = entry.dataUrl ?? '';

  if (!fullDataUrl && entry.chunkCount > 0) {
    try {
      const snap = await getDocs(
        query(
          collection(db, PROFILE_MEDIA_PATH, docId, 'chunks'),
          where('index', '>=', 0),
          orderBy('index', 'asc')
        )
      );
      const parts = snap.docs
        .map((d) => d.data() as { index: number; data: string })
        .sort((a, b) => a.index - b.index)
        .map((c) => c.data);
      fullDataUrl = parts.join('');
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `${PROFILE_MEDIA_PATH}/${docId}/chunks`);
    }
  }

  if (!fullDataUrl) {
    throw new Error('MEDIA_EMPTY');
  }

  const blob = dataUrlToBlob(fullDataUrl, entry.mimeType || 'application/octet-stream');
  const objectUrl = URL.createObjectURL(blob);
  mediaObjectUrlCache.set(docId, objectUrl);
  return objectUrl;
}

export const loadProfileMediaVideoObjectUrl = loadProfileMediaObjectUrl;

export async function deleteProfileMediaDoc(id: string): Promise<void> {
  const docId = sanitizeDocId(id);
  const cached = mediaObjectUrlCache.get(docId);
  if (cached && cached.startsWith('blob:')) {
    URL.revokeObjectURL(cached);
  }
  mediaObjectUrlCache.delete(docId);
  const path = `${PROFILE_MEDIA_PATH}/${docId}`;
  try {
    const chunkSnap = await getDocs(
      query(collection(db, PROFILE_MEDIA_PATH, docId, 'chunks'), where('index', '>=', 0))
    );
    if (!chunkSnap.empty) {
      await Promise.all(
        chunkSnap.docs.map((c) => deleteDoc(doc(db, PROFILE_MEDIA_PATH, docId, 'chunks', c.id)))
      );
    }
    await deleteDoc(doc(db, PROFILE_MEDIA_PATH, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateProfileMediaDoc(
  updatedEntry: ProfileMediaEntry,
  options?: { newFilePicked?: boolean; onProgress?: (pct: number) => void }
): Promise<ProfileMediaEntry> {
  const docId = sanitizeDocId(updatedEntry.id);
  const path = `${PROFILE_MEDIA_PATH}/${docId}`;
  const now = Date.now();

  if (options?.newFilePicked) {
    const cached = mediaObjectUrlCache.get(docId);
    if (cached && cached.startsWith('blob:')) {
      URL.revokeObjectURL(cached);
    }
    mediaObjectUrlCache.delete(docId);
    try {
      const chunkSnap = await getDocs(
        query(collection(db, PROFILE_MEDIA_PATH, docId, 'chunks'), where('index', '>=', 0))
      );
      if (!chunkSnap.empty) {
        await Promise.all(
          chunkSnap.docs.map((c) => deleteDoc(doc(db, PROFILE_MEDIA_PATH, docId, 'chunks', c.id)))
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${path}/chunks`);
    }
    return saveProfileMediaDoc({ ...updatedEntry, id: docId, updatedAt: now }, options.onProgress);
  }

  const cleanTitle = String(updatedEntry.title ?? '').trim().slice(0, 160);
  const cleanCategory = updatedEntry.category?.trim().slice(0, 60);
  const cleanNote = updatedEntry.note?.trim().slice(0, 500);
  const validThumb =
    typeof updatedEntry.thumbnailDataUrl === 'string' &&
    updatedEntry.thumbnailDataUrl.length > 0 &&
    updatedEntry.thumbnailDataUrl.length <= 200000
      ? updatedEntry.thumbnailDataUrl
      : undefined;

  const patch: Record<string, unknown> = {
    title: cleanTitle,
    category: cleanCategory ? cleanCategory : deleteField(),
    note: cleanNote ? cleanNote : deleteField(),
    thumbnailDataUrl: validThumb ? validThumb : deleteField(),
    updatedAt: now,
  };

  try {
    await updateDoc(doc(db, PROFILE_MEDIA_PATH, docId), patch);
    options?.onProgress?.(100);
    return {
      ...updatedEntry,
      id: docId,
      title: cleanTitle,
      category: cleanCategory || undefined,
      note: cleanNote || undefined,
      thumbnailDataUrl: validThumb,
      updatedAt: now,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function migrateLocalDataToFirestoreOnce(localVault: VaultData): Promise<void> {
  try {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === '1') return;

    const hasAnyLocalData =
      localVault.accounts.length > 0 ||
      (localVault.emails?.length ?? 0) > 0 ||
      (localVault.notes?.length ?? 0) > 0 ||
      (localVault.sheets?.length ?? 0) > 0;

    if (!hasAnyLocalData) {
      localStorage.setItem(MIGRATION_FLAG_KEY, '1');
      return;
    }

    const [existingAccs, existingEmails, existingNotes, existingSheets] = await Promise.all([
      getDocs(query(collection(db, ACCOUNTS_PATH), where('createdAt', '>', 0))),
      getDocs(query(collection(db, EMAILS_PATH), where('createdAt', '>', 0))),
      getDocs(query(collection(db, NOTES_PATH), where('updatedAt', '>', 0))),
      getDocs(query(collection(db, SHEETS_PATH), where('updatedAt', '>', 0))),
    ]);

    const accIds = new Set(existingAccs.docs.map((d) => d.id));
    const emailIds = new Set(existingEmails.docs.map((d) => d.id));
    const noteIds = new Set(existingNotes.docs.map((d) => d.id));
    const sheetIds = new Set(existingSheets.docs.map((d) => d.id));

    const uploads: Promise<void>[] = [];

    for (const acc of localVault.accounts) {
      const id = sanitizeDocId(acc.id);
      if (!accIds.has(id)) {
        uploads.push(upsertAccountDoc({ ...acc, id }));
      }
    }
    for (const em of localVault.emails ?? []) {
      const id = sanitizeDocId(em.id);
      if (!emailIds.has(id)) {
        uploads.push(upsertEmailDoc({ ...em, id }));
      }
    }
    for (const nt of localVault.notes ?? []) {
      const id = sanitizeDocId(nt.id);
      if (!noteIds.has(id)) {
        uploads.push(upsertNoteDoc({ ...nt, id }));
      }
    }
    for (const sh of localVault.sheets ?? []) {
      const id = sanitizeDocId(sh.id);
      if (!sheetIds.has(id)) {
        uploads.push(upsertSheetDoc({ ...sh, id }));
      }
    }

    if (uploads.length > 0) {
      await Promise.all(uploads);
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, '1');
  } catch (error) {
    console.warn('Local-to-Firestore migration skipped or failed:', error);
  }
}

export interface SharedVaultCallbacks {
  onAccounts: (accounts: AccountEntry[]) => void;
  onEmails: (emails: EmailEntry[]) => void;
  onNotes: (notes: NoteEntry[]) => void;
  onSheets: (sheets: SheetEntry[]) => void;
  onRecoveryCodes: (codes: RecoveryCode[]) => void;
  onProfileMedia?: (items: ProfileMediaEntry[]) => void;
}

export function subscribeToSharedVault(callbacks: SharedVaultCallbacks): Unsubscribe {
  const unsubAccounts = onSnapshot(
    query(collection(db, ACCOUNTS_PATH), where('createdAt', '>', 0), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data() as AccountEntry;
        return data.accountName?.trim().toLowerCase() === 'user'
          ? { ...data, accountName: '' }
          : data;
      });
      callbacks.onAccounts(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, ACCOUNTS_PATH);
    }
  );

  const unsubEmails = onSnapshot(
    query(collection(db, EMAILS_PATH), where('createdAt', '>', 0), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as EmailEntry);
      callbacks.onEmails(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, EMAILS_PATH);
    }
  );

  const unsubNotes = onSnapshot(
    query(collection(db, NOTES_PATH), where('updatedAt', '>', 0), orderBy('updatedAt', 'desc')),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as NoteEntry);
      callbacks.onNotes(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, NOTES_PATH);
    }
  );

  const unsubSheets = onSnapshot(
    query(collection(db, SHEETS_PATH), where('updatedAt', '>', 0), orderBy('updatedAt', 'desc')),
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        firestoreDocToSheet(d.data() as Record<string, unknown>)
      );
      callbacks.onSheets(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, SHEETS_PATH);
    }
  );

  const unsubRecovery = onSnapshot(
    query(collection(db, RECOVERY_PATH), where('code', '>=', '')),
    (snapshot) => {
      if (snapshot.docs.length > 0) {
        const list = snapshot.docs.map((d) => d.data() as RecoveryCode);
        callbacks.onRecoveryCodes(list);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, RECOVERY_PATH);
    }
  );

  const unsubProfileMedia = onSnapshot(
    query(
      collection(db, PROFILE_MEDIA_PATH),
      where('createdAt', '>', 0),
      orderBy('createdAt', 'desc')
    ),
    (snapshot) => {
      if (callbacks.onProfileMedia) {
        const list = snapshot.docs.map((d) => d.data() as ProfileMediaEntry);
        callbacks.onProfileMedia(list);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, PROFILE_MEDIA_PATH);
    }
  );

  return () => {
    unsubAccounts();
    unsubEmails();
    unsubNotes();
    unsubSheets();
    unsubRecovery();
    unsubProfileMedia();
  };
}

function cleanSiteEntryConfigPayload(config: SiteEntryConfig): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: SITE_CONFIG_DOC_ID,
    headerTitle: String(config.headerTitle ?? 'KIRON - XP').trim().slice(0, 80) || 'KIRON - XP',
    lockTitle: String(config.lockTitle ?? 'INFINITY - KIRON - XP').trim().slice(0, 120),
    lockDesc: String(config.lockDesc ?? 'ENTER YOUR PASSWORD TO ACCESS THE WEBSITE').trim().slice(0, 240),
    unlockBtnText: String(config.unlockBtnText ?? '').trim().slice(0, 60),
    bio: String(config.bio ?? '').slice(0, 300),
    showSocialLinks: Boolean(config.showSocialLinks),
    showLogo: Boolean(config.showLogo),
    overlayOpacity:
      typeof config.overlayOpacity === 'number' && Number.isFinite(config.overlayOpacity)
        ? Math.max(0, Math.min(80, Math.round(config.overlayOpacity)))
        : 25,
    updatedAt: Date.now(),
  };

  const optionalSocialKeys = [
    'telegramUrl',
    'whatsappUrl',
    'tiktokUrl',
    'instagramUrl',
    'wechatUrl',
    'facebookUrl',
    'imoUrl',
    'messengerUrl',
    'whatsappUrl2',
    'telegramUrl2',
  ] as const;

  for (const key of optionalSocialKeys) {
    const val = config[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      payload[key] = val.trim().slice(0, 300);
    }
  }
  if (
    typeof config.wallpaperDataUrl === 'string' &&
    config.wallpaperDataUrl.length > 0 &&
    config.wallpaperDataUrl.length <= 750000
  ) {
    payload.wallpaperDataUrl = config.wallpaperDataUrl;
  }
  if (
    typeof config.insideWallpaperDataUrl === 'string' &&
    config.insideWallpaperDataUrl.length > 0 &&
    config.insideWallpaperDataUrl.length <= 750000
  ) {
    payload.insideWallpaperDataUrl = config.insideWallpaperDataUrl;
  }
  if (
    typeof config.insideOverlayOpacity === 'number' &&
    Number.isFinite(config.insideOverlayOpacity)
  ) {
    payload.insideOverlayOpacity = Math.max(0, Math.min(80, Math.round(config.insideOverlayOpacity)));
  }
  if (typeof config.entryPasswordHash === 'string' && config.entryPasswordHash.length > 0) {
    payload.entryPasswordHash = config.entryPasswordHash.slice(0, 128);
  }

  return payload;
}

export async function saveSiteEntryConfig(config: SiteEntryConfig): Promise<SiteEntryConfig> {
  const payload = cleanSiteEntryConfigPayload(config);
  const path = `${SITE_CONFIG_PATH}/${SITE_CONFIG_DOC_ID}`;
  const normalized: SiteEntryConfig = {
    id: SITE_CONFIG_DOC_ID,
    headerTitle: String(payload.headerTitle),
    lockTitle: String(payload.lockTitle),
    lockDesc: String(payload.lockDesc),
    unlockBtnText: String(payload.unlockBtnText),
    bio: String(payload.bio),
    telegramUrl: typeof payload.telegramUrl === 'string' ? payload.telegramUrl : '',
    whatsappUrl: typeof payload.whatsappUrl === 'string' ? payload.whatsappUrl : '',
    tiktokUrl: typeof payload.tiktokUrl === 'string' ? payload.tiktokUrl : '',
    instagramUrl: typeof payload.instagramUrl === 'string' ? payload.instagramUrl : '',
    wechatUrl: typeof payload.wechatUrl === 'string' ? payload.wechatUrl : '',
    facebookUrl: typeof payload.facebookUrl === 'string' ? payload.facebookUrl : '',
    imoUrl: typeof payload.imoUrl === 'string' ? payload.imoUrl : '',
    messengerUrl: typeof payload.messengerUrl === 'string' ? payload.messengerUrl : '',
    whatsappUrl2: typeof payload.whatsappUrl2 === 'string' ? payload.whatsappUrl2 : '',
    telegramUrl2: typeof payload.telegramUrl2 === 'string' ? payload.telegramUrl2 : '',
    showSocialLinks: Boolean(payload.showSocialLinks),
    showLogo: Boolean(payload.showLogo),
    overlayOpacity: Number(payload.overlayOpacity),
    wallpaperDataUrl: typeof payload.wallpaperDataUrl === 'string' ? payload.wallpaperDataUrl : undefined,
    insideWallpaperDataUrl:
      typeof payload.insideWallpaperDataUrl === 'string' ? payload.insideWallpaperDataUrl : undefined,
    insideOverlayOpacity:
      typeof payload.insideOverlayOpacity === 'number' ? payload.insideOverlayOpacity : 35,
    entryPasswordHash:
      typeof payload.entryPasswordHash === 'string' ? payload.entryPasswordHash : undefined,
    updatedAt: Number(payload.updatedAt),
  };
  cacheSiteEntryConfig(normalized);
  try {
    await setDoc(doc(db, SITE_CONFIG_PATH, SITE_CONFIG_DOC_ID), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
  return normalized;
}

export function subscribeToSiteEntryConfig(
  onConfig: (config: SiteEntryConfig) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, SITE_CONFIG_PATH, SITE_CONFIG_DOC_ID),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const raw = snapshot.data() as Partial<SiteEntryConfig>;
      const next: SiteEntryConfig = {
        ...DEFAULT_SITE_ENTRY_CONFIG,
        ...raw,
        id: SITE_CONFIG_DOC_ID,
      };
      cacheSiteEntryConfig(next);
      onConfig(next);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${SITE_CONFIG_PATH}/${SITE_CONFIG_DOC_ID}`);
    }
  );
}
