import { describe, it, expect } from 'vitest';
import { sealSecret, openSecret } from '../services/secret-box';

// A Plaid access token grants ongoing read access to a real bank account and
// does not expire on its own, so a database dump must not be enough to use one.
describe('secret-box', () => {
  const token = 'access-sandbox-8ab976e6-64bc-4b38-98f7-731e7a349970';

  it('round-trips a secret', () => {
    expect(openSecret(sealSecret(token))).toBe(token);
  });

  it('does not store the plaintext', () => {
    const sealed = sealSecret(token);
    expect(sealed).not.toContain(token);
    expect(sealed).not.toContain('access-sandbox');
  });

  it('produces a different ciphertext each time', () => {
    // A fresh nonce per call: identical tokens must not be correlatable in a
    // dump just because their ciphertext matches.
    expect(sealSecret(token)).not.toBe(sealSecret(token));
  });

  it('rejects a tampered ciphertext rather than returning wrong plaintext', () => {
    const [v, iv, tag, ciphertext] = sealSecret(token).split('.');
    const flipped = Buffer.from(ciphertext, 'base64');
    flipped[0] ^= 0xff;
    expect(() => openSecret([v, iv, tag, flipped.toString('base64')].join('.'))).toThrow();
  });

  it('rejects a tampered auth tag', () => {
    const [v, iv, , ciphertext] = sealSecret(token).split('.');
    const badTag = Buffer.alloc(16, 7).toString('base64');
    expect(() => openSecret([v, iv, badTag, ciphertext].join('.'))).toThrow();
  });

  it('rejects a malformed value', () => {
    expect(() => openSecret('not-sealed')).toThrow(/expected format/);
  });

  it('handles unicode and long secrets', () => {
    const odd = 'tøken-日本-🎉-' + 'x'.repeat(500);
    expect(openSecret(sealSecret(odd))).toBe(odd);
  });
});
