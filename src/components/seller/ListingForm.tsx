import { useState } from 'react';

export type ListingFormData = {
  title: string;
  category: string;
  condition: string;
  price: string;
  quantity: string;
  description: string;
  images: string[];
};

interface ListingFormProps {
  initialValues?: Partial<ListingFormData>;
  onSubmit: (values: ListingFormData, mode: 'draft' | 'publish') => Promise<void>;
  onDelete?: () => void;
  loading?: boolean;
}

const CATEGORIES = ['Pallets', 'Logistics', 'Wholesale', 'Handmade', 'Other'];
const CONDITIONS = ['New', 'Refurbished', 'Grade A', 'Grade B', 'Mixed'];

export default function ListingForm({
  initialValues,
  onSubmit,
  onDelete,
  loading = false,
}: ListingFormProps) {
  const [formData, setFormData] = useState<ListingFormData>({
    title: initialValues?.title || '',
    category: initialValues?.category || '',
    condition: initialValues?.condition || '',
    price: initialValues?.price || '',
    quantity: initialValues?.quantity || '',
    description: initialValues?.description || '',
    images: initialValues?.images || [],
  });

  const [imageInput, setImageInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ListingFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ListingFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (!formData.condition) {
      newErrors.condition = 'Condition is required';
    }
    if (!formData.price || parseFloat(formData.price) < 0.01) {
      newErrors.price = 'Price must be at least £0.01';
    }
    if (!formData.quantity || parseInt(formData.quantity) < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    if (formData.description && formData.description.length > 800) {
      newErrors.description = 'Description must be 800 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (mode: 'draft' | 'publish') => {
    if (mode === 'publish' && !validateForm()) {
      return;
    }

    await onSubmit(formData, mode);
  };

  const handleAddImage = () => {
    if (imageInput.trim() && formData.images.length < 5) {
      setFormData({
        ...formData,
        images: [...formData.images, imageInput.trim()],
      });
      setImageInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  return (
    <form className="space-y-8">
      {/* Section 1: Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Basic Information</h3>
        
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-premium-md focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent"
            placeholder="Enter listing title"
            disabled={loading}
          />
          {errors.title && <p className="text-xs text-red-600 mt-1.5">{errors.title}</p>}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-premium-md focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent"
            disabled={loading}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-red-600 mt-1.5">{errors.category}</p>}
        </div>
      </div>

      {/* Section 2: Pricing & Details */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Pricing & Details</h3>
        
        {/* Condition */}
        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-900 mb-2">
            Condition <span className="text-red-500">*</span>
          </label>
          <select
            id="condition"
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-premium-md focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent"
            disabled={loading}
          >
            <option value="">Select condition</option>
            {CONDITIONS.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
          </select>
          {errors.condition && <p className="text-xs text-red-600 mt-1.5">{errors.condition}</p>}
        </div>

        {/* Price and Quantity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-900 mb-2">
              Price (GBP) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-gray-500 font-medium">£</span>
              <input
                type="number"
                id="price"
                min="0.01"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-premium-md focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent"
                placeholder="0.00"
                disabled={loading}
              />
            </div>
            {errors.price && <p className="text-xs text-red-600 mt-1.5">{errors.price}</p>}
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-900 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-premium-md focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent"
              placeholder="1"
              disabled={loading}
            />
            {errors.quantity && <p className="text-xs text-red-600 mt-1.5">{errors.quantity}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
            Description <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-premium-md focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent resize-none"
            placeholder="Describe your listing..."
            maxLength={800}
            disabled={loading}
          />
          <div className="flex justify-between mt-1.5">
            <div>
              {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
            </div>
            <span className="text-xs text-gray-500">{formData.description.length}/800</span>
          </div>
        </div>
      </div>

      {/* Section 3: Images */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Images</h3>
        <label className="block text-sm text-gray-600 mb-2">
          Add up to 5 image URLs
        </label>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="url"
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-premium-md focus:outline-none focus:ring-2 focus:ring-navy-800 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
              disabled={loading || formData.images.length >= 5}
            />
            <button
              type="button"
              onClick={handleAddImage}
              disabled={loading || !imageInput.trim() || formData.images.length >= 5}
              className="px-5 py-2.5 bg-navy-800 text-white rounded-premium-md hover:bg-navy-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Add
            </button>
          </div>

          {/* Image List */}
          {formData.images.length > 0 && (
            <div className="space-y-2">
              {formData.images.map((img, idx) => (
                <div key={idx} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <span className="flex-1 text-sm text-gray-700 truncate">{img}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => handleSubmit('draft')}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-white text-navy-800 border-2 border-navy-800 rounded-premium-md hover:bg-gray-50 transition-colors disabled:opacity-50 font-semibold"
        >
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="button"
          onClick={() => handleSubmit('publish')}
          disabled={loading}
          className="flex-1 px-6 py-3 bg-gold-500 text-navy-900 rounded-premium-md hover:bg-gold-600 transition-colors disabled:opacity-50 font-semibold shadow-sm"
        >
          {loading ? 'Publishing...' : 'Publish'}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-premium-md hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
