import crypto from 'crypto';
import { isProduction } from '../config';

/**
 * Authenticated encryption for third-party credentials held at rest.
 *
 * A Plaid access token grants ongoing read access to someone's real bank
 * account and does not expire on its own, so a database dump or a stray
 * backup must not be enough to use one.
 *
 * AES-256-GCM: the tag means tampering is detected rather than silently
 * decrypting to something else.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // GCM's standard nonce length
const KEY_BYTES = 32;

/** Derive the key once, failing loudly rather than encrypting with a guess. */
function loadKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY?.trim();

  if (!raw) {
    if (isProduction) {
      throw new Error(
        'ENCRYPTION_KEY is required in production: bank access tokens are ' +
          'stored encrypted and cannot be written without it.',
      );
    }
    // Development only, and derived rather than random so a restart can still
    // read what the previous run wrote.
    return crypto.createHash('sha256').update('finbrain-insecure-dev-key').digest();
  }

  // Accept either 32 raw bytes of base64/hex, or any passphrase.
  for (const encoding of ['base64', 'hex'] as const) {
    try {
      const decoded = Buffer.from(raw, encoding);
      if (decoded.length === KEY_BYTES) return decoded;
    } catch {
      // Not this encoding; fall through to the passphrase path.
    }
  }

  return crypto.createHash('sha256').update(raw).digest();
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

/** Encrypt a secret into a self-describing `v1.iv.tag.ciphertext` string. */
export function sealSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return ['v1', iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

/** Reverse of sealSecret. Throws if the value was tampered with. */
export function openSecret(sealed: string): string {
  const [version, iv, tag, ciphertext] = sealed.split('.');

  if (version !== 'v1' || !iv || !tag || !ciphertext) {
    throw new Error('Stored secret is not in the expected format');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
