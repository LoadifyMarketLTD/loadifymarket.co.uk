import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronRight, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { Order } from '../types';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Package; color: string }> = {
  pending:   { label: 'Pending',    icon: Clock,         color: 'text-yellow-400' },
  paid:      { label: 'Paid',       icon: CheckCircle,   color: 'text-blue-400' },
  packed:    { label: 'Packed',     icon: Package,       color: 'text-purple-400' },
  shipped:   { label: 'Shipped',    icon: Truck,         color: 'text-indigo-400' },
  delivered: { label: 'Delivered',  icon: CheckCircle,   color: 'text-green-400' },
  cancelled: { label: 'Cancelled',  icon: XCircle,       color: 'text-red-400' },
  refunded:  { label: 'Refunded',   icon: XCircle,       color: 'text-gray-400' },
};

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('buyerId', user.id)
          .order('createdAt', { ascending: false });
        if (error) throw error;
        setOrders(data || []);
      } catch (e) {
        console.error('Error fetching orders:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      <div className="container-cinematic py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-premium-sm bg-gold/10">
            <ShoppingBag className="w-7 h-7 text-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <p className="text-gray-400 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {['all', 'pending', 'paid', 'shipped', 'delivered', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-premium-sm text-sm font-medium transition-all duration-200 capitalize ${
                filter === s ? 'bg-gold text-jet' : 'bg-white text-white hover:bg-white/70'
              }`}
            >
              {s === 'all' ? 'All Orders' : s}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-glass text-center py-20">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
            <p className="text-gray-400 mb-6">Start shopping to see your orders here.</p>
            <Link to="/shop" className="btn-primary inline-flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="card-glass flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-gold/30 transition-all duration-200 group block"
                >
                  <div className="p-3 rounded-premium-sm bg-white/60 flex-shrink-0">
                    <Package className="w-8 h-8 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-white font-mono text-sm">{order.orderNumber}</span>
                      <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      Placed {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xl font-bold text-gold">£{order.total.toFixed(2)}</span>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gold transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
