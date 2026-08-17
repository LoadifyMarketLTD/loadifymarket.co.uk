import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Link as LinkIcon, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const STORAGE_BUCKET = 'product-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface UploadedImage {
  url: string;
  path: string;
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

function validateImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Unsupported image type. Use JPG, PNG or WebP.');
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be smaller than 5MB.');
  }
}

async function uploadValidatedImageToStorage(file: File): Promise<UploadedImage> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('You must be signed in as a seller to upload product images.');
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  const ext = MIME_TO_EXT[file.type];
  const filePath = `sellers/${authData.user.id}/${timestamp}-${random}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
}

export default function ImageUpload({
  images,
  onImagesChange,
  maxImages = 10,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleImageAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const remainingSlots = Math.max(0, maxImages - images.length);
      const selectedFiles = Array.from(files).slice(0, remainingSlots);

      // Validate the whole selection before the first network write.
      selectedFiles.forEach(validateImageFile);

      const results = await Promise.allSettled(selectedFiles.map((file) => uploadValidatedImageToStorage(file)));
      const uploaded = results
        .filter((result): result is PromiseFulfilledResult<UploadedImage> => result.status === 'fulfilled')
        .map((result) => result.value);
      const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');

      if (failed) {
        if (uploaded.length > 0) {
          const { error: rollbackError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(uploaded.map((asset) => asset.path));
          if (rollbackError) {
            console.error('Image upload rollback error:', rollbackError);
          }
        }
        throw failed.reason;
      }

      onImagesChange([...images, ...uploaded.map((asset) => asset.url)]);
    } catch (err) {
      console.error('Image upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image(s). Please try again.');
    } finally {
      setUploading(false);
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="block text-sm font-medium text-slate-300">
          Product Images ({images.length}/{maxImages})
        </label>
        {!showUrlInput && (
          <button
            type="button"
            onClick={openUrlInput}
            className="min-h-11 self-start rounded-lg px-3 text-sm font-medium text-primary hover:text-primary-hover flex items-center gap-1 disabled:opacity-50"
            disabled={images.length >= maxImages}
          >
            <LinkIcon className="h-4 w-4" />
            Add URL
          </button>
        )}
      </div>

      {showUrlInput && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            className="min-w-0 flex-1 h-12 rounded-[14px] border border-white/10 bg-surface text-white text-sm px-3 placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-none">
            <button
              type="button"
              onClick={confirmUrlAdd}
              className="min-h-11 px-4 rounded-lg bg-primary text-black text-sm font-semibold hover:bg-primary-hover flex items-center justify-center gap-1"
              aria-label="Confirm add URL"
            >
              <Check className="h-4 w-4" />
              Add
            </button>
            <button
              type="button"
              onClick={cancelUrlInput}
              className="min-h-11 px-4 rounded-lg border border-white/10 text-sm text-slate-300 hover:bg-white/5 flex items-center justify-center"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="bg-primary-soft border border-primary/40 text-primary px-3 py-2 rounded text-sm" role="alert">
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={safeSrc(image)}
              alt={`Product ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border-2 border-white/10 bg-surface"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = ''; }}
            />
            <button
              type="button"
              onClick={() => handleImageRemove(index)}
              className="absolute top-1 right-1 min-h-11 min-w-11 rounded-full bg-red-600 text-white flex items-center justify-center opacity-100 transition-opacity sm:top-2 sm:right-2 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100"
              aria-label={`Remove image ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-2 left-2 bg-background/90 text-white text-xs px-2 py-1 rounded">
                Main
              </span>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <label className="aspect-square min-h-24 border-2 border-dashed border-white/15 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-white/5 focus-within:ring-2 focus-within:ring-primary/40 transition-colors">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageAdd}
              className="sr-only"
              disabled={uploading}
            />
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-300">Upload</span>
              </>
            )}
          </label>
        )}
      </div>

      <div className="flex items-start space-x-2 text-sm text-slate-400">
        <ImageIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Upload up to {maxImages} images. First image will be the main product photo.
          Supported formats: JPG, PNG, WebP. Max 5MB per image.
        </p>
      </div>
    </div>
  );
}
