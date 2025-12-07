import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { Product, Order, SellerProfile } from '../types';
import { Package, Plus, Edit, Eye, TrendingUp, DollarSign, User, AlertCircle } from 'lucide-react';

export default function SellerDashboardPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview');

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch seller profile
      const { data: profileData } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('userId', user.id)
        .single();

      setProfile(profileData);

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('sellerId', user.id)
        .order('createdAt', { ascending: false });

      setProducts(productsData || []);

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('sellerId', user.id)
        .order('createdAt', { ascending: false });

      setOrders(ordersData || []);

      // Calculate stats
      const activeProds = (productsData || []).filter((p: Product) => p.isActive).length;
      const totalRev = (ordersData || []).reduce((sum: number, o: Order) => sum + (o.total - o.commission), 0);
      const pending = (ordersData || []).filter((o: Order) => o.status === 'pending' || o.status === 'paid').length;

      setStats({
        totalProducts: productsData?.length || 0,
        activeProducts: activeProds,
        totalOrders: ordersData?.length || 0,
        totalRevenue: totalRev,
        pendingOrders: pending,
      });
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  if (!user || user.role !== 'seller') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Seller Access Required</h2>
          <p className="text-gray-600 mb-6">You need to be registered as a seller to access this page.</p>
          <Link to="/register?type=seller" className="btn-primary">
            Register as Seller
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <div className="flex space-x-3">
            <Link to="/seller/profile" className="btn-outline flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </Link>
            <Link to="/seller/products/new" className="btn-primary flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add Product</span>
            </Link>
          </div>
        </div>

        {/* Profile Completeness Alert */}
        {profile && (profile.profileCompleteness || 0) < 75 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <p className="font-medium text-yellow-800">Complete your profile</p>
                <p className="text-sm text-yellow-700">
                  Your profile is {profile.profileCompleteness || 0}% complete. Complete at least 75% to publish products.
                </p>
              </div>
            </div>
            <Link to="/seller/profile" className="btn-secondary text-sm">
              Complete Profile
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-navy-800 text-navy-800'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'products'
                  ? 'border-b-2 border-navy-800 text-navy-800'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Products ({stats.totalProducts})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'border-b-2 border-navy-800 text-navy-800'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Orders ({stats.totalOrders})
            </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Products</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalProducts}</p>
                      </div>
                      <Package className="h-12 w-12 text-navy-800 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Active Products</p>
                        <p className="text-3xl font-bold mt-1">{stats.activeProducts}</p>
                      </div>
                      <Eye className="h-12 w-12 text-green-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Orders</p>
                        <p className="text-3xl font-bold mt-1">{stats.totalOrders}</p>
                      </div>
                      <TrendingUp className="h-12 w-12 text-blue-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Revenue</p>
                        <p className="text-3xl font-bold mt-1">{formatPrice(stats.totalRevenue)}</p>
                      </div>
                      <DollarSign className="h-12 w-12 text-gold-500 opacity-20" />
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="card">
                  <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
                  {orders.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No orders yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">Order #{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatPrice(order.total)}</p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">My Products</h2>
                  <Link to="/seller/products/new" className="btn-primary">
                    Add New Product
                  </Link>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600 mb-4">You haven't added any products yet.</p>
                    <Link to="/seller/products/new" className="btn-primary">
                      Create Your First Product
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center space-x-4">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.title}</p>
                            <p className="text-sm text-gray-600">
                              {formatPrice(product.price)} | Stock: {product.stockQuantity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <Link
                            to={`/seller/products/${product.id}/edit`}
                            className="btn-outline text-sm py-1 px-3"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-4">My Orders</h2>
                {orders.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No orders yet.</p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="border-b pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">Order #{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatPrice(order.total)}</p>
                            <p className="text-xs text-gray-600">
                              Your earning: {formatPrice(order.total - order.commission)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'paid' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                          <Link to={`/orders/${order.id}`} className="text-sm text-navy-800 hover:underline">
                            View Details
                          </Link>
                        </div>
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
