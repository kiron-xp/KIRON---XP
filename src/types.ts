export type OtpType = 'totp' | 'hotp';
export type OtpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';
export type OtpDigits = 6 | 8;
export type TotpPeriod = 15 | 30 | 60 | 90;

export interface AccountEntry {
  id: string;
  issuer: string;
  accountName: string; // email or phone or username
  category?: string; // e.g. WHATSAPP, FACEBOOK, INSTAGRAM, TELEGRAM, IMO, PERSONAL
  caption?: string; // optional note/caption displayed at bottom of left column
  secret: string; // Base32 normalized
  type: OtpType;
  algorithm: OtpAlgorithm;
  digits: OtpDigits;
  period: TotpPeriod; // for TOTP
  counter: number; // for HOTP
  avatarDataUrl?: string; // custom image uploaded from gallery
  createdAt: number;
}

export interface RecoveryCode {
  id: string;
  code: string;
  used: boolean;
  usedAt?: number;
}

export type NoteColor = 'default' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet';

export interface NoteEntry {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EmailEntry {
  id: string;
  email: string;
  label?: string;
  password?: string;
  note?: string;
  avatarDataUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SheetEntry {
  id: string;
  title: string;
  rows: string[][];
  createdAt: number;
  updatedAt: number;
}

export interface VaultData {
  accounts: AccountEntry[];
  recoveryCodes: RecoveryCode[];
  notes?: NoteEntry[];
  emails?: EmailEntry[];
  sheets?: SheetEntry[];
  updatedAt: number;
}

export interface EncryptedEnvelope {
  version: 1;
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  cipher: 'AES-256-GCM';
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
}

export interface StoredVaultRecord {
  encrypted: boolean;
  data?: VaultData;
  envelope?: EncryptedEnvelope;
}

export interface StoredProfileRecord {
  key: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  envelope: EncryptedEnvelope;
}

export interface ProfileSummary {
  key: string;
  name: string;
  updatedAt: number;
}

export type Language = 'bn' | 'en';
export type ThemeMode = 'light' | 'dark';
export type ActiveTab = 'vault' | 'add' | 'email' | 'verify' | 'security';
