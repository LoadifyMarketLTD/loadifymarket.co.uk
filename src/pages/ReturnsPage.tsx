import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertCircle, CheckCircle, Clock, XCircle, RotateCcw, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

interface Return {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: string;
  status: string;
  refundAmount: number;
  buyerTrackingNumber?: string;
  sellerTrackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ReturnsPage() {
  const { user } = useAuthStore();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  const fetchReturns = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('returns')
        .select(`
          *,
          orders!inner(orderNumber)
        `)
        .eq('buyerId', user.id)
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
    if (user) {
      fetchReturns();
    }
  }, [user, fetchReturns]);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedOrder || !reason) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('returns')
        .insert({
          orderId: selectedOrder,
          buyerId: user.id,
          reason,
          description,
          status: 'requested',
        });

      if (error) throw error;

      alert('Return request submitted successfully!');
      setShowCreateForm(false);
      setSelectedOrder('');
      setReason('');
      setDescription('');
      fetchReturns();
    } catch (error) {
      console.error('Error creating return:', error);
      alert('Failed to submit return request');
    }
  };

  const handleUpdateTracking = async (returnId: string) => {
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    try {
      const { error } = await supabase
        .from('returns')
        .update({ buyerTrackingNumber: trackingNumber })
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_transit':
        return <RotateCcw className="h-5 w-5 text-blue-500" />;
      case 'refunded':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      requested: 'Requested',
      approved: 'Approved',
      rejected: 'Rejected',
      in_transit: 'In Transit',
      refunded: 'Refunded',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      requested: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      in_transit: 'bg-blue-100 text-blue-800',
      refunded: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to view your returns.
          </p>
          <Link to="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Returns</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
        >
          Request Return
        </button>
      </div>

      {/* Create Return Form */}
      {showCreateForm && (
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Request a Return</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmitReturn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Number *
              </label>
              <input
                type="text"
                value={selectedOrder}
                onChange={(e) => setSelectedOrder(e.target.value)}
                placeholder="Enter order number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Return *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="">Select a reason</option>
                <option value="defective">Defective or Damaged</option>
                <option value="not_as_described">Not as Described</option>
                <option value="wrong_item">Wrong Item Received</option>
                <option value="quality_issues">Quality Issues</option>
                <option value="changed_mind">Changed Mind</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Please provide more details about your return request..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Return Policy:</strong> You have 14 days from delivery to request a return. 
                Items must be in original condition with all packaging.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="btn-primary"
              >
                Submit Return Request
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Returns List */}
      {loading ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">Loading returns...</p>
        </div>
      ) : returns.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Returns Yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't requested any returns.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {returns.map((returnItem) => (
            <div key={returnItem.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(returnItem.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusLabel(returnItem.status)}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-1">
                    Return #{returnItem.id.substring(0, 8)}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Order: {returnItem.orderNumber}
                  </p>
                  <p className="text-gray-600 text-sm mb-2">
                    Reason: {returnItem.reason}
                  </p>
                  <p className="text-gray-500 text-sm mb-3">
                    Requested: {new Date(returnItem.createdAt).toLocaleDateString()}
                  </p>

                  {/* Tracking Information */}
                  <div className="mt-4 border-t pt-3 space-y-2">
                    {/* Buyer Tracking (for return shipment) */}
                    {returnItem.status === 'approved' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Your Return Tracking:</span>
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
                        ) : returnItem.buyerTrackingNumber ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {returnItem.buyerTrackingNumber}
                            </span>
                            <button
                              onClick={() => {
                                setEditingTracking(returnItem.id);
                                setTrackingNumber(returnItem.buyerTrackingNumber || '');
                              }}
                              className="text-sm text-navy-800 hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingTracking(returnItem.id)}
                            className="text-sm text-navy-800 hover:underline"
                          >
                            Add tracking number
                          </button>
                        )}
                      </div>
                    )}

                    {/* Seller Tracking (for replacement shipment) */}
                    {returnItem.sellerTrackingNumber && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">Replacement Tracking:</span>
                        </div>
                        <span className="text-sm font-mono bg-green-100 px-2 py-1 rounded">
                          {returnItem.sellerTrackingNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {returnItem.refundAmount > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Refund Amount</p>
                    <p className="text-2xl font-bold text-green-600">
                      £{returnItem.refundAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
