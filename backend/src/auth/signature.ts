import crypto from 'node:crypto';
import type { SignatureRecord } from '../types';

// ---------------------------------------------------------------------------
// Authentication
//
// The admin signature is never stored or sent in the clear. config.json keeps only a scrypt hash
// and its salt; clients exchange the signature for a bearer token that lives in memory. Tokens are
// dropped on restart by design — there is no session store to leak or to grow unbounded.
// ---------------------------------------------------------------------------

export const SCRYPT_KEYLEN = 64;
export const MIN_SIGNATURE_LENGTH = 8;

export const hashSignature = (signature: string, salt: string): string =>
  crypto.scryptSync(String(signature), salt, SCRYPT_KEYLEN).toString('hex');

export const createSignatureRecord = (signature: string): SignatureRecord => {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: hashSignature(signature, salt) };
};

export const verifySignature = (
  signature: string,
  record?: SignatureRecord | null,
): boolean => {
  if (!record || !record.salt || !record.hash) return false;
  const candidate = Buffer.from(hashSignature(signature, record.salt), 'hex');
  const expected = Buffer.from(record.hash, 'hex');
  // `timingSafeEqual` throws on differing lengths, so the guard is required before it — and it also
  // rejects a malformed stored hash cheaply. The comparison itself must be timing safe: a plain
  // `===` leaks how many leading bytes matched through its early exit, which is enough to
  // reconstruct the expected hash one byte at a time from response timings alone.
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
};
