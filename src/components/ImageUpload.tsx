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

async function uploadImageToStorage(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Unsupported image type. Use JPG, PNG or WebP.');
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image must be smaller than 5MB.');
  }

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
  return data.publicUrl;
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
      const uploadedUrls = await Promise.all(selectedFiles.map((file) => uploadImageToStorage(file)));
      onImagesChange([...images, ...uploadedUrls]);
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
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Product Images ({images.length}/{maxImages})
        </label>
        <div className="flex gap-2">
          {!showUrlInput && (
            <button
              type="button"
              onClick={openUrlInput}
              className="text-sm text-navy-800 hover:text-navy-600 flex items-center gap-1"
              disabled={images.length >= maxImages}
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
        <div className="bg-primary-soft border border-primary/40 text-primary px-3 py-2 rounded text-sm">
          {uploadError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={safeSrc(image)}
              alt={`Product ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = ''; }}
            />
            <button
              type="button"
              onClick={() => handleImageRemove(index)}
              className="absolute top-2 right-2 bg-red-600 text-gray-900 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-2 left-2 bg-navy-800 text-white text-xs px-2 py-1 rounded">
                Main
              </span>
            )}
          </div>
        ))}

        {images.length < maxImages && (
          <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-navy-800 hover:bg-gray-50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageAdd}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-800"></div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Upload</span>
              </>
            )}
          </label>
        )}
      </div>

      <div className="flex items-start space-x-2 text-sm text-gray-600">
        <ImageIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Upload up to {maxImages} images. First image will be the main product photo.
          Supported formats: JPG, PNG, WebP. Max 5MB per image.
        </p>
      </div>
    </div>
  );
}
