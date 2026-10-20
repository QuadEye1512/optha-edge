import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const MAGIC = Buffer.from('OEI1');
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class StorageKeyError extends Error {
  constructor() {
    super('IMAGE_ENCRYPTION_KEY must contain at least 32 characters.');
    this.name = 'StorageKeyError';
  }
}

/** Derives the 256-bit AES key from the configured secret. */
export function deriveStorageKey(secret: string | undefined): Buffer {
  const trimmed = secret?.trim();
  if (!trimmed || trimmed.length < 32) {
    throw new StorageKeyError();
  }
  return createHash('sha256').update(`opthaedge-image-store:${trimmed}`).digest();
}

/** AES-256-GCM. Layout: "OEI1" | iv (12) | tag (16) | ciphertext. The storage key is bound as AAD. */
export function encryptBlob(plain: Buffer, key: Buffer, associatedData: string): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(associatedData));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptBlob(blob: Buffer, key: Buffer, associatedData: string): Buffer {
  if (blob.length < MAGIC.length + IV_LENGTH + TAG_LENGTH || !blob.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Unrecognized encrypted blob.');
  }
  const iv = blob.subarray(MAGIC.length, MAGIC.length + IV_LENGTH);
  const tag = blob.subarray(MAGIC.length + IV_LENGTH, MAGIC.length + IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(associatedData));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(MAGIC.length + IV_LENGTH + TAG_LENGTH)), decipher.final()]);
}

export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}
