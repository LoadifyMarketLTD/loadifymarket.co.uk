import { useRef, useState } from 'react';
import { Upload, X, ImageIcon, Link as LinkIcon, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const STORAGE_BUCKET = 'product-images';

async function uploadImageToStorage(file: File, sellerId?: string): Promise<string> {
  // Generate a unique file path
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const folder = sellerId ? `sellers/${sellerId}` : 'uploads';
  const filePath = `${folder}/${timestamp}-${random}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export default function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 10 
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
      const uploadPromises = Array.from(files).map(file => uploadImageToStorage(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      const updatedImages = [...images, ...uploadedUrls].slice(0, maxImages);
      onImagesChange(updatedImages);
    } catch (err) {
      console.error('Image upload error:', err);
      setUploadError(
        'Failed to upload image(s). The storage bucket may not be configured yet. You can use "Add URL" instead.'
      );
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
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
    // Focus the input on the next tick after it mounts
    setTimeout(() => urlInputRef.current?.focus(), 0);
  };

  const confirmUrlAdd = () => {
    const trimmed = urlValue.trim();
    if (trimmed) {
      // Only allow http/https URLs to prevent javascript: or data: XSS vectors
      if (!/^https?:\/\//i.test(trimmed)) {
        setUploadError('Image URL must start with https:// or http://');
        return;
      }
      const updatedImages = [...images, trimmed].slice(0, maxImages);
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

      {/* Inline URL input */}
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

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded text-sm">
          {uploadError}
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Existing Images */}
        {images.map((image, index) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={image}
              alt={`Product ${index + 1}`}
              className="w-full h-full object-cover rounded-lg border-2 border-gray-200"
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

        {/* Upload Button */}
        {images.length < maxImages && (
          <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-navy-800 hover:bg-gray-50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
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

      {/* Helper Text */}
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
