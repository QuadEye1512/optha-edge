import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, passwordPolicyError, verifyPassword } from '../lib/auth/password.ts';
import { consumeRateLimit } from '../lib/auth/rateLimit.ts';
import { decryptBlob, deriveStorageKey, encryptBlob, StorageKeyError } from '../lib/storage/crypto.ts';

test('hashes and verifies passwords with scrypt', async () => {
  const stored = await hashPassword('Correct horse 42');
  assert.match(stored, /^scrypt\$16384\$8\$1\$/);
  assert.equal(await verifyPassword('Correct horse 42', stored), true);
  assert.equal(await verifyPassword('correct horse 42', stored), false);
  assert.equal(await verifyPassword('anything', null), false);
  assert.equal(await verifyPassword('anything', 'plaintext'), false);
});

test('enforces the password policy', () => {
  assert.ok(passwordPolicyError('short1'));
  assert.ok(passwordPolicyError('onlyletterslong'));
  assert.equal(passwordPolicyError('Letters1234'), null);
});

test('encrypts images with AES-GCM bound to the storage key', () => {
  const key = deriveStorageKey('x'.repeat(40));
  const plain = Buffer.from('retinal image bytes');
  const blob = encryptBlob(plain, key, 'org/a/original/1.jpg.enc');
  assert.notEqual(blob.toString('hex').includes(plain.toString('hex')), true);
  assert.deepEqual(decryptBlob(blob, key, 'org/a/original/1.jpg.enc'), plain);
  // Moving a blob to another key path, or tampering, fails authentication.
  assert.throws(() => decryptBlob(blob, key, 'org/b/original/1.jpg.enc'));
  const tampered = Buffer.from(blob);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => decryptBlob(tampered, key, 'org/a/original/1.jpg.enc'));
  assert.throws(() => decryptBlob(blob, deriveStorageKey('y'.repeat(40)), 'org/a/original/1.jpg.enc'));
});

test('refuses a missing or short storage secret', () => {
  assert.throws(() => deriveStorageKey(undefined), StorageKeyError);
  assert.throws(() => deriveStorageKey('too-short'), StorageKeyError);
});

test('rate limiter blocks after the limit within a window', () => {
  const key = `test-${Math.random()}`;
  for (let i = 0; i < 3; i += 1) assert.equal(consumeRateLimit(key, 3, 1000, 0).allowed, true);
  assert.equal(consumeRateLimit(key, 3, 1000, 10).allowed, false);
  assert.equal(consumeRateLimit(key, 3, 1000, 2000).allowed, true);
});
