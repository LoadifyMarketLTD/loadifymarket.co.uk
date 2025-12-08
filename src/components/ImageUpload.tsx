import { useState } from 'react';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ 
  images, 
  onImagesChange, 
  maxImages = 10 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    // Convert files to base64 or URLs
    // In a real implementation, you would upload to Supabase Storage or a CDN
    const newImages: string[] = [];
    
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newImages.push(reader.result as string);
        
        // When all files are processed
        if (index === files.length - 1) {
          const updatedImages = [...images, ...newImages].slice(0, maxImages);
          onImagesChange(updatedImages);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageRemove = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onImagesChange(updatedImages);
  };

  const handleUrlAdd = () => {
    const url = prompt('Enter image URL:');
    if (url && url.trim()) {
      const updatedImages = [...images, url.trim()].slice(0, maxImages);
      onImagesChange(updatedImages);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Product Images ({images.length}/{maxImages})
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleUrlAdd}
            className="text-sm text-navy-800 hover:text-navy-600"
            disabled={images.length >= maxImages}
          >
            Add URL
          </button>
        </div>
      </div>

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
              className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
