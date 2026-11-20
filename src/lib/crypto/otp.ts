import { AccountEntry, OtpAlgorithm, OtpDigits, OtpType, TotpPeriod } from '../../types';
import { decodeBase32, isValidBase32, normalizeBase32 } from './base32';

function counterToBytes(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(Math.max(0, Math.floor(counter))), false);
  return new Uint8Array(buffer);
}

/**
 * RFC 4226 HOTP generation using browser Web Crypto API (HMAC-SHA1 / SHA-256 / SHA-512)
 */
export async function generateHOTP(
  secretBase32: string,
  counter: number,
  algorithm: OtpAlgorithm = 'SHA-1',
  digits: OtpDigits = 6
): Promise<string> {
  const keyBytes = decodeBase32(secretBase32);
  const msgBytes = counterToBytes(counter);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes.buffer as ArrayBuffer);
  const hmac = new Uint8Array(signature);

  // Dynamic truncation per RFC 4226 Section 5.3
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const modulo = 10 ** digits;
  const otp = (binary % modulo).toString().padStart(digits, '0');
  return otp;
}

/**
 * RFC 6238 TOTP generation using Web Crypto API
 */
export async function generateTOTP(
  secretBase32: string,
  algorithm: OtpAlgorithm = 'SHA-1',
  digits: OtpDigits = 6,
  period: TotpPeriod = 30,
  timestampMs: number = Date.now(),
  stepOffset: number = 0
): Promise<{ code: string; remainingSeconds: number; progress: number; counter: number }> {
  const epochSeconds = Math.floor(timestampMs / 1000);
  const counter = Math.floor(epochSeconds / period) + stepOffset;
  const elapsedInPeriod = (timestampMs / 1000) % period;
  const remainingSeconds = Math.max(0, Math.ceil(period - elapsedInPeriod));
  const progress = Math.max(0, Math.min(1, (period - elapsedInPeriod) / period));

  const code = await generateHOTP(secretBase32, counter, algorithm, digits);
  return { code, remainingSeconds, progress, counter };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies a TOTP code with configurable +/- time-step tolerance (default +/- 1 step)
 */
export async function verifyTOTP(
  secretBase32: string,
  submittedCode: string,
  options: {
    algorithm: OtpAlgorithm;
    digits: OtpDigits;
    period: TotpPeriod;
    window?: number;
    timestampMs?: number;
  }
): Promise<{ valid: boolean; delta: number | null }> {
  const cleanCode = submittedCode.replace(/\s+/g, '');
  if (cleanCode.length !== options.digits || !/^\d+$/.test(cleanCode)) {
    return { valid: false, delta: null };
  }

  const window = options.window ?? 1;
  const timestampMs = options.timestampMs ?? Date.now();

  for (let delta = 0; delta <= window; delta++) {
    const offsets = delta === 0 ? [0] : [-delta, delta];
    for (const offset of offsets) {
      const { code } = await generateTOTP(
        secretBase32,
        options.algorithm,
        options.digits,
        options.period,
        timestampMs,
        offset
      );
      if (timingSafeStringEqual(code, cleanCode)) {
        return { valid: true, delta: offset };
      }
    }
  }

  return { valid: false, delta: null };
}

/**
 * Verifies an HOTP code with lookahead window
 */
export async function verifyHOTP(
  secretBase32: string,
  submittedCode: string,
  currentCounter: number,
  options: {
    algorithm: OtpAlgorithm;
    digits: OtpDigits;
    lookahead?: number;
  }
): Promise<{ valid: boolean; matchedCounter: number | null }> {
  const cleanCode = submittedCode.replace(/\s+/g, '');
  if (cleanCode.length !== options.digits || !/^\d+$/.test(cleanCode)) {
    return { valid: false, matchedCounter: null };
  }

  const lookahead = options.lookahead ?? 5;
  for (let step = 0; step <= lookahead; step++) {
    const candidateCounter = currentCounter + step;
    const expected = await generateHOTP(
      secretBase32,
      candidateCounter,
      options.algorithm,
      options.digits
    );
    if (timingSafeStringEqual(expected, cleanCode)) {
      return { valid: true, matchedCounter: candidateCounter };
    }
  }

  return { valid: false, matchedCounter: null };
}

export function buildOtpAuthUri(account: Pick<AccountEntry, 'issuer' | 'accountName' | 'secret' | 'type' | 'algorithm' | 'digits' | 'period' | 'counter'>): string {
  const issuer = account.issuer.trim() || 'Prohori';
  const labelAccount = account.accountName.trim() || 'user';
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(labelAccount)}`;
  const algoParam = account.algorithm.replace('-', ''); // SHA1, SHA256, SHA512

  const params = new URLSearchParams({
    secret: normalizeBase32(account.secret),
    issuer,
    algorithm: algoParam,
    digits: String(account.digits),
  });

  if (account.type === 'totp') {
    params.set('period', String(account.period));
  } else {
    params.set('counter', String(account.counter));
  }

  return `otpauth://${account.type}/${label}?${params.toString()}`;
}

export interface ParsedOtpAuth {
  type: OtpType;
  issuer: string;
  accountName: string;
  secret: string;
  algorithm: OtpAlgorithm;
  digits: OtpDigits;
  period: TotpPeriod;
  counter: number;
}

export function parseOtpAuthUri(uriString: string): ParsedOtpAuth {
  const trimmed = uriString.trim();
  if (!trimmed.toLowerCase().startsWith('otpauth://')) {
    throw new Error('URI must start with otpauth://');
  }

  const url = new URL(trimmed);
  const rawType = url.host.toLowerCase();
  if (rawType !== 'totp' && rawType !== 'hotp') {
    throw new Error('Unsupported OTP type (expected totp or hotp)');
  }

  const rawPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  let pathIssuer = '';
  let accountName = rawPath;

  if (rawPath.includes(':')) {
    const idx = rawPath.indexOf(':');
    pathIssuer = rawPath.slice(0, idx).trim();
    accountName = rawPath.slice(idx + 1).trim();
  }

  const secretParam = url.searchParams.get('secret') || '';
  const normalizedSecret = normalizeBase32(secretParam);
  if (!isValidBase32(normalizedSecret)) {
    throw new Error('Invalid or missing Base32 secret');
  }

  const issuerParam = (url.searchParams.get('issuer') || '').trim();
  const issuer = issuerParam || pathIssuer || 'Imported Service';

  const rawAlgo = (url.searchParams.get('algorithm') || 'SHA1').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let algorithm: OtpAlgorithm = 'SHA-1';
  if (rawAlgo === 'SHA256') algorithm = 'SHA-256';
  else if (rawAlgo === 'SHA512') algorithm = 'SHA-512';

  const rawDigits = Number(url.searchParams.get('digits') || '6');
  const digits: OtpDigits = rawDigits === 8 ? 8 : 6;

  const rawPeriod = Number(url.searchParams.get('period') || '30');
  let period: TotpPeriod = 30;
  if (rawPeriod === 15 || rawPeriod === 30 || rawPeriod === 60 || rawPeriod === 90) {
    period = rawPeriod;
  }

  const rawCounter = Number(url.searchParams.get('counter') || '0');
  const counter = Number.isFinite(rawCounter) && rawCounter >= 0 ? Math.floor(rawCounter) : 0;

  return {
    type: rawType,
    issuer,
    accountName: accountName || 'Account',
    secret: normalizedSecret,
    algorithm,
    digits,
    period,
    counter,
  };
}
