import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { decryptBlob, deriveStorageKey, encryptBlob } from './crypto';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

function storageRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage'));
}

function resolveKey(storageKey: string): string {
  const root = storageRoot();
  const resolved = path.resolve(/*turbopackIgnore: true*/ root, storageKey);
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error('Storage key escapes the storage root.');
  }
  return resolved;
}

export function isImageStoreConfigured(): boolean {
  try {
    deriveStorageKey(process.env.IMAGE_ENCRYPTION_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Encrypts and writes an image; returns its opaque storage key. Originals are never overwritten. */
export async function putImage(organizationId: string, mimeType: string, data: Buffer, kind: 'original' | 'model-input'): Promise<string> {
  const key = deriveStorageKey(process.env.IMAGE_ENCRYPTION_KEY);
  const now = new Date();
  const storageKey = [
    'org',
    organizationId,
    kind,
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    `${randomUUID()}.${EXTENSIONS[mimeType] ?? 'bin'}.enc`,
  ].join('/');
  const target = resolveKey(storageKey);
  await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ target, encryptBlob(data, key, storageKey), { flag: 'wx', mode: 0o600 });
  return storageKey;
}

export async function getImage(storageKey: string): Promise<Buffer> {
  const key = deriveStorageKey(process.env.IMAGE_ENCRYPTION_KEY);
  return decryptBlob(await readFile(/*turbopackIgnore: true*/ resolveKey(storageKey)), key, storageKey);
}
