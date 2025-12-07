import { useState, useEffect } from 'react';
import { Package, Filter, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { ShipmentStatus } from '../../types/shipping';

interface ShipmentWithDetails {
  id: string;
  order_id: string;
  status: ShipmentStatus;
  courier_name: string | null;
  tracking_number: string | null;
  proof_of_delivery_url: string | null;
  created_at: string;
  updated_at: string;
  orders: {
    orderNumber: string;
    total: number;
    users?: {
      email: string;
      firstName: string | null;
    };
  };
}

const STATUS_OPTIONS: ShipmentStatus[] = [
  'Pending',
  'Processing',
  'Dispatched',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Returned',
  'Delivery Failed',
];

export default function ShipmentsAdmin() {
  const [shipments, setShipments] = useState<ShipmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedShipment, setSelectedShipment] = useState<ShipmentWithDetails | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('Pending');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchShipments = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('shipments')
        .select(`
          *,
          orders(
            orderNumber,
            total,
            users:buyerId(email, firstName)
          )
        `)
        .order('updated_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setShipments(data || []);
    } catch (error) {
      console.error('Error fetching shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedShipment) return;

    setUpdating(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert('Please log in to continue');
        return;
      }

      const response = await fetch(
        `/.netlify/functions/shipments-update-status/${selectedShipment.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
            message: `Status updated by admin to ${newStatus}`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      alert('Status updated successfully!');
      setShowStatusModal(false);
      setSelectedShipment(null);
      await fetchShipments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const openStatusModal = (shipment: ShipmentWithDetails) => {
    setSelectedShipment(shipment);
    setNewStatus(shipment.status);
    setShowStatusModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  const getStatusBadgeColor = (status: ShipmentStatus) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Dispatched':
      case 'In Transit':
      case 'Out for Delivery':
        return 'bg-blue-100 text-blue-800';
      case 'Delivery Failed':
      case 'Returned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800"></div>
          <p className="mt-4 text-gray-600">Loading shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-800 mb-2">Shipments Admin</h1>
          <p className="text-gray-600">Manage all shipments and tracking information</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-navy-800 mr-2" />
            <h2 className="font-bold">Filters</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Shipments Table */}
        {shipments.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Shipments Found</h3>
            <p className="text-gray-600">
              {filterStatus === 'all'
                ? 'No shipments have been created yet.'
                : `No shipments with status "${filterStatus}".`}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Courier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {shipment.orders.orderNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPrice(shipment.orders.total)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {shipment.orders.users?.firstName || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">{shipment.orders.users?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                            shipment.status
                          )}`}
                        >
                          {shipment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipment.courier_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shipment.tracking_number ? (
                          <span className="font-mono">{shipment.tracking_number}</span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(shipment.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => openStatusModal(shipment)}
                          className="text-amber-600 hover:text-amber-900"
                          aria-label="Update status"
                        >
                          <AlertCircle className="h-4 w-4 inline" />
                        </button>
                        {shipment.proof_of_delivery_url && (
                          <a
                            href={shipment.proof_of_delivery_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900"
                            aria-label="View proof of delivery"
                          >
                            <ExternalLink className="h-4 w-4 inline" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status Update Modal */}
        {showStatusModal && selectedShipment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Update Shipment Status</h3>
              <p className="text-sm text-gray-600 mb-4">
                Order: {selectedShipment.orders.orderNumber}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                  className="input-field"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className="flex-1 btn-primary"
                >
                  {updating ? 'Updating...' : 'Update'}
                </button>
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedShipment(null);
                  }}
                  disabled={updating}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
