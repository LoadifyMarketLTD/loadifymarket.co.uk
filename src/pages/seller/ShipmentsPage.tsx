import { useState, useEffect } from 'react';
import { Package, Eye } from 'lucide-react';
import { useAuthStore } from '../../store';
import { supabase } from '../../lib/supabase';
import SellerShipmentForm from '../../components/SellerShipmentForm';

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: string;
  products?: {
    title: string;
  } | null;
}

interface ShipmentWithOrder {
  id: string;
  order_id: string;
  status: string;
  tracking_number: string | null;
  courier_name: string | null;
  updated_at: string;
  orders: Order;
}

export default function ShipmentsPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<ShipmentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrdersAndShipments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchOrdersAndShipments = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch seller's orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, orderNumber, createdAt, total, status, products!inner(title)')
        .eq('sellerId', user.id)
        .order('createdAt', { ascending: false });

      if (ordersError) throw ordersError;

      // Map the data to match our Order interface
      const mappedOrders = (ordersData || []).map((order) => ({
        id: order.id as string,
        orderNumber: order.orderNumber as string,
        createdAt: order.createdAt as string,
        total: order.total as number,
        status: order.status as string,
        products: Array.isArray(order.products) ? order.products[0] : order.products,
      }));

      setOrders(mappedOrders);

      // Fetch shipments for these orders
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*, orders!inner(id, orderNumber, createdAt, total, status, products!inner(title))')
        .eq('seller_id', user.id)
        .order('updated_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Map shipments data
      const mappedShipments = (shipmentsData || []).map((shipment) => ({
        ...shipment,
        orders: {
          ...shipment.orders,
          products: Array.isArray(shipment.orders.products) 
            ? shipment.orders.products[0] 
            : shipment.orders.products,
        },
      }));

      setShipments(mappedShipments);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageShipment = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
    fetchOrdersAndShipments(); // Refresh data
  };

  const getShipmentForOrder = (orderId: string) => {
    return shipments.find((s) => s.order_id === orderId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
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
          <h1 className="text-3xl font-bold text-navy-800 mb-2">Manage Shipments</h1>
          <p className="text-gray-600">Manage shipping and tracking for your orders</p>
        </div>

        {orders.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Orders Yet</h3>
            <p className="text-gray-600">You don't have any orders to ship.</p>
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
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shipment Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const shipment = getShipmentForOrder(order.id);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </div>
                          {order.products && (
                            <div className="text-sm text-gray-500">{order.products.title}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(order.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {shipment ? (
                            <div>
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {shipment.status}
                              </span>
                              {shipment.tracking_number && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {shipment.tracking_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No shipment</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleManageShipment(order)}
                            className="text-amber-600 hover:text-amber-900 flex items-center justify-end"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shipment Form Modal */}
        {showModal && selectedOrder && (
          <SellerShipmentForm order={selectedOrder} onClose={handleCloseModal} />
        )}
      </div>
    </div>
  );
}
