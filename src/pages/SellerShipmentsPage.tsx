import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import type { Shipment } from '../types/shipping';
import SellerShipmentForm from '../components/SellerShipmentForm';
import { Package, Truck, Search, Filter } from 'lucide-react';

interface SupabaseOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: string;
  products: Array<{ title: string }>;
  users: Array<{
    firstName: string;
    lastName: string;
    email: string;
  }>;
}

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: string;
  products: {
    title: string;
  };
  users: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ShipmentWithOrder extends Shipment {
  orders: Order;
}

export default function SellerShipmentsPage() {
  const { user } = useAuthStore();
  const [shipments, setShipments] = useState<ShipmentWithOrder[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<{ orderId: string; shipment?: Shipment | null } | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]); // loadData is stable, only depends on user

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: shipmentsData, error: shipmentsError } = await (await import('../lib/supabase')).supabase
        .from('shipments')
        .select(`
          *,
          orders (
            id,
            orderNumber,
            createdAt,
            total,
            status,
            products (
              title
            ),
            users!orders_buyerId_fkey (
              firstName,
              lastName,
              email
            )
          )
        `)
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      setShipments(shipmentsData || []);

      // Load orders without shipments
      const { data: ordersData, error: ordersError } = await (await import('../lib/supabase')).supabase
        .from('orders')
        .select(`
          id,
          orderNumber,
          createdAt,
          total,
          status,
          products!inner (
            title
          ),
          users!orders_buyerId_fkey (
            firstName,
            lastName,
            email
          )
        `)
        .eq('sellerId', user!.id)
        .not('id', 'in', `(${shipmentsData?.map(s => s.order_id).join(',') || 'null'})`)
        .order('createdAt', { ascending: false });

      if (ordersError) throw ordersError;

      // Convert Supabase response to our Order type
      const convertedOrders: Order[] = (ordersData || []).map((o: SupabaseOrder) => ({
        ...o,
        products: o.products[0] || { title: 'Unknown' },
        users: o.users[0] || { firstName: '', lastName: '', email: '' }
      }));

      setOrders(convertedOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  };

  const handleManageShipment = (orderId: string, shipment?: Shipment) => {
    setSelectedOrder({ orderId, shipment });
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
  };

  const handleSuccess = () => {
    setSelectedOrder(null);
    loadData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredShipments = shipments.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (searchTerm && !s.orders.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const filteredOrders = orders.filter(o => {
    if (searchTerm && !o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (!user || user.role !== 'seller') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          You need to be a seller to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-800 mb-2">Shipment Management</h1>
        <p className="text-gray-600">Manage shipments and tracking for your orders</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by order number..."
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
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Shipments */}
          {filteredShipments.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-navy-800 mb-4">Active Shipments</h2>
              <div className="grid gap-4">
                {filteredShipments.map((shipment) => (
                  <div key={shipment.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-gray-400" aria-hidden="true" />
                          <span className="font-semibold text-navy-800">
                            {shipment.orders.orderNumber}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            shipment.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                            shipment.status === 'In Transit' || shipment.status === 'Out for Delivery' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {shipment.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {shipment.orders.products?.title || 'Product'}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>Buyer: {shipment.orders.users?.firstName} {shipment.orders.users?.lastName}</span>
                          <span>Order Date: {formatDate(shipment.orders.createdAt)}</span>
                          {shipment.courier_name && (
                            <span>Courier: {shipment.courier_name}</span>
                          )}
                          {shipment.tracking_number && (
                            <span className="font-mono">AWB: {shipment.tracking_number}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleManageShipment(shipment.order_id, shipment)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                      >
                        <Truck className="w-4 h-4" aria-hidden="true" />
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders Without Shipments */}
          {filteredOrders.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-navy-800 mb-4">Orders Pending Shipment</h2>
              <div className="grid gap-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-gray-400" aria-hidden="true" />
                          <span className="font-semibold text-navy-800">{order.orderNumber}</span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            No Shipment
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          {order.products?.title || 'Product'}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>Buyer: {order.users?.firstName} {order.users?.lastName}</span>
                          <span>Order Date: {formatDate(order.createdAt)}</span>
                          <span>Total: £{order.total.toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleManageShipment(order.id)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Truck className="w-4 h-4" aria-hidden="true" />
                        Create Shipment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredShipments.length === 0 && filteredOrders.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No shipments found</h3>
              <p className="text-gray-600">
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your filters or search term'
                  : 'Create shipments for your orders to get started'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Shipment Form Modal */}
      {selectedOrder && (
        <SellerShipmentForm
          orderId={selectedOrder.orderId}
          existingShipment={selectedOrder.shipment}
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
