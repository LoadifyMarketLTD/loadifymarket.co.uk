import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { hasSellerAccess } from '../lib/roleUtils';
import type { ProductType, ProductCondition } from '../types';
import CategorySelector from '../components/CategorySelector';
import ImageUpload from '../components/ImageUpload';
import ShippingMethodSelector from '../components/ShippingMethodSelector';

export default function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedShippingMethodIds, setSelectedShippingMethodIds] = useState<string[]>([]);
  const [dispatchTime, setDispatchTime] = useState('');
  // True when the product has active or completed orders — critical fields are locked for sellers
  const [hasActiveOrders, setHasActiveOrders] = useState(false);

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

      // Ownership check — only the seller who created the product (or admin/owner) may edit it.
      if (data.sellerId !== user?.id && user?.role !== 'admin' && user?.role !== 'owner') {
        alert('You do not have permission to edit this product.');
        navigate('/seller');
        return;
      }

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

        // Load the shipping methods already linked to this product
        const { data: psData } = await supabase
          .from('product_shipping')
          .select('method_id, dispatch_time')
          .eq('product_id', id);
        if (psData) {
          setSelectedShippingMethodIds(psData.map((r: { method_id: string }) => r.method_id));
          // Use the first row's dispatch_time as the shared dispatch time
          if (psData.length > 0 && psData[0].dispatch_time) {
            setDispatchTime(psData[0].dispatch_time);
          }
        }

        // Check for active or completed orders — sellers cannot edit critical fields once ordered.
        // Admins/owners bypass this restriction.
        if (data.sellerId === user?.id) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('productId', id)
            .in('status', ['paid', 'packed', 'shipped', 'delivered', 'pending']);
          setHasActiveOrders((count ?? 0) > 0);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Category is required — the DB enforces NOT NULL on categoryId
    if (!formData.categoryId) {
      alert('Please select a category for this product.');
      return;
    }

    setSaving(true);
    try {
      const price = parseFloat(formData.price);
      const vatRate = 0.20; // 20% VAT
      const priceExVat = price / (1 + vatRate);

      // When critical fields are locked (orders exist) and the user is a seller,
      // only allow non-critical fields to be updated.
      const isAdmin = user.role === 'admin' || user.role === 'owner';

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

      // When the product has active/completed orders and the current user is
      // a seller (not admin), strip the critical locked fields from the update
      // to prevent price/stock/title/condition manipulation after sale.
      if (id && hasActiveOrders && !isAdmin) {
        // Build an allowed-only subset by explicitly picking non-locked fields
        const allowedData: Partial<typeof productData> = {
          description: productData.description,
          images: productData.images,
          specifications: productData.specifications,
          weight: productData.weight,
          dimensions: productData.dimensions,
          palletInfo: productData.palletInfo,
        };
        const { error } = await supabase.from('products').update(allowedData).eq('id', id);
        if (error) throw error;

        // Shipping methods can always be updated by sellers
        const { error: deleteError } = await supabase.from('product_shipping').delete().eq('product_id', id);
        if (deleteError) throw deleteError;
        if (selectedShippingMethodIds.length > 0) {
          const rows = selectedShippingMethodIds.map((method_id) => ({ product_id: id, method_id, dispatch_time: dispatchTime || null }));
          const { error: shippingError } = await supabase.from('product_shipping').insert(rows);
          if (shippingError) throw shippingError;
        }

        alert('Product updated successfully! (Critical fields were not changed as orders exist)');
      } else if (id) {
        // Update existing product (full update — admin or no active orders)
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);

        if (error) throw error;

        // Replace shipping methods: delete old rows then re-insert selected ones.
        const { error: deleteError } = await supabase
          .from('product_shipping')
          .delete()
          .eq('product_id', id);
        if (deleteError) throw deleteError;

        if (selectedShippingMethodIds.length > 0) {
          const rows = selectedShippingMethodIds.map((method_id) => ({
            product_id: id,
            method_id,
            dispatch_time: dispatchTime || null,
          }));
          const { error: shippingError } = await supabase.from('product_shipping').insert(rows);
          if (shippingError) throw shippingError;
        }

        alert('Product updated successfully!');
      } else {
        // Create new product
        const { data: inserted, error } = await supabase
          .from('products')
          .insert([productData])
          .select('id')
          .single();

        if (error) throw error;

        // Link selected shipping methods to the new product
        if (inserted && selectedShippingMethodIds.length > 0) {
          const rows = selectedShippingMethodIds.map((method_id) => ({
            product_id: inserted.id,
            method_id,
            dispatch_time: dispatchTime || null,
          }));
          const { error: shippingError } = await supabase.from('product_shipping').insert(rows);
          if (shippingError) throw shippingError;
        }

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

  if (!user || !hasSellerAccess(user)) {
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
            {/* Banner warning when critical fields are locked due to existing orders */}
            {hasActiveOrders && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                <div>
                  <p className="text-amber-800 font-semibold text-sm">Some fields are locked</p>
                  <p className="text-amber-700 text-xs mt-0.5">This product has active or completed orders. Title, price, stock quantity, and condition cannot be changed. You can still edit the description, images, and shipping notes.</p>
                </div>
              </div>
            )}

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
                  disabled={hasActiveOrders}
                  className={`input-field ${hasActiveOrders ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
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
                    <option value="retail">Retail</option>
                    <option value="handmade">Handmade / Artisan</option>
                    <option value="clearance">Clearance</option>
                    <option value="pallet">Pallet</option>
                    <option value="lot">Lot</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="logistics">Logistics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Condition *</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => handleChange('condition', e.target.value)}
                    disabled={hasActiveOrders}
                    className={`input-field ${hasActiveOrders ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
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
                    disabled={hasActiveOrders}
                    className={`input-field ${hasActiveOrders ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
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
                    disabled={hasActiveOrders}
                    className={`input-field ${hasActiveOrders ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
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

            {/* Shipping Methods — retail products only (pallet/bulk uses XDrive Logistics) */}
            {formData.type !== 'pallet' ? (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Shipping Methods</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Select the shipping options you offer for this product.
                </p>
                <ShippingMethodSelector
                  selectedMethodIds={selectedShippingMethodIds}
                  onChange={setSelectedShippingMethodIds}
                />
                {selectedShippingMethodIds.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Estimated Dispatch Time</label>
                    <input
                      type="text"
                      value={dispatchTime}
                      onChange={(e) => setDispatchTime(e.target.value)}
                      className="input-field"
                      placeholder="e.g. 1–2 working days"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Delivery</h3>
                <p className="text-sm text-gray-600">
                  Pallet and bulk products use <strong>XDrive Logistics</strong> for transport.
                  Buyers will request a transport quote directly through the XDrive platform.
                </p>
              </div>
            )}

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
