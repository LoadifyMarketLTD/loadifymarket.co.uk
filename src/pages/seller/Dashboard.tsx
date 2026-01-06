import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store';
import type { Product } from '../../types';
import { Plus, Edit, Pause, Play, Trash2, Package } from 'lucide-react';
import StatusBadge from '../../components/seller/StatusBadge';
import DeleteConfirmModal from '../../components/seller/DeleteConfirmModal';

type ListingStatus = 'draft' | 'published' | 'paused';

interface ListingWithStatus extends Product {
  listingStatus: ListingStatus;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<ListingWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    listingId: string | null;
    title: string;
  }>({
    isOpen: false,
    listingId: null,
    title: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('sellerId', user.id)
        .order('updatedAt', { ascending: false });

      if (error) throw error;

      // Map products to listings with status
      const listingsWithStatus: ListingWithStatus[] = (data || []).map((product) => {
        let listingStatus: ListingStatus = 'draft';
        
        // Determine status: draft (not approved) / published (active & approved) / paused (!active & approved)
        if (product.isActive && product.isApproved) {
          listingStatus = 'published';
        } else if (!product.isActive && product.isApproved) {
          listingStatus = 'paused';
        } else {
          listingStatus = 'draft';
        }

        return {
          ...product,
          listingStatus,
        };
      });

      setListings(listingsWithStatus);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handlePublish = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ isActive: true })
        .eq('id', listingId);

      if (error) throw error;
      fetchListings();
    } catch (error) {
      console.error('Error publishing listing:', error);
      alert('Failed to publish listing');
    }
  };

  const handlePause = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ isActive: false })
        .eq('id', listingId);

      if (error) throw error;
      fetchListings();
    } catch (error) {
      console.error('Error pausing listing:', error);
      alert('Failed to pause listing');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.listingId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteModal.listingId);

      if (error) throw error;

      setDeleteModal({ isOpen: false, listingId: null, title: '' });
      fetchListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      alert('Failed to delete listing');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access your dashboard.</p>
          <Link to="/login" className="btn-primary">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-3 sm:space-y-0">
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <Link
            to="/seller/create"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create New Listing</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading listings...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && (
          <div className="card text-center py-16">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">No listings yet</h2>
            <p className="text-gray-600 mb-6">Create your first listing to start selling.</p>
            <Link to="/seller/create" className="btn-primary inline-flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New Listing</span>
            </Link>
          </div>
        )}

        {/* Listings Grid */}
        {!loading && listings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="card hover:shadow-lg transition-shadow">
                {/* Image */}
                <div className="relative aspect-[3/2] bg-gray-100 rounded-t-lg overflow-hidden mb-4">
                  {listing.images && listing.images.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={listing.listingStatus} />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg line-clamp-2">{listing.title}</h3>
                  
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Price: {formatPrice(listing.price)}</span>
                    <span>Qty: {listing.stockQuantity}</span>
                  </div>

                  <div className="text-xs text-gray-500">
                    Updated: {formatDate(listing.updatedAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-3 border-t">
                    <Link
                      to={`/seller/edit/${listing.id}`}
                      className="flex-1 py-2 px-3 text-center text-sm bg-navy-800 text-white rounded hover:bg-navy-900 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Link>
                    
                    {listing.listingStatus === 'published' ? (
                      <button
                        onClick={() => handlePause(listing.id)}
                        className="py-2 px-3 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors flex items-center space-x-1"
                        title="Pause"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    ) : listing.listingStatus !== 'draft' ? (
                      <button
                        onClick={() => handlePublish(listing.id)}
                        className="py-2 px-3 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors flex items-center space-x-1"
                        title="Publish"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    ) : null}
                    
                    <button
                      onClick={() =>
                        setDeleteModal({
                          isOpen: true,
                          listingId: listing.id,
                          title: listing.title,
                        })
                      }
                      className="py-2 px-3 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors flex items-center space-x-1"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, listingId: null, title: '' })}
          onConfirm={handleDelete}
          title="Delete Listing"
          message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
