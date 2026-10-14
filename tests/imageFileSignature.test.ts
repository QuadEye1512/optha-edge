import assert from 'node:assert/strict';
import test from 'node:test';
import {
  declaredTypeMatchesContent,
  detectImageContentType,
} from '../lib/imageFileSignature.ts';

test('detects JPEG content from its magic bytes', () => {
  assert.equal(detectImageContentType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
});

test('detects PNG content from its complete signature', () => {
  assert.equal(
    detectImageContentType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/png',
  );
});

test('rejects extension-like text and truncated signatures', () => {
  assert.equal(detectImageContentType(new TextEncoder().encode('not-an-image.jpg')), null);
  assert.equal(detectImageContentType(Uint8Array.from([0x89, 0x50, 0x4e])), null);
});

test('requires declared MIME type to match detected content', () => {
  assert.equal(declaredTypeMatchesContent('image/jpg', 'image/jpeg'), true);
  assert.equal(declaredTypeMatchesContent('image/png', 'image/jpeg'), false);
});
