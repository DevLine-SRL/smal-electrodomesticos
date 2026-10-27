const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  'image/jpeg': (bytes) =>
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) =>
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a,
  'image/webp': (bytes) =>
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
  'image/gif': (bytes) => {
    const header = String.fromCharCode(...bytes.slice(0, 6));
    return header === 'GIF87a' || header === 'GIF89a';
  },
};

export const isSupportedImage = async (file: File): Promise<boolean> => {
  const validate = signatures[file.type];
  if (!validate) return false;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return validate(bytes);
};
