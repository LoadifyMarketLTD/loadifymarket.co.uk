import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { ProductType, ProductCondition } from '../types';
import CategorySelector from '../components/CategorySelector';
import ImageUpload from '../components/ImageUpload';

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'product' as ProductType,
    condition: 'new' as ProductCondition,
    price: '',
    stockQuantity: '',
    categoryId: '',
    subcategoryId: '',
    images: [] as string[],
    specifications: {} as Record<string, string>,
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: '',
    },
    palletInfo: {
      palletCount: '',
      itemsPerPallet: '',
      palletType: '',
    },
  });

  const fetchProduct = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          type: data.type || 'product',
          condition: data.condition || 'new',
          price: data.price?.toString() || '',
          stockQuantity: data.stockQuantity?.toString() || '',
          categoryId: data.categoryId || '',
          subcategoryId: data.subcategoryId || '',
          images: data.images || [],
          specifications: data.specifications || {},
          weight: data.weight?.toString() || '',
          dimensions: data.dimensions || { length: '', width: '', height: '' },
          palletInfo: data.palletInfo || { palletCount: '', itemsPerPallet: '', palletType: '' },
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const price = parseFloat(formData.price);
      const vatRate = 0.20; // 20% VAT
      const priceExVat = price / (1 + vatRate);

      const productData = {
        sellerId: user.id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        condition: formData.condition,
        price,
        priceExVat,
        vatRate,
        stockQuantity: parseInt(formData.stockQuantity),
        stockStatus: parseInt(formData.stockQuantity) > 10 ? 'in_stock' : 
                    parseInt(formData.stockQuantity) > 0 ? 'low_stock' : 'out_of_stock',
        categoryId: formData.categoryId || null,
        subcategoryId: formData.subcategoryId || null,
        images: formData.images,
        specifications: formData.specifications,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        dimensions: (formData.dimensions.length && formData.dimensions.width && formData.dimensions.height) 
          ? formData.dimensions 
          : null,
        palletInfo: (formData.type === 'pallet' && formData.palletInfo.palletCount) 
          ? formData.palletInfo 
          : null,
        isActive: true,
        isApproved: false, // Requires admin approval
      };

      if (id) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);

        if (error) throw error;
        alert('Product updated successfully!');
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        alert('Product created successfully! It will be visible after admin approval.');
      }

      navigate('/seller');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user || user.role !== 'seller') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <p className="text-gray-600">You must be a seller to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">{id ? 'Edit Product' : 'Add New Product'}</h1>

          <form onSubmit={handleSubmit} className="card">
            {/* Basic Information */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Product Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  required
                  className="input-field"
                  placeholder="Enter product title"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  required
                  rows={5}
                  className="input-field"
                  placeholder="Describe your product"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="product">Regular Product</option>
                    <option value="pallet">Pallet</option>
                    <option value="lot">Lot</option>
                    <option value="clearance">Clearance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Condition *</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => handleChange('condition', e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (£) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    required
                    className="input-field"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Price includes VAT (20%)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) => handleChange('stockQuantity', e.target.value)}
                    required
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Category Selection */}
            <div className="mb-6">
              <CategorySelector
                selectedCategoryId={formData.categoryId}
                selectedSubcategoryId={formData.subcategoryId}
                onCategoryChange={(categoryId) => handleChange('categoryId', categoryId)}
                onSubcategoryChange={(subcategoryId) => handleChange('subcategoryId', subcategoryId)}
              />
            </div>

            {/* Product Images */}
            <div className="mb-6">
              <ImageUpload
                images={formData.images}
                onImagesChange={(images) => setFormData(prev => ({ ...prev, images }))}
                maxImages={10}
              />
            </div>

            {/* Pallet Information */}
            {formData.type === 'pallet' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-3">Pallet Information</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pallet Count</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.palletInfo.palletCount}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        palletInfo: { ...prev.palletInfo, palletCount: e.target.value }
                      }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Items per Pallet</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.palletInfo.itemsPerPallet}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        palletInfo: { ...prev.palletInfo, itemsPerPallet: e.target.value }
                      }))}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Pallet Type</label>
                    <input
                      type="text"
                      value={formData.palletInfo.palletType}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        palletInfo: { ...prev.palletInfo, palletType: e.target.value }
                      }))}
                      className="input-field"
                      placeholder="e.g., Euro pallet"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dimensions and Weight */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Dimensions & Weight</h3>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Length (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.dimensions.length}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, length: e.target.value }
                    }))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Width (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.dimensions.width}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, width: e.target.value }
                    }))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.dimensions.height}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      dimensions: { ...prev.dimensions, height: e.target.value }
                    }))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate('/seller')}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Saving...' : id ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
