import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import type { Shipment } from '../types/shipping';
import { Package, ExternalLink, Filter, Search } from 'lucide-react';

interface ShipmentWithDetails extends Shipment {
  orders: {
    orderNumber: string;
    createdAt: string;
    total: number;
    products: {
      title: string;
    };
    seller: {
      firstName: string;
      lastName: string;
      email: string;
    };
    buyer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

export default function AdminShipmentsPage() {
  const { user } = useAuthStore();
  const [shipments, setShipments] = useState<ShipmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadShipments();
    }
  }, [user]);

  const loadShipments = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: shipmentsError } = await (await import('../lib/supabase')).supabase
        .from('shipments')
        .select(`
          *,
          orders (
            orderNumber,
            createdAt,
            total,
            products (
              title
            ),
            seller:users!orders_sellerId_fkey (
              firstName,
              lastName,
              email
            ),
            buyer:users!orders_buyerId_fkey (
              firstName,
              lastName,
              email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      setShipments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusOverride = async (shipmentId: string, newStatus: string) => {
    setUpdating(shipmentId);
    setError('');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/.netlify/functions/update-shipment-status/${shipmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          message: 'Status updated by admin',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      loadShipments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredShipments = shipments.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        s.orders.orderNumber.toLowerCase().includes(search) ||
        s.tracking_number?.toLowerCase().includes(search) ||
        s.courier_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          You need to be an admin to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-800 mb-2">Shipments Administration</h1>
        <p className="text-gray-600">Monitor and manage all shipments across the platform</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by order number, tracking number, or courier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" aria-hidden="true" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Dispatched">Dispatched</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Returned">Returned</option>
              <option value="Delivery Failed">Delivery Failed</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Shipments</p>
          <p className="text-2xl font-bold text-navy-800">{shipments.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">In Transit</p>
          <p className="text-2xl font-bold text-blue-600">
            {shipments.filter(s => s.status === 'In Transit' || s.status === 'Out for Delivery').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Delivered</p>
          <p className="text-2xl font-bold text-green-600">
            {shipments.filter(s => s.status === 'Delivered').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Issues</p>
          <p className="text-2xl font-bold text-red-600">
            {shipments.filter(s => s.status === 'Returned' || s.status === 'Delivery Failed').length}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seller/Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Courier & Tracking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-5 h-5 text-gray-400 mr-2" aria-hidden="true" />
                        <div>
                          <div className="text-sm font-medium text-navy-800">
                            {shipment.orders.orderNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {shipment.orders.products?.title || 'Product'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">
                          S: {shipment.orders.seller?.firstName} {shipment.orders.seller?.lastName}
                        </div>
                        <div className="text-gray-500">
                          B: {shipment.orders.buyer?.firstName} {shipment.orders.buyer?.lastName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900">{shipment.courier_name || 'N/A'}</div>
                        {shipment.tracking_number && (
                          <div className="text-xs text-gray-500 font-mono">
                            {shipment.tracking_number}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={shipment.status}
                        onChange={(e) => handleStatusOverride(shipment.id, e.target.value)}
                        disabled={updating === shipment.id}
                        className={`text-xs px-2 py-1 rounded border ${
                          shipment.status === 'Delivered' ? 'bg-green-100 text-green-800 border-green-200' :
                          shipment.status === 'In Transit' || shipment.status === 'Out for Delivery' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          shipment.status === 'Returned' || shipment.status === 'Delivery Failed' ? 'bg-red-100 text-red-800 border-red-200' :
                          'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Dispatched">Dispatched</option>
                        <option value="In Transit">In Transit</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Returned">Returned</option>
                        <option value="Delivery Failed">Delivery Failed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(shipment.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {shipment.proof_of_delivery_url && (
                        <a
                          href={shipment.proof_of_delivery_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-500 hover:text-orange-600 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" />
                          PoD
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredShipments.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No shipments found</h3>
              <p className="text-gray-600">
                {searchTerm || filter !== 'all'
                  ? 'Try adjusting your filters or search term'
                  : 'No shipments have been created yet'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
