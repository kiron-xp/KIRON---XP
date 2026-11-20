const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function normalizeBase32(input: string): string {
  return input.toUpperCase().replace(/[\s\-=]+/g, '');
}

export function isValidBase32(input: string): boolean {
  const clean = normalizeBase32(input);
  if (clean.length < 8) return false;
  return /^[A-Z2-7]+$/.test(clean);
}

export function formatBase32Display(secret: string): string {
  const clean = normalizeBase32(secret);
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

export function decodeBase32(input: string): Uint8Array {
  const clean = normalizeBase32(input);
  if (!clean || !/^[A-Z2-7]+$/.test(clean)) {
    throw new Error('Invalid Base32 secret key');
  }

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) {
      throw new Error('Invalid Base32 character');
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Generates a cryptographically secure random Base32 secret key.
 * Default: 20 bytes (160-bit) -> 32 Base32 characters.
 */
export function generateRandomBase32(byteLength: 10 | 20 = 20): string {
  const randomBytes = new Uint8Array(byteLength);
  crypto.getRandomValues(randomBytes);
  return encodeBase32(randomBytes);
}
