import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { Product } from '../types';
import { Plus, Edit, Eye, Play, Pause, Trash2, Package } from 'lucide-react';
import StatusBadge from '../components/seller/StatusBadge';
import DeleteConfirmModal from '../components/seller/DeleteConfirmModal';

type ListingStatus = 'draft' | 'published' | 'paused';

interface ListingWithStatus extends Product {
  listingStatus: ListingStatus;
}

export default function SellerListingsPage() {
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
        
        // Determine status based on product properties
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
          <p className="text-gray-600 mb-6">Please log in to access your listings.</p>
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
          <h1 className="text-3xl font-bold">Your Listings</h1>
          <Link
            to="/seller/listings/new"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Listing</span>
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
            <Link to="/seller/listings/new" className="btn-primary inline-flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create Your First Listing</span>
            </Link>
          </div>
        )}

        {/* Desktop Table View */}
        {!loading && listings.length > 0 && (
          <>
            <div className="hidden md:block card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                      Price
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                      Qty
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                      Updated
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {listing.images && listing.images.length > 0 ? (
                            <img
                              src={listing.images[0]}
                              alt={listing.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <span className="font-medium line-clamp-1">{listing.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={listing.listingStatus} />
                      </td>
                      <td className="px-4 py-3 font-medium">{formatPrice(listing.price)}</td>
                      <td className="px-4 py-3">{listing.stockQuantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(listing.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            to={`/product/${listing.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/seller/listings/${listing.id}/edit`}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          {listing.listingStatus === 'published' ? (
                            <button
                              onClick={() => handlePause(listing.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Pause"
                            >
                              <Pause className="h-4 w-4" />
                            </button>
                          ) : listing.listingStatus !== 'draft' ? (
                            <button
                              onClick={() => handlePublish(listing.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
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
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {listings.map((listing) => (
                <div key={listing.id} className="card">
                  <div className="flex items-start space-x-3 mb-3">
                    {listing.images && listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-2">{listing.title}</h3>
                      <div className="mt-1">
                        <StatusBadge status={listing.listingStatus} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-gray-600 text-xs">Price</p>
                      <p className="font-semibold">{formatPrice(listing.price)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Quantity</p>
                      <p className="font-semibold">{listing.stockQuantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs">Updated</p>
                      <p className="font-semibold text-xs">{formatDate(listing.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-3 border-t">
                    <Link
                      to={`/product/${listing.id}`}
                      className="flex-1 py-2 px-3 text-center text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      to={`/seller/listings/${listing.id}/edit`}
                      className="flex-1 py-2 px-3 text-center text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                    >
                      Edit
                    </Link>
                    {listing.listingStatus === 'published' ? (
                      <button
                        onClick={() => handlePause(listing.id)}
                        className="flex-1 py-2 px-3 text-center text-sm bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition-colors"
                      >
                        Pause
                      </button>
                    ) : listing.listingStatus !== 'draft' ? (
                      <button
                        onClick={() => handlePublish(listing.id)}
                        className="flex-1 py-2 px-3 text-center text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                      >
                        Publish
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
                      className="py-2 px-3 text-center text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
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
