import { Language, ProfileSummary, StoredProfileRecord, StoredVaultRecord, ThemeMode, VaultData } from '../types';
import { decryptPayload, encryptPayload, generateRecoveryCodes } from './crypto/vaultCrypto';

const VAULT_STORAGE_KEY = 'prohori_vault_v1';
const PROFILES_STORAGE_KEY = 'prohori_profiles_v1';
const LANG_STORAGE_KEY = 'prohori_lang_v1';
const THEME_STORAGE_KEY = 'prohori_theme_v1';

export function createInitialVault(): VaultData {
  return {
    accounts: [],
    recoveryCodes: generateRecoveryCodes(8),
    notes: [],
    emails: [],
    sheets: [],
    updatedAt: Date.now(),
  };
}

export function loadStoredVaultRecord(): StoredVaultRecord {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialVault();
      const record: StoredVaultRecord = { encrypted: false, data: initial };
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
      return record;
    }
    const parsed = JSON.parse(raw) as StoredVaultRecord;
    if (parsed.encrypted && parsed.envelope) {
      return parsed;
    }
    if (!parsed.encrypted && parsed.data) {
      if (!parsed.data.recoveryCodes || parsed.data.recoveryCodes.length === 0) {
        parsed.data.recoveryCodes = generateRecoveryCodes(8);
      }
      return parsed;
    }
  } catch {
    // Fallback to clean vault if corrupted
  }
  const fallback = createInitialVault();
  return { encrypted: false, data: fallback };
}

export async function saveVaultData(vault: VaultData, passphrase: string | null): Promise<void> {
  const updated: VaultData = {
    ...vault,
    updatedAt: Date.now(),
  };

  if (passphrase && passphrase.length > 0) {
    const envelope = await encryptPayload(updated, passphrase);
    const record: StoredVaultRecord = { encrypted: true, envelope };
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
  } else {
    const record: StoredVaultRecord = { encrypted: false, data: updated };
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
  }
}

export async function unlockVaultWithPassphrase(passphrase: string): Promise<VaultData> {
  const record = loadStoredVaultRecord();
  if (!record.encrypted || !record.envelope) {
    return record.data ?? createInitialVault();
  }
  return decryptPayload<VaultData>(record.envelope, passphrase);
}

export function resetEntireVault(): VaultData {
  const fresh = createInitialVault();
  const record: StoredVaultRecord = { encrypted: false, data: fresh };
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
  return fresh;
}

function normalizeProfileKey(name: string): string {
  return name.trim().toLowerCase();
}

function readAllStoredProfiles(): StoredProfileRecord[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredProfileRecord[]) : [];
  } catch {
    return [];
  }
}

function writeAllStoredProfiles(profiles: StoredProfileRecord[]): void {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function loadProfileSummaries(): ProfileSummary[] {
  return readAllStoredProfiles()
    .map((p) => ({ key: p.key, name: p.name, updatedAt: p.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createPasswordProfile(
  name: string,
  password: string,
  initialVault?: VaultData
): Promise<{ name: string; data: VaultData }> {
  const trimmedName = name.trim();
  const key = normalizeProfileKey(trimmedName);
  if (!key) {
    throw new Error('NAME_REQUIRED');
  }
  const profiles = readAllStoredProfiles();
  if (profiles.some((p) => p.key === key)) {
    throw new Error('PROFILE_EXISTS');
  }

  const data: VaultData = initialVault
    ? {
        accounts: [...initialVault.accounts],
        recoveryCodes:
          initialVault.recoveryCodes?.length > 0
            ? [...initialVault.recoveryCodes]
            : generateRecoveryCodes(8),
        notes: initialVault.notes ? [...initialVault.notes] : [],
        emails: initialVault.emails ? [...initialVault.emails] : [],
        sheets: initialVault.sheets ? [...initialVault.sheets] : [],
        updatedAt: Date.now(),
      }
    : createInitialVault();

  const envelope = await encryptPayload(data, password);
  const now = Date.now();
  const record: StoredProfileRecord = {
    key,
    name: trimmedName,
    createdAt: now,
    updatedAt: now,
    envelope,
  };
  writeAllStoredProfiles([record, ...profiles]);
  return { name: trimmedName, data };
}

export async function openPasswordProfile(
  name: string,
  password: string
): Promise<{ name: string; data: VaultData }> {
  const key = normalizeProfileKey(name);
  const profiles = readAllStoredProfiles();
  const found = profiles.find((p) => p.key === key);
  if (!found) {
    throw new Error('INVALID_CREDENTIALS');
  }

  try {
    const data = await decryptPayload<VaultData>(found.envelope, password);
    if (!Array.isArray(data.accounts)) {
      throw new Error('INVALID_CREDENTIALS');
    }
    return { name: found.name, data };
  } catch {
    throw new Error('INVALID_CREDENTIALS');
  }
}

export async function savePasswordProfileVault(
  name: string,
  password: string,
  vault: VaultData
): Promise<void> {
  const key = normalizeProfileKey(name);
  const profiles = readAllStoredProfiles();
  const idx = profiles.findIndex((p) => p.key === key);
  const updated: VaultData = {
    ...vault,
    updatedAt: Date.now(),
  };
  const envelope = await encryptPayload(updated, password);
  const now = Date.now();

  if (idx >= 0) {
    profiles[idx] = {
      ...profiles[idx],
      updatedAt: now,
      envelope,
    };
    writeAllStoredProfiles(profiles);
  } else {
    writeAllStoredProfiles([
      {
        key,
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        envelope,
      },
      ...profiles,
    ]);
  }
}

export const MAIN_PROFILE_NAME = 'KIRON';
const MAIN_PROFILE_PASSWORD = 'E5H2b!f@UKg%wz6';
const CUSTOM_PROFILE_PASS_FLAG = 'prohori_custom_pass_set';
const SESSION_PROFILE_PASS_KEY = 'kiron_active_profile_pass';
const SITE_PASS_HASH_KEY = 'kiron_site_pass_hash_v1';

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifySiteEntryPassword(input: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const savedHash = localStorage.getItem(SITE_PASS_HASH_KEY);
  if (!savedHash) {
    return trimmed === 'KIRON';
  }
  const inputHash = await sha256Hex(trimmed);
  return inputHash === savedHash;
}

export async function changeSiteEntryPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: 'WRONG_CURRENT' | 'TOO_SHORT' }> {
  const valid = await verifySiteEntryPassword(currentPassword);
  if (!valid) {
    return { ok: false, error: 'WRONG_CURRENT' };
  }
  const cleanNew = newPassword.trim();
  if (cleanNew.length < 3) {
    return { ok: false, error: 'TOO_SHORT' };
  }
  const nextHash = await sha256Hex(cleanNew);
  localStorage.setItem(SITE_PASS_HASH_KEY, nextHash);
  return { ok: true };
}

export async function openProfileByPassword(
  password: string
): Promise<{ name: string; password: string; data: VaultData }> {
  if (!password) {
    throw new Error('INVALID_CREDENTIALS');
  }
  const profiles = readAllStoredProfiles();
  for (const profile of profiles) {
    try {
      const data = await decryptPayload<VaultData>(profile.envelope, password);
      if (Array.isArray(data.accounts)) {
        return { name: profile.name, password, data };
      }
    } catch {
      // Continue trying remaining profiles
    }
  }
  throw new Error('INVALID_CREDENTIALS');
}

export async function changeProfilePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ name: string; password: string; data: VaultData }> {
  const cleanNew = newPassword.trim();
  if (cleanNew.length < 4) {
    throw new Error('PASSWORD_TOO_SHORT');
  }
  const matched = await openProfileByPassword(currentPassword);
  await savePasswordProfileVault(matched.name, cleanNew, matched.data);
  localStorage.setItem(CUSTOM_PROFILE_PASS_FLAG, '1');
  sessionStorage.setItem(SESSION_PROFILE_PASS_KEY, cleanNew);
  return { name: matched.name, password: cleanNew, data: matched.data };
}

export function clearSessionProfilePassword(): void {
  sessionStorage.removeItem(SESSION_PROFILE_PASS_KEY);
}

export function setSessionProfilePassword(password: string): void {
  sessionStorage.setItem(SESSION_PROFILE_PASS_KEY, password);
}

export async function ensureMainProfileSeeded(): Promise<{
  name: string;
  password: string;
  data: VaultData;
} | null> {
  const profiles = readAllStoredProfiles();
  const mainKey = normalizeProfileKey(MAIN_PROFILE_NAME);
  const existing = profiles.find((p) => p.key === mainKey);

  if (existing) {
    const sessionPass = sessionStorage.getItem(SESSION_PROFILE_PASS_KEY);
    if (sessionPass) {
      try {
        const data = await decryptPayload<VaultData>(existing.envelope, sessionPass);
        return { name: existing.name, password: sessionPass, data };
      } catch {
        sessionStorage.removeItem(SESSION_PROFILE_PASS_KEY);
      }
    }

    if (localStorage.getItem(CUSTOM_PROFILE_PASS_FLAG) !== '1') {
      try {
        const data = await decryptPayload<VaultData>(existing.envelope, MAIN_PROFILE_PASSWORD);
        return { name: existing.name, password: MAIN_PROFILE_PASSWORD, data };
      } catch {
        return null;
      }
    }
    return null;
  }

  // Migrate any existing unencrypted default vault accounts into the KIRON main account
  const stored = loadStoredVaultRecord();
  const initialData: VaultData =
    !stored.encrypted && stored.data ? stored.data : createInitialVault();

  const created = await createPasswordProfile(
    MAIN_PROFILE_NAME,
    MAIN_PROFILE_PASSWORD,
    initialData
  );
  return { name: created.name, password: MAIN_PROFILE_PASSWORD, data: created.data };
}

export function loadLanguagePreference(): Language {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  return saved === 'en' ? 'en' : 'bn';
}

export function saveLanguagePreference(lang: Language): void {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
}

export function loadThemePreference(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function saveThemePreference(theme: ThemeMode): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function resizeImageToDataUrl(file: File, maxSize = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
