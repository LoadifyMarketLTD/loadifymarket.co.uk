import { Capacitor, registerPlugin } from '@capacitor/core';
import type { MediaResult } from '@capacitor/camera';
import { prepareProductImage } from './mobileListingImages';

export const MAX_LISTING_PHOTOS = 6;
export const MAX_SOURCE_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024;
export const MIN_IMAGE_DIMENSION = 600;
export const NORMALIZED_IMAGE_DIMENSION = 2048;
export const NORMALIZED_JPEG_QUALITY = 0.82;

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const ACCEPTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

interface NativeImageNormalizerPlugin {
  normalize(options: {
    uri: string;
    maxDimension: number;
    minDimension: number;
    quality: number;
  }): Promise<{ base64: string; width: number; height: number; size: number }>;
}

const NativeImageNormalizer = registerPlugin<NativeImageNormalizerPlugin>('ImageNormalizer');
export interface PreparedListingImage {
  id: string;
  file: File;
  width: number;
  height: number;
}

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function validateSource(file: File): void {
  const type = file.type.toLowerCase();
  if (!ACCEPTED_TYPES.has(type) && !ACCEPTED_EXTENSIONS.has(extensionOf(file.name))) {
    throw new Error('Use a JPEG, PNG, WebP, HEIC or HEIF image.');
  }
  if (file.size <= 0) throw new Error('This image is empty or unreadable.');
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('This image is larger than 25 MB.');
  }
}

function parseResolution(value?: string): { width: number; height: number } | null {
  const match = /^(\d+)x(\d+)$/.exec(value ?? '');
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function assertDimensions(width: number, height: number): void {
  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    throw new Error(`Images must be at least ${MIN_IMAGE_DIMENSION} x ${MIN_IMAGE_DIMENSION} pixels.`);
  }
}

function base64ToFile(base64: string, name: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], name, { type: 'image/jpeg', lastModified: Date.now() });
}
async function normalizeInBrowser(file: File): Promise<PreparedListingImage> {
  validateSource(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('This image cannot be decoded on this device. Choose another image.');
  }

  try {
    assertDimensions(bitmap.width, bitmap.height);
    const scale = Math.min(1, NORMALIZED_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Image processing is unavailable on this device.');
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error('Image conversion failed.')),
        'image/jpeg',
        NORMALIZED_JPEG_QUALITY,
      );
    });
    if (blob.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error('The processed image is still larger than 5 MB.');
    }
    const normalized = new File([blob], `listing-${crypto.randomUUID()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
    return { id: crypto.randomUUID(), file: normalized, width, height };
  } finally {
    bitmap.close();
  }
}
export async function prepareWebImage(file: File): Promise<PreparedListingImage> {
  const prepared = await prepareProductImage(file);
  const dimensions = await normalizeInBrowser(prepared);
  return dimensions;
}

export async function prepareNativeImage(result: MediaResult): Promise<PreparedListingImage> {
  if (result.type !== 0) throw new Error('Only photos can be added to a listing.');
  const resolution = parseResolution(result.metadata?.resolution);
  if (resolution) assertDimensions(resolution.width, resolution.height);
  if (result.metadata?.size && result.metadata.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('This image is larger than 25 MB.');
  }
  const uri = result.uri ?? result.webPath;
  if (!uri) throw new Error('The device did not return an image.');

  if (Capacitor.getPlatform() !== 'android') {
    const webPath = result.webPath ?? Capacitor.convertFileSrc(uri);
    const response = await fetch(webPath);
    if (!response.ok) throw new Error('The selected image could not be read.');
    const blob = await response.blob();
    const source = new File([blob], `listing-source-${crypto.randomUUID()}`, {
      type: blob.type || 'image/jpeg',
      lastModified: Date.now(),
    });
    return prepareWebImage(source);
  }

  const normalized = await NativeImageNormalizer.normalize({
    uri,
    maxDimension: NORMALIZED_IMAGE_DIMENSION,
    minDimension: MIN_IMAGE_DIMENSION,
    quality: Math.round(NORMALIZED_JPEG_QUALITY * 100),
  });
  assertDimensions(normalized.width, normalized.height);
  if (normalized.size > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error('The processed image is larger than 5 MB.');
  }
  return {
    id: crypto.randomUUID(),
    file: base64ToFile(normalized.base64, `listing-${crypto.randomUUID()}.jpg`),
    width: normalized.width,
    height: normalized.height,
  };
}

export function isNativeMediaAvailable(): boolean {
  return Capacitor.isNativePlatform();
}


export function isCancellationError(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const message = typeof candidate?.message === 'string' ? candidate.message.toLowerCase() : '';
  return code === 'OS-PLUG-CAMR-0006' || code === 'OS-PLUG-CAMR-0020' || message.includes('cancel');
}

export function isPermissionError(error: unknown): boolean {
  const code = (error as { code?: unknown })?.code;
  return code === 'OS-PLUG-CAMR-0003' || code === 'OS-PLUG-CAMR-0005';
}
