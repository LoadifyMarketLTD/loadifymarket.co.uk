import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { User, Product, Order, Dispute } from '../types';
import { Users, Package, ShoppingBag, AlertCircle, CheckCircle, XCircle, DollarSign } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'orders' | 'disputes'>('overview');
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    pendingProducts: 0,
    totalOrders: 0,
    openDisputes: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false });

      setUsers(usersData || []);

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .order('createdAt', { ascending: false });

      setProducts(productsData || []);

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('createdAt', { ascending: false });

      setOrders(ordersData || []);

      // Fetch disputes
      const { data: disputesData } = await supabase
        .from('disputes')
        .select('*')
        .order('createdAt', { ascending: false });

      setDisputes(disputesData || []);

      // Calculate stats
      const sellers = (usersData || []).filter((u: User) => u.role === 'seller').length;
      const pending = (productsData || []).filter((p: Product) => !p.isApproved).length;
      const openDisp = (disputesData || []).filter((d: Dispute) => d.status === 'open').length;
      const revenue = (ordersData || []).reduce((sum: number, o: Order) => sum + o.commission, 0);

      setStats({
        totalUsers: usersData?.length || 0,
        totalSellers: sellers,
        pendingProducts: pending,
        totalOrders: ordersData?.length || 0,
        openDisputes: openDisp,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ isApproved: true })
        .eq('id', productId);

      if (error) throw error;
      alert('Product approved!');
      fetchData();
    } catch (error) {
      console.error('Error approving product:', error);
      alert('Failed to approve product');
    }
  };

  const rejectProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ isApproved: false, isActive: false })
        .eq('id', productId);

      if (error) throw error;
      alert('Product rejected!');
      fetchData();
    } catch (error) {
      console.error('Error rejecting product:', error);
      alert('Failed to reject product');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            {['overview', 'users', 'products', 'orders', 'disputes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`pb-4 px-2 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-navy-800 text-navy-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Users</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalUsers}</p>
                        <p className="text-sm text-gray-500 mt-1">({stats.totalSellers} sellers)</p>
                      </div>
                      <Users className="h-12 w-12 text-navy-800 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Pending Products</p>
                        <p className="text-3xl font-bold mt-1">{stats.pendingProducts}</p>
                      </div>
                      <Package className="h-12 w-12 text-orange-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Orders</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
                      </div>
                      <ShoppingBag className="h-12 w-12 text-blue-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Open Disputes</p>
                        <p className="text-3xl font-bold mt-1">{stats.openDisputes}</p>
                      </div>
                      <AlertCircle className="h-12 w-12 text-red-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Commission Revenue</p>
                        <p className="text-3xl font-bold mt-1">{formatPrice(stats.totalRevenue)}</p>
                        <p className="text-sm text-gray-500 mt-1">7% marketplace commission</p>
                      </div>
                      <DollarSign className="h-12 w-12 text-gold-500 opacity-20" />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card">
                    <h2 className="text-xl font-bold mb-4">Pending Product Approvals</h2>
                    {products.filter(p => !p.isApproved).length === 0 ? (
                      <p className="text-gray-600">No pending products</p>
                    ) : (
                      <div className="space-y-3">
                        {products.filter(p => !p.isApproved).slice(0, 5).map((product) => (
                          <div key={product.id} className="flex items-center justify-between border-b pb-3">
                            <div className="flex-1">
                              <p className="font-medium">{product.title}</p>
                              <p className="text-sm text-gray-600">{formatPrice(product.price)}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approveProduct(product.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-6 w-6" />
                              </button>
                              <button
                                onClick={() => rejectProduct(product.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-6 w-6" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h2 className="text-xl font-bold mb-4">Open Disputes</h2>
                    {disputes.filter(d => d.status === 'open').length === 0 ? (
                      <p className="text-gray-600">No open disputes</p>
                    ) : (
                      <div className="space-y-3">
                        {disputes.filter(d => d.status === 'open').slice(0, 5).map((dispute) => (
                          <div key={dispute.id} className="border-b pb-3">
                            <p className="font-medium">{dispute.subject}</p>
                            <p className="text-sm text-gray-600">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4">All Users</h2>
                <div className="space-y-3">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium">{u.firstName} {u.lastName}</p>
                        <p className="text-sm text-gray-600">{u.email}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          u.role === 'admin' ? 'bg-red-100 text-red-800' :
                          u.role === 'seller' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4">All Products</h2>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center space-x-4 flex-1">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded"></div>
                        )}
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-sm text-gray-600">{formatPrice(product.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          product.isApproved ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {product.isApproved ? 'Approved' : 'Pending'}
                        </span>
                        {!product.isApproved && (
                          <>
                            <button
                              onClick={() => approveProduct(product.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-6 w-6" />
                            </button>
                            <button
                              onClick={() => rejectProduct(product.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-6 w-6" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4">All Orders</h2>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.total)}</p>
                        <p className="text-xs text-gray-600">Commission: {formatPrice(order.commission)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4">All Disputes</h2>
                {disputes.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No disputes</p>
                ) : (
                  <div className="space-y-3">
                    {disputes.map((dispute) => (
                      <div key={dispute.id} className="border-b pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{dispute.subject}</p>
                            <p className="text-sm text-gray-600">{dispute.description}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            dispute.status === 'open' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {dispute.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
