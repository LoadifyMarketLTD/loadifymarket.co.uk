import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Return {
  id: string;
  orderId: string;
  buyerId: string;
  reason: string;
  description: string;
  status: string;
  refundAmount?: number;
  buyerTrackingNumber?: string;
  sellerTrackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SellerReturnsPage() {
  const { user } = useAuthStore();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  const fetchReturns = useCallback(async () => {
    if (!user) return;

    try {
      // Get returns for orders belonging to this seller
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id')
        .eq('sellerId', user.id);

      const orderIds = ordersData?.map((o) => o.id) || [];

      if (orderIds.length === 0) {
        setReturns([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .in('orderId', orderIds)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      setReturns(data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'seller') {
      fetchReturns();
    }
  }, [user, fetchReturns]);

  const handleUpdateTracking = async (returnId: string) => {
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    try {
      const { error } = await supabase
        .from('returns')
        .update({ sellerTrackingNumber: trackingNumber })
        .eq('id', returnId);

      if (error) throw error;

      alert('Tracking number updated successfully!');
      setEditingTracking(null);
      setTrackingNumber('');
      fetchReturns();
    } catch (error) {
      console.error('Error updating tracking:', error);
      alert('Failed to update tracking number');
    }
  };

  const handleUpdateStatus = async (returnId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ status: newStatus })
        .eq('id', returnId);

      if (error) throw error;

      alert(`Return ${newStatus} successfully!`);
      fetchReturns();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requested: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!user || user.role !== 'seller') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Seller Access Required</h2>
          <p className="text-gray-600">You need to be a seller to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Returns Management</h1>

        {loading ? (
          <div className="card">
            <p className="text-center py-8 text-gray-600">Loading returns...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Returns Yet</h3>
            <p className="text-gray-600">
              When customers request returns, they will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {returns.map((returnItem) => (
              <div key={returnItem.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(returnItem.status)}
                    <div>
                      <h3 className="font-bold text-lg">Return #{returnItem.id.substring(0, 8)}</h3>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${getStatusColor(returnItem.status)}`}>
                        {returnItem.status.charAt(0).toUpperCase() + returnItem.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {returnItem.status === 'requested' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(returnItem.id, 'approved')}
                        className="btn-primary text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(returnItem.id, 'rejected')}
                        className="btn-outline text-sm"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-medium">Reason:</span> {returnItem.reason}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Description:</span> {returnItem.description}
                  </p>
                  <p className="text-sm text-gray-600">
                    Requested: {new Date(returnItem.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Tracking Information */}
                <div className="border-t pt-4 space-y-3">
                  {/* Buyer Tracking */}
                  {returnItem.buyerTrackingNumber && (
                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Buyer Return Tracking:</span>
                      </div>
                      <span className="text-sm font-mono bg-white px-3 py-1 rounded border border-blue-200">
                        {returnItem.buyerTrackingNumber}
                      </span>
                    </div>
                  )}

                  {/* Seller Replacement Tracking */}
                  {returnItem.status === 'approved' && (
                    <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Replacement Tracking:</span>
                      </div>
                      {editingTracking === returnItem.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="Enter tracking number"
                            className="input-field text-sm py-1 px-2"
                          />
                          <button
                            onClick={() => handleUpdateTracking(returnItem.id)}
                            className="btn-primary text-sm py-1 px-3"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingTracking(null);
                              setTrackingNumber('');
                            }}
                            className="btn-outline text-sm py-1 px-3"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : returnItem.sellerTrackingNumber ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono bg-white px-3 py-1 rounded border border-green-200">
                            {returnItem.sellerTrackingNumber}
                          </span>
                          <button
                            onClick={() => {
                              setEditingTracking(returnItem.id);
                              setTrackingNumber(returnItem.sellerTrackingNumber || '');
                            }}
                            className="text-sm text-navy-800 hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingTracking(returnItem.id)}
                          className="btn-secondary text-sm"
                        >
                          Add Tracking Number
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
