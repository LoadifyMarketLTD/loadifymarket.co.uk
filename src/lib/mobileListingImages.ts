export const PRODUCT_IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_SOURCE_MAX_BYTES = 25 * 1024 * 1024;
export const PRODUCT_IMAGE_MIN_EDGE = 600;
export const PRODUCT_IMAGE_MAX_SOURCE_EDGE = 12_000;
export const PRODUCT_IMAGE_MAX_SOURCE_PIXELS = 80_000_000;
export const PRODUCT_IMAGE_NORMALIZED_MAX_EDGE = 4_096;

export type SupportedProductImageMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif';

export type ProductImageDimensions = {
  width: number;
  height: number;
};

const HEIC_MIME_TYPES = new Set<SupportedProductImageMime>(['image/heic', 'image/heif']);
const STORAGE_MIME_TYPES = new Set<SupportedProductImageMime>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const MIME_EXTENSION: Record<SupportedProductImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

const normaliseMime = (value: string): SupportedProductImageMime | null => {
  const mime = value.toLowerCase().trim();
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp' || mime === 'image/heic' || mime === 'image/heif') {
    return mime;
  }
  return null;
};

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length));

export async function detectProductImageMime(file: Blob): Promise<SupportedProductImageMime | null> {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') return 'image/png';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'].includes(brand)) return 'image/heic';
    if (['heif', 'mif1', 'msf1'].includes(brand)) return 'image/heif';
  }
  return normaliseMime(file.type || '');
}

export function parseImageResolution(resolution?: string): ProductImageDimensions | null {
  if (!resolution) return null;
  const match = resolution.trim().match(/^(\d+)x(\d+)$/i);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? { width, height } : null;
}

export function validateProductImageDimensions({ width, height }: ProductImageDimensions): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('The selected image has invalid dimensions.');
  }
  if (width < PRODUCT_IMAGE_MIN_EDGE || height < PRODUCT_IMAGE_MIN_EDGE) {
    throw new Error(`Images must be at least ${PRODUCT_IMAGE_MIN_EDGE} x ${PRODUCT_IMAGE_MIN_EDGE} pixels.`);
  }
  if (width > PRODUCT_IMAGE_MAX_SOURCE_EDGE || height > PRODUCT_IMAGE_MAX_SOURCE_EDGE) {
    throw new Error(`Image dimensions must not exceed ${PRODUCT_IMAGE_MAX_SOURCE_EDGE}px on either side.`);
  }
  if (width * height > PRODUCT_IMAGE_MAX_SOURCE_PIXELS) {
    throw new Error('The selected image resolution is too large to process safely.');
  }
}

type DecodedImage = ProductImageDimensions & {
  source: CanvasImageSource;
  cleanup: () => void;
};

async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The selected image could not be decoded.'));
    };
    image.src = url;
  });
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!blob) throw new Error('HEIC conversion did not return an image.');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, {
    type: 'image/jpeg',
    lastModified: file.lastModified || Date.now(),
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Image compression failed.')),
      'image/jpeg',
      quality,
    );
  });
}
async function encodeForUpload(file: File, dimensions: ProductImageDimensions): Promise<File> {
  const decoded = await decodeImage(file);
  try {
    const maxEdge = Math.max(dimensions.width, dimensions.height);
    const scale = Math.min(1, PRODUCT_IMAGE_NORMALIZED_MAX_EDGE / maxEdge);
    let targetWidth = Math.max(1, Math.round(dimensions.width * scale));
    let targetHeight = Math.max(1, Math.round(dimensions.height * scale));
    let quality = 0.9;

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Image processing is not available on this device.');
      context.drawImage(decoded.source, 0, 0, targetWidth, targetHeight);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= PRODUCT_IMAGE_UPLOAD_MAX_BYTES) {
        return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, {
          type: 'image/jpeg',
          lastModified: file.lastModified || Date.now(),
        });
      }
      if (quality > 0.68) quality -= 0.08;
      else {
        targetWidth = Math.max(1, Math.round(targetWidth * 0.85));
        targetHeight = Math.max(1, Math.round(targetHeight * 0.85));
      }
    }
    throw new Error('The image could not be reduced below the 5 MB upload limit.');
  } finally {
    decoded.cleanup();
  }
}
export async function prepareProductImage(file: File): Promise<File> {
  if (file.size <= 0) throw new Error('The selected image is empty.');
  if (file.size > PRODUCT_IMAGE_SOURCE_MAX_BYTES) {
    throw new Error('Images larger than 25 MB cannot be processed.');
  }

  const detectedMime = await detectProductImageMime(file);
  if (!detectedMime) {
    throw new Error('Use a JPEG, PNG, WebP, HEIC or HEIF image.');
  }

  let workingFile = file;
  let workingMime = detectedMime;
  if (HEIC_MIME_TYPES.has(detectedMime)) {
    try {
      workingFile = await convertHeicToJpeg(file);
      workingMime = 'image/jpeg';
    } catch {
      throw new Error('This HEIC/HEIF image could not be converted. Try another photo or export it as JPEG.');
    }
  }

  const decoded = await decodeImage(workingFile);
  const dimensions = { width: decoded.width, height: decoded.height };
  decoded.cleanup();
  validateProductImageDimensions(dimensions);
  const needsNormalisation =
    !STORAGE_MIME_TYPES.has(workingMime)
    || workingFile.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES
    || Math.max(dimensions.width, dimensions.height) > PRODUCT_IMAGE_NORMALIZED_MAX_EDGE;

  const uploadFile = needsNormalisation
    ? await encodeForUpload(workingFile, dimensions)
    : new File([workingFile], `${workingFile.name.replace(/\.[^.]+$/, '') || 'photo'}.${MIME_EXTENSION[workingMime]}`, {
        type: workingMime,
        lastModified: workingFile.lastModified || Date.now(),
      });

  if (uploadFile.size > PRODUCT_IMAGE_UPLOAD_MAX_BYTES) {
    throw new Error('The image exceeds the 5 MB upload limit.');
  }
  return uploadFile;
}

export type NativeProductMediaResult = {
  type?: number;
  webPath?: string;
  uri?: string;
  metadata?: {
    format?: string;
    size?: number;
    resolution?: string;
  };
};
const formatToMime = (format?: string): SupportedProductImageMime | null => {
  if (!format) return null;
  const value = format.toLowerCase().replace(/^image\//, '');
  if (value === 'jpg' || value === 'jpeg') return 'image/jpeg';
  if (value === 'png') return 'image/png';
  if (value === 'webp') return 'image/webp';
  if (value === 'heic') return 'image/heic';
  if (value === 'heif') return 'image/heif';
  return null;
};

export async function nativeMediaResultToFile(
  result: NativeProductMediaResult,
  fallbackName: string,
): Promise<File> {
  const source = result.webPath || result.uri;
  if (!source) throw new Error('Android did not return an image path.');
  if (typeof result.metadata?.size === 'number' && result.metadata.size > PRODUCT_IMAGE_SOURCE_MAX_BYTES) {
    throw new Error('Images larger than 25 MB cannot be processed.');
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error('The selected Android image could not be read.');
  const blob = await response.blob();
  const mime = normaliseMime(blob.type) || formatToMime(result.metadata?.format) || 'image/jpeg';
  const extension = MIME_EXTENSION[mime];
  return new File([blob], `${fallbackName}.${extension}`, { type: mime, lastModified: Date.now() });
}
