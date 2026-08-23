import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { hasSellerAccess } from '../lib/roleUtils';
import { getDisplayName } from '../lib/displayName';
import type { Product, Order, SellerProfile, DeliveryRequest, SellerBalance, Payout } from '../types';
import { buildXDriveAppUrl } from '../lib/transportQuote';
import { Package, Plus, Edit, Eye, TrendingUp, DollarSign, User, AlertCircle, BarChart3, Truck, ExternalLink, Clock, CreditCard, CheckCircle, Store, ShoppingBag } from 'lucide-react';

const DELIVERY_REQUESTS_KEY = 'loadify_delivery_requests';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  in_review: 'In Review',
  quoted: 'Quoted',
  accepted: 'Accepted',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-white/70',
  submitted: 'bg-blue-500/15 text-blue-400',
  in_review: 'bg-yellow-500/15 text-yellow-400',
  quoted: 'bg-purple-500/15 text-purple-400',
  accepted: 'bg-green-500/15 text-green-400',
  in_transit: 'bg-orange-500/15 text-orange-400',
  delivered: 'bg-emerald-500/15 text-emerald-400',
  cancelled: 'bg-red-500/15 text-red-400',
};

export default function SellerDashboardPage() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'products' | 'orders' | 'deliveries' | 'payouts'>('overview');
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>([]);
  const [sellerBalance, setSellerBalance] = useState<SellerBalance | null>(null);
  const [sellerPayouts, setSellerPayouts] = useState<Payout[]>([]);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [platformNotConfigured, setPlatformNotConfigured] = useState(false);

  const [searchParams] = useSearchParams();

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

      // Fetch store slug for public store link
      const { data: storeData } = await supabase
        .from('seller_stores')
        .select('storeSlug')
        .eq('userId', user.id)
        .maybeSingle();
      setStoreSlug(storeData?.storeSlug || null);

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
      const totalRev = (ordersData || []).reduce((sum: number, o: Order) => sum + (o.total - (o.commission ?? 0)), 0);
      const pending = (ordersData || []).filter((o: Order) => o.status === 'pending' || o.status === 'paid').length;

      setStats({
        totalProducts: productsData?.length || 0,
        activeProducts: activeProds,
        totalOrders: ordersData?.length || 0,
        totalRevenue: totalRev,
        pendingOrders: pending,
      });

      // Fetch seller balance
      const { data: balanceData } = await supabase
        .from('seller_balance')
        .select('*')
        .eq('sellerId', user.id)
        .maybeSingle();
      setSellerBalance(balanceData || null);

      // Fetch Stripe Connect payout records (automatic transfers via Connect)
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .eq('sellerId', user.id)
        .order('createdAt', { ascending: false });
      setSellerPayouts(payoutsData || []);
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchData();
      // Load delivery requests for this seller from localStorage
      try {
        const all: DeliveryRequest[] = JSON.parse(
          localStorage.getItem(DELIVERY_REQUESTS_KEY) || '[]',
        );
        // Show requests where sellerId matches OR where the listing belongs to
        // this seller's products (identified by listingId in products list).
        // For now, filter by sellerId since it's embedded in the request.
        const mine = all.filter((r) => r.sellerId === user.id);
        setDeliveryRequests(mine);
      } catch {
        setDeliveryRequests([]);
      }
    }
  }, [user, fetchData]);

  // ── Stripe Connect URL-param handling ──────────────────────────────────────
  // When Stripe redirects the seller back after onboarding (?connect=success
  // or ?connect=refresh) auto-switch to the Payouts tab and sync the fresh
  // account status from Stripe into the DB.
  const syncConnectStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch('/.netlify/functions/connect-status', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await fetchData();
    } catch {
      // Silent — status will be re-synced next time the tab is opened.
    }
  }, [fetchData]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const connectParam = searchParams.get('connect');
    if (tabParam === 'payouts' || connectParam === 'success' || connectParam === 'refresh') {
      setActiveTab('payouts');
      if (connectParam === 'success' || connectParam === 'refresh') {
        syncConnectStatus();
      }
    }
  }, [searchParams, syncConnectStatus]);
  // ───────────────────────────────────────────────────────────────────────────

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  // ── Stripe Connect action handlers ─────────────────────────────────────────
  const handleConnectStripe = async () => {
    setConnectError('');
    setConnectLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch('/.netlify/functions/connect-onboard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503 || data.platformNotConfigured) {
          setPlatformNotConfigured(true);
          setConnectLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to start onboarding');
      }
      window.location.href = data.url;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect Stripe account');
      setConnectLoading(false);
    }
  };

  const handleViewStripeDashboard = async () => {
    setConnectError('');
    setConnectLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const response = await fetch('/.netlify/functions/connect-dashboard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 503 || data.platformNotConfigured) {
          setPlatformNotConfigured(true);
          setConnectLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to open dashboard');
      }
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to open Stripe dashboard');
    } finally {
      setConnectLoading(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  if (!user || !hasSellerAccess(user)) {
    return (
      <div className="container-cinematic py-8">
        <div className="card-glass text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Seller Access Required</h2>
          <p className="text-white/60 mb-6">You need to be registered as a seller to access this page.</p>
          <Link to="/register?type=seller" className="btn-primary">
            Register as Seller
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jet min-h-screen pt-24">
      <div className="container-cinematic py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {getDisplayName(user, profile)}
          </h1>
          <div className="flex space-x-3">
            <Link to="/seller/profile" className="btn-secondary flex items-center space-x-2">
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
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-3" />
              <div>
                <p className="font-medium text-yellow-400">Complete your profile</p>
                <p className="text-sm text-yellow-400/80">
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
        <div className="mb-6 border-b border-white/10">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'products'
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Products ({stats.totalProducts})
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-4 px-2 font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Orders ({stats.totalOrders})
            </button>
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`pb-4 px-2 font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'deliveries'
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Truck className="h-4 w-4" />
              Deliveries
              {deliveryRequests.length > 0 && (
                <span className="ml-1 bg-amber-500/15 text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {deliveryRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`pb-4 px-2 font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'payouts'
                  ? 'border-b-2 border-gold text-gold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Payouts
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white/50">Loading...</div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="card-glass">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Total Products</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.totalProducts}</p>
                      </div>
                      <Package className="h-12 w-12 text-gold/40" />
                    </div>
                  </div>

                  <div className="card-glass">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Active Products</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.activeProducts}</p>
                      </div>
                      <Eye className="h-12 w-12 text-green-400/40" />
                    </div>
                  </div>

                  <div className="card-glass">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Total Orders</p>
                        <p className="text-3xl font-bold text-white mt-1">{stats.totalOrders}</p>
                      </div>
                      <TrendingUp className="h-12 w-12 text-blue-400/40" />
                    </div>
                  </div>

                  <div className="card-glass">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-sm">Total Revenue</p>
                        <p className="text-3xl font-bold text-white mt-1">{formatPrice(stats.totalRevenue)}</p>
                      </div>
                      <DollarSign className="h-12 w-12 text-gold/40" />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="card-glass mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <Link
                      to="/seller/products/new"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/40 transition-all text-center group"
                    >
                      <Plus className="h-7 w-7 text-gold group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-white/80 group-hover:text-white font-medium">Add Product</span>
                    </Link>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-400/40 transition-all text-center group"
                    >
                      <ShoppingBag className="h-7 w-7 text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-white/80 group-hover:text-white font-medium">View Orders</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('payouts')}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-green-500/10 border border-white/10 hover:border-green-400/40 transition-all text-center group"
                    >
                      <DollarSign className="h-7 w-7 text-green-400 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-white/80 group-hover:text-white font-medium">View Payouts</span>
                    </button>
                    <Link
                      to="/transport-quote"
                      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-400/40 transition-all text-center group"
                    >
                      <Truck className="h-7 w-7 text-purple-400 group-hover:scale-110 transition-transform" />
                      <span className="text-sm text-white/80 group-hover:text-white font-medium">Request Transport</span>
                    </Link>
                    {storeSlug ? (
                      <Link
                        to={`/seller/${storeSlug}`}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-400/40 transition-all text-center group"
                      >
                        <Store className="h-7 w-7 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-white/80 group-hover:text-white font-medium">View Public Store</span>
                      </Link>
                    ) : (
                      <Link
                        to="/seller/profile"
                        className="flex flex-col items-center gap-2 p-4 rounded-lg bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-400/40 transition-all text-center group"
                      >
                        <Store className="h-7 w-7 text-amber-400/50 group-hover:scale-110 transition-transform" />
                        <span className="text-sm text-white/50 group-hover:text-white font-medium">Set Up Store</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="card-glass">
                  <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
                  {orders.length === 0 ? (
                    <p className="text-white/60 text-center py-8">No orders yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div>
                            <p className="font-medium">Order #{order.orderNumber}</p>
                            <p className="text-sm text-white/60">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatPrice(order.total)}</p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              order.status === 'delivered' ? 'bg-green-500/15 text-green-400' :
                              order.status === 'shipped' ? 'bg-blue-500/15 text-blue-400' :
                              order.status === 'paid' ? 'bg-yellow-500/15 text-yellow-400' :
                              'bg-white/10 text-white'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* XDrive Transport Support Note */}
                <div className="card-glass mt-6 border-l-4 border-l-gold/50 bg-gold/5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Truck className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm mb-1">
                          Need help moving sold stock or pallet deals?
                        </p>
                        <p className="text-sm text-white/60">
                          Transport support is available via XDrive Logistics for collection and
                          delivery of pallet deals, wholesale orders, and bulk stock.
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/transport-quote"
                      className="btn-secondary text-xs px-3 py-2 flex-shrink-0 flex items-center gap-1"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Request Delivery Support
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Sales Analytics</h2>
                  <p className="text-white/60">Track your sales performance over time</p>
                </div>

                {/* Time Period Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="card-glass">
                    <div className="flex items-center mb-2">
                      <BarChart3 className="h-5 w-5 text-gold mr-2" />
                      <h3 className="font-semibold text-sm text-white/60">Last 30 Days</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-white/50">Sales</p>
                        <p className="text-2xl font-bold">
                          {formatPrice(
                            orders
                              .filter((o) => {
                                const orderDate = new Date(o.createdAt);
                                const thirtyDaysAgo = new Date();
                                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                return orderDate >= thirtyDaysAgo;
                              })
                              .reduce((sum, o) => sum + (o.total - o.commission), 0)
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Orders</p>
                        <p className="text-xl font-bold">
                          {
                            orders.filter((o) => {
                              const orderDate = new Date(o.createdAt);
                              const thirtyDaysAgo = new Date();
                              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                              return orderDate >= thirtyDaysAgo;
                            }).length
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="card-glass">
                    <div className="flex items-center mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                      <h3 className="font-semibold text-sm text-white/60">All Time</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-white/50">Total Sales</p>
                        <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Total Orders</p>
                        <p className="text-xl font-bold">{stats.totalOrders}</p>
                      </div>
                    </div>
                  </div>

                  <div className="card-glass">
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-5 w-5 text-gold-500 mr-2" />
                      <h3 className="font-semibold text-sm text-white/60">Average Order Value</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-white/50">Per Order</p>
                        <p className="text-2xl font-bold">
                          {stats.totalOrders > 0
                            ? formatPrice(stats.totalRevenue / stats.totalOrders)
                            : formatPrice(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                <div className="card-glass mb-8">
                  <h3 className="text-xl font-bold text-white mb-4">Top 5 Products by Revenue</h3>
                  {(() => {
                    // Calculate revenue per product
                    const productRevenue: Record<string, { product: Product; revenue: number; orderCount: number }> = {};
                    
                    orders.forEach((order) => {
                      if (!productRevenue[order.productId]) {
                        const product = products.find((p) => p.id === order.productId);
                        if (product) {
                          productRevenue[order.productId] = {
                            product,
                            revenue: 0,
                            orderCount: 0,
                          };
                        }
                      }
                      
                      if (productRevenue[order.productId]) {
                        productRevenue[order.productId].revenue += order.total - order.commission;
                        productRevenue[order.productId].orderCount += 1;
                      }
                    });

                    // Sort by revenue and take top 5
                    const topProducts = Object.values(productRevenue)
                      .sort((a, b) => b.revenue - a.revenue)
                      .slice(0, 5);

                    if (topProducts.length === 0) {
                      return (
                        <p className="text-white/60 text-center py-8">
                          No sales data available yet. Start selling to see analytics!
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {topProducts.map(({ product, revenue, orderCount }, index) => (
                          <div key={product.id} className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-navy-100 text-gold font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{product.title}</p>
                                <p className="text-sm text-white/60">{orderCount} orders</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatPrice(revenue)}</p>
                              <p className="text-sm text-white/60">revenue</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Simple Sales Chart - using text-based visualization */}
                <div className="card-glass">
                  <h3 className="text-xl font-bold text-white mb-4">Sales Trend (Last 7 Days)</h3>
                  {(() => {
                    // Group orders by date for last 7 days
                    const last7Days: { date: string; revenue: number; orders: number }[] = [];
                    
                    for (let i = 6; i >= 0; i--) {
                      const date = new Date();
                      date.setDate(date.getDate() - i);
                      const dateStr = date.toISOString().split('T')[0];
                      
                      const dayOrders = orders.filter((o) => {
                        const orderDate = o.createdAt.split('T')[0];
                        return orderDate === dateStr;
                      });

                      last7Days.push({
                        date: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
                        revenue: dayOrders.reduce((sum, o) => sum + (o.total - o.commission), 0),
                        orders: dayOrders.length,
                      });
                    }

                    const maxRevenue = Math.max(...last7Days.map((d) => d.revenue), 1);

                    return (
                      <div className="space-y-3">
                        {last7Days.map((day) => (
                          <div key={day.date}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{day.date}</span>
                              <span className="text-sm text-white/60">
                                {formatPrice(day.revenue)} ({day.orders} orders)
                              </span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-6">
                              <div
                                className="bg-navy-800 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                                style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                              >
                                {day.revenue > 0 && (
                                  <span className="text-xs text-white font-medium">
                                    {formatPrice(day.revenue)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="card-glass">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">My Products</h2>
                  <Link to="/seller/products/new" className="btn-primary flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add New Product</span>
                  </Link>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto text-white/40 mb-4" />
                    <p className="text-white/60 mb-4">You haven't added any products yet.</p>
                    <Link to="/seller/products/new" className="btn-primary">
                      Create Your First Product
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between border-b border-white/10 pb-3 hover:bg-white/5 p-2 rounded transition-colors">
                        <div className="flex items-center space-x-4">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-white/10 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-white/40" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.title}</p>
                            <p className="text-sm text-white/60">
                              {formatPrice(product.price)} | Stock: {product.stockQuantity} | Views: {product.views}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                product.isActive ? 'bg-green-500/15 text-green-400' : 'bg-white/10 text-white'
                              }`}>
                                {product.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                product.isApproved ? 'bg-blue-500/15 text-blue-400' : 'bg-yellow-500/15 text-yellow-400'
                              }`}>
                                {product.isApproved ? 'Approved' : 'Pending Approval'}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                {product.type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            to={`/product/${product.id}`}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded"
                            title="View product"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            to={`/seller/products/${product.id}/edit`}
                            className="p-2 text-green-400 hover:bg-green-500/10 rounded"
                            title="Edit product"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to delete this product?')) return;
                              
                              try {
                                const { error } = await supabase
                                  .from('products')
                                  .delete()
                                  .eq('id', product.id);
                                
                                if (error) throw error;
                                alert('Product deleted successfully!');
                                fetchData();
                              } catch (error) {
                                console.error('Error deleting product:', error);
                                alert('Failed to delete product');
                              }
                            }}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                            title="Delete product"
                          >
                            <Package className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="card-glass">
                <h2 className="text-xl font-bold text-white mb-4">My Orders</h2>
                {orders.length === 0 ? (
                  <p className="text-white/60 text-center py-8">No orders yet.</p>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="border-b border-white/10 pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">Order #{order.orderNumber}</p>
                            <p className="text-sm text-white/60">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatPrice(order.total)}</p>
                            <p className="text-xs text-white/60">
                              Your earning: {formatPrice(order.total - order.commission)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'delivered' ? 'bg-green-500/15 text-green-400' :
                            order.status === 'shipped' ? 'bg-blue-500/15 text-blue-400' :
                            order.status === 'paid' ? 'bg-yellow-500/15 text-yellow-400' :
                            'bg-white/10 text-white'
                          }`}>
                            {order.status}
                          </span>
                          <Link to={`/orders/${order.id}`} className="text-sm text-gold hover:underline">
                            View Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deliveries Tab */}
            {activeTab === 'deliveries' && (
              <div>
                <div className="card-glass mb-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Truck className="h-5 w-5 text-amber-500" />
                        Delivery Requests
                      </h2>
                      <p className="text-sm text-white/50 mt-0.5">
                        Transport requests created from your Loadify listings via XDrive Logistics.
                      </p>
                    </div>
                    <Link
                      to="/transport-quote"
                      className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      New Request
                    </Link>
                  </div>

                  {deliveryRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <Truck className="h-14 w-14 mx-auto text-gray-300 mb-4" />
                      <p className="text-white/60 mb-2 font-medium">No delivery requests yet</p>
                      <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto">
                        When a buyer requests transport for one of your listings, it will appear here.
                      </p>
                      <Link to="/transport-quote" className="btn-primary text-sm">
                        Request Delivery Support
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deliveryRequests.map((req) => {
                        const xdriveUrl = buildXDriveAppUrl({
                          source: 'loadify-market',
                          ref: req.id,
                          listing: req.listingId,
                          title: req.listingTitle,
                          pickup: req.pickupPostcode,
                          dropoff: req.dropoffPostcode,
                          pallets: req.palletCount,
                          weight: req.weight,
                          seller: req.sellerId,
                          sellerName: req.sellerName,
                        });
                        return (
                          <div key={req.id} className="border border-gray-100 rounded-lg p-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <p className="font-semibold text-sm truncate">{req.listingTitle || req.itemType || '—'}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status] || 'bg-white/10 text-white/70'}`}>
                                    {STATUS_LABELS[req.status] || req.status}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/50 mb-2">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(req.createdAt).toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                  {req.pickupPostcode && <span>Pickup: {req.pickupPostcode}</span>}
                                  {req.dropoffPostcode && <span>→ {req.dropoffPostcode}</span>}
                                  {req.palletCount && <span>{req.palletCount} pallets</span>}
                                </div>
                                <p className="text-xs text-white/40">Ref: {req.id}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {req.listingId && (
                                  <Link
                                    to={`/product/${req.listingId}`}
                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View listing
                                  </Link>
                                )}
                                <a
                                  href={xdriveUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1 font-medium"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Open in XDrive
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* XDrive info panel */}
                <div className="card border-l-4 border-l-amber-400 bg-amber-50/50">
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">Transport powered by XDrive Logistics</p>
                      <p className="text-sm text-white/60 mb-3">
                        All delivery requests from Loadify Market are handled by XDrive Logistics Ltd.
                        Open the XDrive app to track progress, accept quotes and manage in-transit orders.
                      </p>
                      <a
                        href={buildXDriveAppUrl({ source: 'loadify-market' })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open XDrive Logistics App
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Payouts</h2>
                  <p className="text-white/60">Track your earnings and manage your Stripe payout account.</p>
                </div>

                {/* Balance cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="card-glass">
                    <p className="text-sm text-white/50 mb-1">Total Sales</p>
                    <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
                    <p className="text-xs text-white/40 mt-1">Gross revenue (excl. VAT)</p>
                  </div>
                  <div className="card-glass">
                    <p className="text-sm text-white/50 mb-1">Platform Fee (7%)</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatPrice(orders.reduce((s, o) => s + (o.commission ?? 0), 0))}
                    </p>
                    <p className="text-xs text-white/40 mt-1">Deducted automatically</p>
                  </div>
                  <div className="card-glass">
                    <p className="text-sm text-white/50 mb-1">Available Balance</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(sellerBalance?.availableAmount ?? 0)}
                    </p>
                    <p className="text-xs text-white/40 mt-1">Ready to withdraw</p>
                  </div>
                  <div className="card-glass">
                    <p className="text-sm text-white/50 mb-1">Pending Payouts</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatPrice(sellerBalance?.pendingAmount ?? 0)}
                    </p>
                    <p className="text-xs text-white/40 mt-1">In transit to your bank</p>
                  </div>
                </div>

                {/* ── Stripe Connect Panel ──────────────────────────────── */}
                <div className="card-glass">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gold" />
                    Stripe Connect
                  </h3>

                  {connectError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {connectError}
                    </div>
                  )}

                  {/* Platform temporarily unavailable: show dismissable notice with retry */}
                  {platformNotConfigured && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-300">Stripe Connect Temporarily Unavailable</p>
                          <p className="text-sm text-yellow-300/70 mt-0.5">
                            Payouts are being configured. If this persists after a few minutes, please contact support.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setPlatformNotConfigured(false); handleConnectStripe(); }}
                        disabled={connectLoading}
                        className="btn-primary flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        {connectLoading ? 'Connecting…' : 'Try Again'}
                      </button>
                    </div>
                  )}

                  {/* State A: Not connected */}
                  {!platformNotConfigured && !profile?.stripeAccountId && (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-4">
                        <CreditCard className="h-8 w-8 text-white/40" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Connect Your Stripe Account</h4>
                      <p className="text-white/60 mb-6 max-w-md mx-auto text-sm">
                        Connect a Stripe account to receive automatic payouts after every sale.
                        The platform commission (7%) is deducted automatically — no admin approval needed.
                      </p>
                      <button
                        onClick={handleConnectStripe}
                        disabled={connectLoading}
                        className="btn-primary flex items-center gap-2 mx-auto"
                      >
                        <CreditCard className="h-4 w-4" />
                        {connectLoading ? 'Connecting…' : 'Connect Stripe Account'}
                      </button>
                    </div>
                  )}

                  {/* State B: Pending / Incomplete */}
                  {profile?.stripeAccountId && profile?.stripeConnectStatus === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-400">Setup Incomplete</p>
                          <p className="text-sm text-yellow-400/80 mt-0.5">
                            Your Stripe account setup is not complete. Finish onboarding to start receiving automatic payouts.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleConnectStripe}
                        disabled={connectLoading}
                        className="btn-primary flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {connectLoading ? 'Loading…' : 'Continue Stripe Setup'}
                      </button>
                    </div>
                  )}

                  {/* State C: Restricted */}
                  {profile?.stripeAccountId && profile?.stripeConnectStatus === 'restricted' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-orange-800">Action Required</p>
                          <p className="text-sm text-orange-700 mt-0.5">
                            Your Stripe account has restrictions. Complete verification to ensure uninterrupted payouts.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={handleConnectStripe}
                          disabled={connectLoading}
                          className="btn-primary flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {connectLoading ? 'Loading…' : 'Complete Verification'}
                        </button>
                        <button
                          onClick={handleViewStripeDashboard}
                          disabled={connectLoading}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          View Stripe Dashboard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* State D: Active */}
                  {profile?.stripeAccountId && profile?.stripeConnectStatus === 'active' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-green-800">Stripe Connect Active</p>
                          <p className="text-sm text-green-700 mt-0.5">
                            Your account is fully connected. Payouts are sent automatically every Friday.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleViewStripeDashboard}
                        disabled={connectLoading}
                        className="btn-primary flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {connectLoading ? 'Loading…' : 'View Stripe Dashboard'}
                      </button>
                      <p className="text-xs text-white/40 font-mono">{profile.stripeAccountId}</p>
                    </div>
                  )}
                </div>
                {/* ──────────────────────────────────────────────────────── */}

                {/* Payout History */}
                <div className="card-glass">
                  <h3 className="text-lg font-semibold mb-4">Payout History</h3>
                  {sellerPayouts.length === 0 ? (
                    <p className="text-white/50 text-center py-6">No payout records yet. Payouts will appear here once Stripe Connect transfers begin.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-white/50">
                            <th className="pb-2 pr-4">Date</th>
                            <th className="pb-2 pr-4">Amount</th>
                            <th className="pb-2 pr-4">Status</th>
                            <th className="pb-2">Transfer ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sellerPayouts.map((p) => (
                            <tr key={p.id} className="border-b border-white/10 last:border-0">
                              <td className="py-2 pr-4 text-white/60">
                                {new Date(p.createdAt).toLocaleDateString('en-GB')}
                              </td>
                              <td className="py-2 pr-4 font-medium">{formatPrice(p.amount)}</td>
                              <td className="py-2 pr-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  p.status === 'paid'       ? 'bg-green-500/15 text-green-400' :
                                  p.status === 'processing' ? 'bg-blue-500/15 text-blue-400' :
                                  p.status === 'failed'     ? 'bg-red-500/15 text-red-400' :
                                  'bg-yellow-500/15 text-yellow-400'
                                }`}>
                                  {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                                </span>
                              </td>
                              <td className="py-2 text-white/40 font-mono text-xs truncate max-w-[140px]">
                                {p.stripeTransferId ?? p.stripePayoutId ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
