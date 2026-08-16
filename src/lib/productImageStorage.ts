import { supabase } from '@/lib/supabase';

export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;

export type SupportedProductImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface ProductImageAsset {
  url: string;
  path: string;
  contentType: SupportedProductImageMime;
}

export type ProductImageErrorCode =
  | 'EMPTY_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_TYPE'
  | 'UPLOAD_FAILED'
  | 'DELETE_FAILED';

export class ProductImageStorageError extends Error {
  readonly code: ProductImageErrorCode;
  readonly cleanupFailedPaths: string[];

  constructor(code: ProductImageErrorCode, message: string, cleanupFailedPaths: string[] = []) {
    super(message);
    this.name = 'ProductImageStorageError';
    this.code = code;
    this.cleanupFailedPaths = cleanupFailedPaths;
  }
}

const MIME_TO_EXTENSION: Record<SupportedProductImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const EXTENSION_TO_MIME: Record<string, SupportedProductImageMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function normalizeMime(value: string): SupportedProductImageMime | null {
  const mime = value.trim().toLowerCase().split(';', 1)[0];
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp') return mime;
  return null;
}

function mimeFromFilename(filename: string): SupportedProductImageMime | null {
  const extension = filename.trim().toLowerCase().split('.').pop();
  if (!extension || extension === filename.trim().toLowerCase()) return null;
  return EXTENSION_TO_MIME[extension] ?? null;
}

export function resolveProductImageMetadata(file: File): {
  contentType: SupportedProductImageMime;
  extension: string;
} {
  if (file.size <= 0) {
    throw new ProductImageStorageError('EMPTY_FILE', 'The selected photo is empty. Please choose another image.');
  }

  if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new ProductImageStorageError(
      'FILE_TOO_LARGE',
      'Photo is too large. Please choose a JPG, PNG or WebP image up to 5MB.',
    );
  }

  const suppliedMime = file.type.trim();
  const contentType = suppliedMime ? normalizeMime(suppliedMime) : mimeFromFilename(file.name);
  if (!contentType) {
    throw new ProductImageStorageError(
      'UNSUPPORTED_TYPE',
      'Unsupported photo format. Please use JPG, PNG or WebP.',
    );
  }

  return {
    contentType,
    extension: MIME_TO_EXTENSION[contentType],
  };
}

function buildProductImagePath(userId: string, extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `sellers/${userId}/${timestamp}-${random}.${extension}`;
}

export async function uploadProductImage(file: File, userId: string): Promise<ProductImageAsset> {
  const metadata = resolveProductImageMetadata(file);
  const path = buildProductImagePath(userId, metadata.extension);
  const bucket = supabase.storage.from(PRODUCT_IMAGE_BUCKET);

  const { error } = await bucket.upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: metadata.contentType,
  });

  if (error) {
    throw new ProductImageStorageError(
      'UPLOAD_FAILED',
      'Photo upload failed. Check your connection and try again.',
    );
  }

  const { data } = bucket.getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    contentType: metadata.contentType,
  };
}

export async function deleteProductImages(paths: string[]): Promise<string[]> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (uniquePaths.length === 0) return [];

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uniquePaths);
  return error ? uniquePaths : [];
}

export async function deleteProductImage(path: string): Promise<void> {
  const failedPaths = await deleteProductImages([path]);
  if (failedPaths.length > 0) {
    throw new ProductImageStorageError(
      'DELETE_FAILED',
      'Could not remove the photo. Please check your connection and try again.',
      failedPaths,
    );
  }
}

export async function uploadProductImageBatch(
  files: File[],
  userId: string,
): Promise<ProductImageAsset[]> {
  if (files.length === 0) return [];

  // Validate the entire selection before the first network request so a known-invalid
  // file cannot leave earlier files from the same selection stranded in Storage.
  files.forEach(resolveProductImageMetadata);

  const settled = await Promise.allSettled(files.map((file) => uploadProductImage(file, userId)));
  const uploaded = settled.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const failed = settled.find((result) => result.status === 'rejected');

  if (!failed) return uploaded;

  const cleanupFailedPaths = await deleteProductImages(uploaded.map((image) => image.path));
  const reason = failed.reason;

  if (reason instanceof ProductImageStorageError) {
    throw new ProductImageStorageError(reason.code, reason.message, cleanupFailedPaths);
  }

  throw new ProductImageStorageError(
    'UPLOAD_FAILED',
    'Photo upload failed. Check your connection and try again.',
    cleanupFailedPaths,
  );
}

export function getProductImageErrorMessage(error: unknown): string {
  if (error instanceof ProductImageStorageError) return error.message;
  return 'Photo upload failed. Please try again.';
}
