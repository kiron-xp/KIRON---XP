import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {
  AccountEntry,
  EmailEntry,
  NoteColor,
  NoteEntry,
  RecoveryCode,
  SheetEntry,
  VaultData,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';

const ACCOUNTS_PATH = 'accounts';
const EMAILS_PATH = 'emails';
const NOTES_PATH = 'notes';
const SHEETS_PATH = 'sheets';
const RECOVERY_PATH = 'recoveryCodes';
const MIGRATION_FLAG_KEY = 'kiron_firestore_migrated_v1';

const VALID_COLORS: NoteColor[] = ['default', 'emerald', 'amber', 'sky', 'rose', 'violet'];

export function sanitizeDocId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned.length > 0 ? cleaned : `id-${Date.now()}`;
}

function cleanAccountPayload(acc: AccountEntry): Record<string, unknown> {
  const id = sanitizeDocId(acc.id);
  const issuer = String(acc.issuer || 'Account').trim().slice(0, 120) || 'Account';
  const accountName = String(acc.accountName || 'User').trim().slice(0, 200) || 'User';
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
}

export function subscribeToSharedVault(callbacks: SharedVaultCallbacks): Unsubscribe {
  const unsubAccounts = onSnapshot(
    query(collection(db, ACCOUNTS_PATH), where('createdAt', '>', 0), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as AccountEntry);
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

  return () => {
    unsubAccounts();
    unsubEmails();
    unsubNotes();
    unsubSheets();
    unsubRecovery();
  };
}
