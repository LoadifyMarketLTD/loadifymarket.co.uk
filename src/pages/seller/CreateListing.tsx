import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';
import ListingForm, { type ListingFormData } from '../../components/seller/ListingForm';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CreateListing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: ListingFormData, mode: 'draft' | 'publish') => {
    if (!user) {
      alert('You must be logged in to create a listing');
      return;
    }

    setLoading(true);
    try {
      const price = parseFloat(values.price);
      const vatRate = 0.20; // 20% VAT
      const priceExVat = price / (1 + vatRate);

      // Map form values to product structure
      const productData = {
        sellerId: user.id,
        title: values.title,
        description: values.description || '',
        type: 'product' as const,
        condition: values.condition.toLowerCase() as 'new' | 'refurbished' | 'used',
        categoryId: '00000000-0000-0000-0000-000000000001', // TODO: Map category to actual categoryId
        price,
        priceExVat,
        vatRate,
        stockQuantity: parseInt(values.quantity),
        images: values.images,
        isActive: mode === 'publish', // Active only if publishing
        isApproved: false, // Always needs approval
        views: 0,
        rating: 0,
        reviewCount: 0,
        stockStatus: 'in_stock' as const,
      };

      const { error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;

      // Success! Redirect to dashboard
      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/seller/dashboard"
            className="inline-flex items-center space-x-2 text-navy-800 hover:text-navy-900 mb-4 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-navy-900">Create New Listing</h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base">
            Fill in the details below to create your listing. You can save as draft or publish immediately.
          </p>
        </div>

        {/* Form Card */}
        <div className="card">
          <ListingForm onSubmit={handleSubmit} loading={loading} />
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-premium-md">
          <p className="text-xs md:text-sm text-blue-800">
            <strong>Note:</strong> Draft listings are not visible in the public catalog. 
            Published listings will appear in the catalog for buyers to see.
          </p>
        </div>
      </div>
    </div>
  );
}
