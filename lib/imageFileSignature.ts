export type SupportedImageContentType = 'image/jpeg' | 'image/png';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export function detectImageContentType(bytes: Uint8Array): SupportedImageContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((value, index) => bytes[index] === value)
  ) {
    return 'image/png';
  }

  return null;
}

export function declaredTypeMatchesContent(
  declaredType: string,
  detectedType: SupportedImageContentType,
): boolean {
  const normalizedDeclaredType = declaredType === 'image/jpg' ? 'image/jpeg' : declaredType;
  return normalizedDeclaredType === detectedType;
}
