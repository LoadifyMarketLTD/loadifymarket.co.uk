import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Upload, X, ImageIcon, Link as LinkIcon, Check, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const STORAGE_BUCKET = 'product-images';

// Supabase bucket boundary. Keep uploaded derivatives safely below the hard 5MB limit.
const STORAGE_MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const TARGET_UPLOAD_SIZE = Math.floor(4.5 * 1024 * 1024);

// Seller source photos may be much larger than the storage derivative. Typical modern
// phone photos are decoded locally, resized and re-encoded before any upload occurs.
const SOURCE_MAX_IMAGE_SIZE = 40 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2400;
const INITIAL_WEBP_QUALITY = 0.86;
const MIN_WEBP_QUALITY = 0.58;
const MAX_OPTIMISATION_ATTEMPTS = 9;

const STORAGE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

/** Returns the URL only if it is a valid http/https URL, otherwise empty string. */
function safeSrc(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : '';
  } catch {
    return '';
  }
}

function looksLikeImage(file: File): boolean {
  if (file.type === 'image/svg+xml') return false;
  if (file.type.startsWith('image/')) return true;
  return /\.(?:jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

function cleanBaseName(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, '');
  const cleaned = withoutExtension
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return cleaned || 'product-photo';
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall through to HTMLImageElement. Safari/WebKit can decode some phone
      // formats here that createImageBitmap implementations may reject.
    }
  }

  return await new Promise<DecodedImage>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';

    image.onload = () => {
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(
        'This photo format could not be read by your browser. Please choose another photo or use JPG, PNG or WebP.',
      ));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.size <= 0) {
        reject(new Error('The browser could not optimise this photo.'));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

/**
 * Converts a seller-selected phone/camera photo into a web-ready derivative.
 *
 * - caps the longest edge at 2400px
 * - re-encodes to WebP (JPEG fallback where WebP encoding is unavailable)
 * - iteratively reduces quality/dimensions until safely below the 5MB bucket limit
 * - strips EXIF/GPS metadata because canvas re-encoding does not copy source metadata
 */
async function optimiseProductImage(file: File): Promise<File> {
  if (!looksLikeImage(file)) {
    throw new Error('Unsupported file. Please choose a product photo.');
  }
  if (file.size <= 0) {
    throw new Error('This photo is empty or unreadable.');
  }
  if (file.size > SOURCE_MAX_IMAGE_SIZE) {
    throw new Error('This source photo is unusually large (over 40MB). Please choose the original camera photo rather than an exported archive.');
  }

  const decoded = await decodeImage(file);
  try {
    if (decoded.width <= 0 || decoded.height <= 0) {
      throw new Error('This photo has invalid dimensions.');
    }

    const longestEdge = Math.max(decoded.width, decoded.height);
    let scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
    let quality = INITIAL_WEBP_QUALITY;
    let lastBlob: Blob | null = null;

    for (let attempt = 0; attempt < MAX_OPTIMISATION_ATTEMPTS; attempt += 1) {
      const width = Math.max(1, Math.round(decoded.width * scale));
      const height = Math.max(1, Math.round(decoded.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', { alpha: true });
      if (!context) {
        throw new Error('Your browser could not prepare this photo for upload.');
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(decoded.source, 0, 0, width, height);

      let blob: Blob;
      try {
        blob = await canvasToBlob(canvas, 'image/webp', quality);
      } catch {
        blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      }
      lastBlob = blob;

      if (blob.size <= TARGET_UPLOAD_SIZE) {
        const mimeType = STORAGE_IMAGE_TYPES.has(blob.type) ? blob.type : 'image/jpeg';
        const extension = MIME_TO_EXT[mimeType] ?? 'jpg';
        return new File(
          [blob],
          `${cleanBaseName(file.name)}.${extension}`,
          { type: mimeType, lastModified: file.lastModified || Date.now() },
        );
      }

      if (quality > MIN_WEBP_QUALITY + 0.01) {
        quality = Math.max(MIN_WEBP_QUALITY, quality - 0.08);
      } else {
        scale *= 0.84;
        quality = 0.8;
      }
    }

    if (lastBlob && lastBlob.size <= STORAGE_MAX_IMAGE_SIZE) {
      const mimeType = STORAGE_IMAGE_TYPES.has(lastBlob.type) ? lastBlob.type : 'image/jpeg';
      const extension = MIME_TO_EXT[mimeType] ?? 'jpg';
      return new File(
        [lastBlob],
        `${cleanBaseName(file.name)}.${extension}`,
        { type: mimeType, lastModified: file.lastModified || Date.now() },
      );
    }

    throw new Error('This photo could not be reduced below the upload limit. Please try another image.');
  } finally {
    decoded.cleanup();
  }
}

async function uploadOptimisedImage(file: File, sellerId: string): Promise<string> {
  if (!STORAGE_IMAGE_TYPES.has(file.type)) {
    throw new Error('The optimised image has an unsupported format.');
  }
  if (file.size <= 0 || file.size > STORAGE_MAX_IMAGE_SIZE) {
    throw new Error('The optimised image is still above the 5MB storage limit.');
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  const ext = MIME_TO_EXT[file.type];
  const filePath = `sellers/${sellerId}/${timestamp}-${random}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleImageAdd = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error('You must be signed in as a seller to upload product images.');
      }

      const remainingSlots = Math.max(0, maxImages - images.length);
      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      const uploadedUrls: string[] = [];
      const failures: string[] = [];

      // Process sequentially so selecting several high-resolution phone photos does
      // not decode every original into memory at the same time on a mobile device.
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const sourceFile = selectedFiles[index];
        try {
          setUploadStatus(`Optimising photo ${index + 1} of ${selectedFiles.length}…`);
          const optimisedFile = await optimiseProductImage(sourceFile);

          setUploadStatus(`Uploading photo ${index + 1} of ${selectedFiles.length}…`);
          const url = await uploadOptimisedImage(optimisedFile, authData.user.id);
          uploadedUrls.push(url);
        } catch (err) {
          console.error('Image upload error:', sourceFile.name, err);
          failures.push(`${sourceFile.name}: ${err instanceof Error ? err.message : 'Upload failed.'}`);
        }
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...images, ...uploadedUrls].slice(0, maxImages));
      }

      if (failures.length > 0) {
        setUploadError(
          failures.length === 1
            ? failures[0]
            : `${failures.length} photos could not be uploaded. ${failures[0]}`,
        );
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image(s). Please try again.');
    } finally {
      setUploading(false);
      setUploadStatus(null);
      e.target.value = '';
    }
  };

  const handleImageRemove = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
  };

  const openUrlInput = () => {
    setUrlValue('');
    setShowUrlInput(true);
    setTimeout(() => urlInputRef.current?.focus(), 0);
  };

  const confirmUrlAdd = () => {
    const trimmed = urlValue.trim();
    if (trimmed) {
      const safe = safeSrc(trimmed);
      if (!safe) {
        setUploadError('Image URL must start with https:// or http://');
        return;
      }
      const updatedImages = [...images, safe].slice(0, maxImages);
      onImagesChange(updatedImages);
    }
    setShowUrlInput(false);
    setUrlValue('');
    setUploadError(null);
  };

  const cancelUrlInput = () => {
    setShowUrlInput(false);
    setUrlValue('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <label className="block text-sm font-medium text-gray-700">
          Product Images ({images.length}/{maxImages})
        </label>
        <div className="flex gap-2">
          {!showUrlInput && (
            <button
              type="button"
              onClick={openUrlInput}
              className="text-sm text-navy-800 hover:text-navy-600 flex items-center gap-1"
              disabled={images.length >= maxImages || uploading}
            >
              <LinkIcon className="h-4 w-4" />
              Add URL
            </button>
          )}
        </div>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2">
          <input
            ref={urlInputRef}
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); confirmUrlAdd(); }
              if (e.key === 'Escape') cancelUrlInput();
            }}
            placeholder="Paste image URL (https://...)"
            aria-label="Image URL input"
            className="flex-1 h-9 rounded-lg border border-gray-300 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-navy-800/40 focus:border-navy-800"
          />
          <button
            type="button"
            onClick={confirmUrlAdd}
            className="h-9 px-3 rounded-lg bg-navy-800 text-white text-sm font-medium hover:bg-navy-700 flex items-center gap-1"
            aria-label="Confirm add URL"
          >
            <Check className="h-4 w-4" />
            Add
          </button>
          <button
            type="button"
            onClick={cancelUrlInput}
            className="h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm" role="alert">
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {images.map((image, index) => (
          <div key={`${image}-${index}`} className="relative group aspect-square min-w-0">
            <img
              src={safeSrc(image)}
              alt={`Product ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = ''; }}
            />
            <button
              type="button"
              onClick={() => handleImageRemove(index)}
              className="absolute top-2 right-2 bg-white/95 border border-red-200 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-2 left-2 bg-navy-800 text-white text-xs px-2 py-1 rounded shadow-sm">
                Main
              </span>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <label className="aspect-square min-h-[128px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-navy-800 hover:bg-gray-50 transition-colors p-3 text-center">
            <input
              type="file"
              multiple
              accept="image/*,.heic,.heif"
              onChange={handleImageAdd}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-navy-800 mb-2" />
                <span className="text-xs text-gray-600" aria-live="polite">{uploadStatus ?? 'Preparing photos…'}</span>
              </>
            ) : (
              <>
                <Upload className="h-7 w-7 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">Add photos</span>
                <span className="text-xs text-gray-500 mt-1">Phone or computer</span>
              </>
            )}
          </label>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 flex items-start gap-2 text-sm text-slate-600">
        <Sparkles className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
        <p>
          <strong className="text-slate-800">Phone photos are optimised automatically.</strong>{' '}
          Choose the original photo and Loadify will resize and compress it to a web-friendly version before upload.
          The longest edge is capped at {MAX_IMAGE_EDGE}px, the stored file stays below 5MB, and embedded photo metadata is removed.
          You do not need to resize photos yourself.
        </p>
      </div>

      <div className="flex items-start space-x-2 text-xs text-gray-500">
        <ImageIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Up to {maxImages} images. The first image is the main product photo. Large source photos up to 40MB are accepted when the browser can decode them; stored images are normalised to JPG/WebP under the 5MB storage limit.
        </p>
      </div>
    </div>
  );
}
