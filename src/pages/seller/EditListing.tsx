import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';
import ListingForm, { type ListingFormData } from '../../components/seller/ListingForm';
import DeleteConfirmModal from '../../components/seller/DeleteConfirmModal';
import { ArrowLeft } from 'lucide-react';
import type { Product } from '../../types';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<Product | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchListing = useCallback(async () => {
    if (!id || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('sellerId', user.id) // Ownership enforcement: only seller can access their own listing
        .single();

      if (error) throw error;

      if (!data) {
        alert('Listing not found or you do not have permission to edit it');
        navigate('/seller/dashboard');
        return;
      }

      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      alert('Failed to load listing');
      navigate('/seller/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const handleSubmit = async (values: ListingFormData, mode: 'draft' | 'publish') => {
    if (!user || !id) return;

    setSaving(true);
    try {
      const price = parseFloat(values.price);
      const vatRate = 0.20; // 20% VAT
      const priceExVat = price / (1 + vatRate);

      const productData = {
        title: values.title,
        description: values.description || '',
        condition: values.condition.toLowerCase() as 'new' | 'refurbished' | 'used',
        price,
        priceExVat,
        stockQuantity: parseInt(values.quantity),
        images: values.images,
        isActive: mode === 'publish',
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id);

      if (error) throw error;

      // Success! Redirect to dashboard
      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Error updating listing:', error);
      alert('Failed to update listing. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async () => {
    if (!id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ isActive: false })
        .eq('id', id);

      if (error) throw error;

      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Error pausing listing:', error);
      alert('Failed to pause listing');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Success! Redirect to dashboard
      navigate('/seller/dashboard');
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing. Please try again.');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800"></div>
          <p className="mt-4 text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Listing Not Found</h2>
          <p className="text-gray-600 mb-6">The listing you're looking for doesn't exist or you don't have permission to edit it.</p>
          <Link to="/seller/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Map product to form values
  const initialValues: Partial<ListingFormData> = {
    title: listing.title,
    category: 'Other', // TODO: Map actual category
    condition: listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1),
    price: listing.price.toString(),
    quantity: listing.stockQuantity.toString(),
    description: listing.description,
    images: listing.images || [],
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/seller/dashboard"
            className="inline-flex items-center space-x-2 text-navy-800 hover:text-navy-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-bold">Edit Listing</h1>
          <p className="text-gray-600 mt-2">
            Update your listing details below.
          </p>
        </div>

        {/* Form Card */}
        <div className="card">
          <ListingForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onDelete={() => setDeleteModal(true)}
            loading={saving}
          />
        </div>

        {/* Additional Actions */}
        {listing.isActive && (
          <div className="mt-4">
            <button
              onClick={handlePause}
              disabled={saving}
              className="w-full py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? 'Pausing...' : 'Pause Listing'}
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Listing"
          message={`Are you sure you want to delete "${listing.title}"? This action cannot be undone.`}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
