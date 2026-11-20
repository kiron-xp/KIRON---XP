import { EncryptedEnvelope, RecoveryCode } from '../../types';

const PBKDF2_ITERATIONS = 250_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptPayload<T>(payload: T, passphrase: string): Promise<EncryptedEnvelope> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase must be at least 4 characters');
  }

  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);

  const key = await deriveAesGcmKey(passphrase, salt, PBKDF2_ITERATIONS);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encoded
  );

  return {
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encryptedBuffer)),
  };
}

export async function decryptPayload<T>(envelope: EncryptedEnvelope, passphrase: string): Promise<T> {
  if (!envelope || envelope.cipher !== 'AES-256-GCM' || !envelope.salt || !envelope.iv || !envelope.ciphertext) {
    throw new Error('Invalid encrypted backup format');
  }

  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);
  const iterations = envelope.iterations || PBKDF2_ITERATIONS;

  const key = await deriveAesGcmKey(passphrase, salt, iterations);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  const decoded = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decoded) as T;
}

const RECOVERY_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRecoveryCodes(count: number = 8): RecoveryCode[] {
  const codes: RecoveryCode[] = [];
  for (let i = 0; i < count; i++) {
    const random = new Uint8Array(12);
    crypto.getRandomValues(random);
    let raw = '';
    for (let j = 0; j < 12; j++) {
      raw += RECOVERY_CHARSET[random[j] % RECOVERY_CHARSET.length];
    }
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    codes.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}-${i}`,
      code: formatted,
      used: false,
    });
  }
  return codes;
}

export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
