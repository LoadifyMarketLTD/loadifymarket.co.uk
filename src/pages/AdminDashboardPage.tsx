import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { hasAdminAccess } from '../lib/roleUtils';
import { getDisplayName } from '../lib/displayName';
import { formatPrice } from '../lib/formatPrice';
import type { User, Product, Order, Dispute, PayoutRequest } from '../types';
import { Users, Package, ShoppingBag, AlertCircle, CheckCircle, XCircle, DollarSign, Download, Settings, TrendingUp, CreditCard, Send } from 'lucide-react';
import { 
  exportToCSV, 
  prepareOrdersExport, 
  prepareSalesExport, 
  prepareCommissionExport, 
  prepareVATExport,
  prepareProductsExport,
  prepareUsersExport 
} from '../lib/exportUtils';

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'users' | 'products' | 'orders' | 'disputes' | 'payouts' | 'exports'>('overview');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('30days');

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  // Inline rejection form state: maps request ID → rejection note text
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Resend verification email state
  const [resendingVerification, setResendingVerification] = useState<string | null>(null);
  const [resendToast, setResendToast] = useState<{ userId: string; message: string; ok: boolean } | null>(null);

  // Stripe Connect platform status — checked when the payouts tab is opened.
  const [connectPlatformStatus, setConnectPlatformStatus] = useState<{
    checked: boolean;
    platformConfigured: boolean | null;
    keyPrefix?: string;
    platformAccountId?: string | null;
    setupUrl?: string;
    error?: string;
  }>({ checked: false, platformConfigured: null });

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    pendingProducts: 0,
    totalOrders: 0,
    openDisputes: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    // Wait for auth state to settle before acting
    if (isLoading) return;

    if (hasAdminAccess(user)) {
      fetchData();
    } else {
      // Not an admin — stop the loading spinner so the access-denied UI shows immediately
      setLoading(false);
    }
  }, [user, isLoading]);

  // Check the Stripe Connect platform status whenever the payouts tab is opened.
  useEffect(() => {
    if (activeTab !== 'payouts' || connectPlatformStatus.checked) return;
    if (!hasAdminAccess(user)) return;

    const checkConnectStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const response = await fetch('/.netlify/functions/connect-platform-check', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await response.json();
        if (!response.ok) {
          setConnectPlatformStatus({
            checked: true,
            platformConfigured: null,
            error: data.error || 'Failed to check Connect status',
          });
        } else {
          setConnectPlatformStatus({ checked: true, ...data });
        }
      } catch {
        setConnectPlatformStatus({ checked: true, platformConfigured: null, error: 'Failed to reach Connect check endpoint' });
      }
    };

    checkConnectStatus();
  }, [activeTab, connectPlatformStatus.checked, user]);

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

      // Fetch payout requests
      const { data: payoutData } = await supabase
        .from('payout_requests')
        .select('*')
        .order('createdAt', { ascending: false });

      setPayoutRequests(payoutData || []);

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

      await supabase.rpc('log_admin_action', {
        p_action: 'approve_product',
        p_table_name: 'products',
        p_record_id: productId,
        p_new_data: { isApproved: true },
      });

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

      await supabase.rpc('log_admin_action', {
        p_action: 'reject_product',
        p_table_name: 'products',
        p_record_id: productId,
        p_new_data: { isApproved: false, isActive: false },
      });

      alert('Product rejected!');
      fetchData();
    } catch (error) {
      console.error('Error rejecting product:', error);
      alert('Failed to reject product');
    }
  };

  const deactivateProduct = async (productId: string) => {
    if (!confirm('Deactivate this listing?')) return;
    try {
      const { error } = await supabase
        .from('products')
        .update({ isActive: false })
        .eq('id', productId);
      if (error) throw error;
      await supabase.rpc('log_admin_action', {
        p_action: 'deactivate_product',
        p_table_name: 'products',
        p_record_id: productId,
        p_new_data: { isActive: false },
      });
      alert('Listing deactivated.');
      fetchData();
    } catch (err) {
      console.error('Error deactivating product:', err);
      alert('Failed to deactivate listing.');
    }
  };

  const handleApprovePayout = async (requestId: string) => {
    if (!confirm('Approve this payout request?')) return;
    try {
      const { error } = await supabase.rpc('approve_payout', { p_request_id: requestId });
      if (error) throw error;
      alert('Payout approved.');
      fetchData();
    } catch (err) {
      console.error('Error approving payout:', err);
      alert(err instanceof Error ? err.message : 'Failed to approve payout.');
    }
  };

  const handleCompletePayout = async (requestId: string) => {
    if (!confirm('Mark this payout as completed (funds sent)?')) return;
    try {
      const { error } = await supabase.rpc('complete_payout', { p_request_id: requestId });
      if (error) throw error;
      alert('Payout marked as completed.');
      fetchData();
    } catch (err) {
      console.error('Error completing payout:', err);
      alert(err instanceof Error ? err.message : 'Failed to complete payout.');
    }
  };

  const handleRejectPayout = async (requestId: string) => {
    const notes = rejectNotes[requestId] || undefined;
    if (!confirm('Reject this payout request? The amount will be returned to the seller\'s available balance.')) return;
    try {
      const { error } = await supabase.rpc('reject_payout', {
        p_request_id: requestId,
        p_notes: notes ?? null,
      });
      if (error) throw error;
      setRejectingId(null);
      setRejectNotes((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
      alert('Payout rejected and balance restored.');
      fetchData();
    } catch (err) {
      console.error('Error rejecting payout:', err);
      alert(err instanceof Error ? err.message : 'Failed to reject payout.');
    }
  };

  // Export functions
  const handleExportOrders = () => {
    const data = prepareOrdersExport(orders);
    exportToCSV(data, `orders-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportSales = () => {
    const data = prepareSalesExport(orders);
    exportToCSV(data, `sales-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportCommissions = () => {
    const data = prepareCommissionExport(orders);
    exportToCSV(data, `commissions-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportVAT = () => {
    const data = prepareVATExport(orders);
    exportToCSV(data, `vat-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportProducts = () => {
    const data = prepareProductsExport(products);
    exportToCSV(data, `products-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportUsers = () => {
    const data = prepareUsersExport(users);
    exportToCSV(data, `users-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ isActive: false })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action: 'suspend_user',
        p_table_name: 'users',
        p_record_id: userId,
        p_new_data: { isActive: false },
      });

      alert('User suspended successfully');
      fetchData();
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ isActive: true })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action: 'activate_user',
        p_table_name: 'users',
        p_record_id: userId,
        p_new_data: { isActive: true },
      });

      alert('User activated successfully');
      fetchData();
    } catch (error) {
      console.error('Error activating user:', error);
      alert('Failed to activate user');
    }
  };

  const handleResendVerification = async (targetUserId: string) => {
    if (!user?.id) return;
    setResendingVerification(targetUserId);
    setResendToast(null);
    try {
      const res = await fetch('/.netlify/functions/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, adminId: user.id }),
      });
      const json = await res.json();
      setResendToast({
        userId: targetUserId,
        message: res.ok ? (json.message || 'Verification email sent') : (json.error || 'Failed to send'),
        ok: res.ok,
      });
    } catch (err) {
      setResendToast({ userId: targetUserId, message: 'Network error', ok: false });
    } finally {
      setResendingVerification(null);
      setTimeout(() => setResendToast(null), 5000);
    }
  };

  if (!user || !hasAdminAccess(user)) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen pt-24">
        <div className="container-cinematic py-10">
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h2>
            <p className="text-gray-500">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      <div className="container-cinematic py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Welcome back, {getDisplayName(user)}
        </h1>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {['overview', 'analytics', 'users', 'products', 'orders', 'disputes', 'payouts', 'exports'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`pb-3 px-4 text-sm font-medium transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-b-2 border-[#1E3A5F] text-[#1E3A5F]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
                        <p className="text-sm text-gray-400 mt-1">({stats.totalSellers} sellers)</p>
                      </div>
                      <Users className="h-10 w-10 text-[#F4C400]/60" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Pending Products</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingProducts}</p>
                      </div>
                      <Package className="h-10 w-10 text-orange-400/40" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Total Orders</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalOrders}</p>
                      </div>
                      <ShoppingBag className="h-10 w-10 text-blue-400/40" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Open Disputes</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.openDisputes}</p>
                      </div>
                      <AlertCircle className="h-10 w-10 text-red-400/40" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm">Commission Revenue</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{formatPrice(stats.totalRevenue)}</p>
                        <p className="text-sm text-gray-400 mt-1">7% marketplace commission</p>
                      </div>
                      <DollarSign className="h-10 w-10 text-[#F4C400]/60" />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Product Approvals</h2>
                    {products.filter(p => !p.isApproved).length === 0 ? (
                      <p className="text-gray-400">No pending products</p>
                    ) : (
                      <div className="space-y-3">
                        {products.filter(p => !p.isApproved).slice(0, 5).map((product) => (
                          <div key={product.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{product.title}</p>
                              <p className="text-sm text-gray-500">{formatPrice(product.price)}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => approveProduct(product.id)}
                                className="text-green-400 hover:text-green-300"
                              >
                                <CheckCircle className="h-6 w-6" />
                              </button>
                              <button
                                onClick={() => rejectProduct(product.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <XCircle className="h-6 w-6" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Open Disputes</h2>
                    {disputes.filter(d => d.status === 'open').length === 0 ? (
                      <p className="text-gray-400">No open disputes</p>
                    ) : (
                      <div className="space-y-3">
                        {disputes.filter(d => d.status === 'open').slice(0, 5).map((dispute) => (
                          <div key={dispute.id} className="border-b border-gray-200 pb-3">
                            <p className="font-medium text-gray-900">{dispute.subject}</p>
                            <p className="text-sm text-gray-500">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h2>
                    <div className="space-y-2">
                      <Link to="/admin/sellers" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <p className="font-medium text-gray-900">Manage Sellers</p>
                        <p className="text-sm text-gray-500">{stats.totalSellers} sellers registered</p>
                      </Link>
                      <Link to="/admin/categories" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <p className="font-medium text-gray-900">Manage Categories</p>
                        <p className="text-sm text-gray-500">Edit marketplace categories</p>
                      </Link>
                      <Link to="/admin/reported-listings" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                        <p className="font-medium text-gray-900">Reported Listings</p>
                        <p className="text-sm text-gray-500">Review reported products</p>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
                    <p className="text-gray-400">Comprehensive marketplace insights and metrics</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setDateRange('7days')}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        dateRange === '7days'
                          ? 'bg-gold text-jet font-semibold'
                          : 'bg-gray-50 border border-gray-200 text-white/70 hover:bg-gray-100'
                      }`}
                    >
                      7 Days
                    </button>
                    <button
                      onClick={() => setDateRange('30days')}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        dateRange === '30days'
                          ? 'bg-gold text-jet font-semibold'
                          : 'bg-gray-50 border border-gray-200 text-white/70 hover:bg-gray-100'
                      }`}
                    >
                      30 Days
                    </button>
                    <button
                      onClick={() => setDateRange('all')}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        dateRange === 'all'
                          ? 'bg-gold text-jet font-semibold'
                          : 'bg-gray-50 border border-gray-200 text-white/70 hover:bg-gray-100'
                      }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>

                {(() => {
                  // Filter data by date range
                  const filterByDate = (dateStr: string) => {
                    const date = new Date(dateStr);
                    const now = new Date();
                    if (dateRange === '7days') {
                      const sevenDaysAgo = new Date();
                      sevenDaysAgo.setDate(now.getDate() - 7);
                      return date >= sevenDaysAgo;
                    } else if (dateRange === '30days') {
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(now.getDate() - 30);
                      return date >= thirtyDaysAgo;
                    }
                    return true; // all time
                  };

                  const filteredOrders = orders.filter((o) => filterByDate(o.createdAt));
                  const filteredUsers = users.filter((u) => filterByDate(u.createdAt));
                  
                  const gmv = filteredOrders.reduce((sum, o) => sum + o.total, 0);
                  const totalCommission = filteredOrders.reduce((sum, o) => sum + o.commission, 0);
                  const newSellers = filteredUsers.filter((u) => u.role === 'seller').length;

                  // Orders by status
                  const ordersByStatus = {
                    paid: filteredOrders.filter((o) => o.status === 'paid').length,
                    shipped: filteredOrders.filter((o) => o.status === 'shipped').length,
                    delivered: filteredOrders.filter((o) => o.status === 'delivered').length,
                    cancelled: filteredOrders.filter((o) => o.status === 'cancelled').length,
                    refunded: filteredOrders.filter((o) => o.status === 'refunded').length,
                  };

                  return (
                    <>
                      {/* Key Metrics */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-500 text-sm">GMV</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">
                                {new Intl.NumberFormat('en-GB', {
                                  style: 'currency',
                                  currency: 'GBP',
                                }).format(gmv)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">Gross Merchandise Volume</p>
                            </div>
                            <ShoppingBag className="h-10 w-10 text-[#F4C400]/60" />
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-500 text-sm">Commission</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">
                                {new Intl.NumberFormat('en-GB', {
                                  style: 'currency',
                                  currency: 'GBP',
                                }).format(totalCommission)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">7% marketplace fee</p>
                            </div>
                            <DollarSign className="h-10 w-10 text-[#F4C400]/60" />
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-500 text-sm">New Users</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{filteredUsers.length}</p>
                              <p className="text-xs text-gray-400 mt-1">All new registrations</p>
                            </div>
                            <Users className="h-10 w-10 text-blue-400/40" />
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-gray-500 text-sm">New Sellers</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{newSellers}</p>
                              <p className="text-xs text-gray-400 mt-1">Seller registrations</p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-green-400/40" />
                          </div>
                        </div>
                      </div>

                      {/* Orders by Status */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Orders by Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-yellow-400 font-medium">Paid</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                  {ordersByStatus.paid}
                                </p>
                              </div>
                              <CheckCircle className="h-7 w-7 text-yellow-400/60" />
                            </div>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-blue-400 font-medium">Shipped</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                  {ordersByStatus.shipped}
                                </p>
                              </div>
                              <Package className="h-7 w-7 text-blue-400/60" />
                            </div>
                          </div>

                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-green-400 font-medium">Delivered</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                  {ordersByStatus.delivered}
                                </p>
                              </div>
                              <CheckCircle className="h-7 w-7 text-green-400/60" />
                            </div>
                          </div>

                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-500 font-medium">Cancelled</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                  {ordersByStatus.cancelled}
                                </p>
                              </div>
                              <XCircle className="h-7 w-7 text-white/30" />
                            </div>
                          </div>

                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-red-400 font-medium">Refunded</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                  {ordersByStatus.refunded}
                                </p>
                              </div>
                              <AlertCircle className="h-7 w-7 text-red-400/60" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Trend */}
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-xl font-bold mb-4">Revenue Trend</h3>
                        {(() => {
                          const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
                          const trendData: { date: string; gmv: number; commission: number }[] = [];

                          for (let i = days - 1; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            const dateStr = date.toISOString().split('T')[0];

                            const dayOrders = orders.filter((o) => {
                              const orderDate = o.createdAt.split('T')[0];
                              return orderDate === dateStr;
                            });

                            trendData.push({
                              date: date.toLocaleDateString('en-GB', { 
                                day: 'numeric', 
                                month: 'short' 
                              }),
                              gmv: dayOrders.reduce((sum, o) => sum + o.total, 0),
                              commission: dayOrders.reduce((sum, o) => sum + o.commission, 0),
                            });
                          }

                          const maxGMV = Math.max(...trendData.map((d) => d.gmv), 1);

                          return (
                            <div className="space-y-2">
                              {trendData.map((day) => (
                                <div key={day.date}>
                                  <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-900">{day.date}</span>
                                    <div className="text-sm text-gray-500">
                                      GMV: {new Intl.NumberFormat('en-GB', {
                                        style: 'currency',
                                        currency: 'GBP',
                                      }).format(day.gmv)}
                                      {' | '}
                                      Commission: {new Intl.NumberFormat('en-GB', {
                                        style: 'currency',
                                        currency: 'GBP',
                                      }).format(day.commission)}
                                    </div>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-4">
                                    <div
                                      className="bg-gradient-to-r from-gold/70 to-gold h-4 rounded-full transition-all"
                                      style={{ width: `${(day.gmv / maxGMV) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">All Users</h2>
                  <button onClick={handleExportUsers} className="btn-primary flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Users
                  </button>
                </div>
                <div className="space-y-3">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div>
                        <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-sm text-gray-500">{u.email}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'seller' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => u.isActive ? handleSuspendUser(u.id) : handleActivateUser(u.id)}
                            className={`text-sm px-3 py-1 rounded border ${
                              u.isActive 
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                                : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                            }`}
                          >
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                        <button
                          onClick={() => handleResendVerification(u.id)}
                          disabled={resendingVerification === u.id}
                          className="text-sm px-3 py-1 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 flex items-center gap-1"
                          title="Resend Verification Email"
                        >
                          <Send className="w-3 h-3" />
                          {resendingVerification === u.id ? '…' : 'Resend'}
                        </button>
                        {resendToast?.userId === u.id && (
                          <span className={`text-xs px-2 py-1 rounded ${resendToast.ok ? 'text-green-400' : 'text-red-400'}`}>
                            {resendToast.message}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">All Products</h2>
                  <button onClick={handleExportProducts} className="btn-primary flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Products
                  </button>
                </div>
                <div className="space-y-3">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div className="flex items-center space-x-4 flex-1">
                        {product.images && product.images[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-16 h-16 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded"></div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.title}</p>
                          <p className="text-sm text-gray-500">{formatPrice(product.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          product.isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {product.isApproved ? 'Approved' : 'Pending'}
                        </span>
                        {!product.isApproved && (
                          <>
                            <button
                              onClick={() => approveProduct(product.id)}
                              className="text-green-400 hover:text-green-300"
                              title="Approve"
                            >
                              <CheckCircle className="h-6 w-6" />
                            </button>
                            <button
                              onClick={() => rejectProduct(product.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Reject"
                            >
                              <XCircle className="h-6 w-6" />
                            </button>
                          </>
                        )}
                        {product.isApproved && product.isActive && (
                          <button
                            onClick={() => deactivateProduct(product.id)}
                            className="text-orange-400 hover:text-orange-300 text-xs px-2 py-1 border border-orange-500/30 rounded"
                            title="Deactivate listing"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">All Orders</h2>
                  <button onClick={handleExportOrders} className="btn-primary flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Orders
                  </button>
                </div>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between border-b border-gray-200 pb-3">
                      <div>
                        <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.total)}</p>
                        <p className="text-xs text-gray-500">Commission: {formatPrice(order.commission)}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
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
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">All Disputes</h2>
                {disputes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No disputes</p>
                ) : (
                  <div className="space-y-3">
                    {disputes.map((dispute) => (
                      <div key={dispute.id} className="border-b border-gray-200 pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{dispute.subject}</p>
                            <p className="text-sm text-gray-500">{dispute.description}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            dispute.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            dispute.status === 'open' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {dispute.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Payout Requests</h2>
                  <p className="text-gray-500">Review, approve, and complete seller payout requests.</p>
                </div>

                {/* ── Stripe Connect Platform Status Banner ─────────────────────── */}
                {connectPlatformStatus.checked && (
                  <div className={`card border-l-4 ${
                    connectPlatformStatus.platformConfigured === true
                      ? 'border-l-green-500 bg-green-50'
                      : connectPlatformStatus.platformConfigured === false
                      ? 'border-l-red-500 bg-red-50'
                      : 'border-l-yellow-500 bg-yellow-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      {connectPlatformStatus.platformConfigured === true ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          connectPlatformStatus.platformConfigured === false ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${
                          connectPlatformStatus.platformConfigured === true ? 'text-green-800' :
                          connectPlatformStatus.platformConfigured === false ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {connectPlatformStatus.platformConfigured === true
                            ? 'Stripe Connect: Active'
                            : connectPlatformStatus.platformConfigured === false
                            ? 'Stripe Connect: NOT configured on this account'
                            : 'Stripe Connect: Status unknown'}
                        </p>
                        {connectPlatformStatus.keyPrefix && (
                          <p className="text-xs mt-1 text-gray-500">
                            Active key: <code className="bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300 text-gray-800">{connectPlatformStatus.keyPrefix}</code>
                            {connectPlatformStatus.platformAccountId && (
                              <> · Account: <code className="bg-gray-200 px-1.5 py-0.5 rounded border border-gray-300 text-gray-800">{connectPlatformStatus.platformAccountId}</code></>
                            )}
                          </p>
                        )}
                        {connectPlatformStatus.platformConfigured === false && (
                          <div className="mt-2 text-xs text-red-700 space-y-1">
                            <p>The <code className="bg-red-100 px-1.5 py-0.5 rounded border border-red-300 text-red-800">STRIPE_SECRET_KEY</code> currently set in Netlify does <strong>not</strong> belong to a Connect-enabled platform account.</p>
                            <p>
                              <strong>Fix:</strong>{' '}
                              1. Update <code>STRIPE_SECRET_KEY</code> in Netlify → Site configuration → Environment variables to the new platform account's secret key.{' '}
                              2. Trigger a new deploy (Deploys → Trigger deploy) so the function picks up the updated key.{' '}
                              3. Confirm Connect is enabled:{' '}
                              <a href={connectPlatformStatus.setupUrl} target="_blank" rel="noopener noreferrer" className="underline">Stripe Connect Dashboard</a>.
                            </p>
                          </div>
                        )}
                        {connectPlatformStatus.platformConfigured === true && (
                          <p className="mt-1 text-xs text-green-700">
                            Platform account is enrolled in Stripe Connect. Sellers can connect their accounts and receive automatic payouts.
                          </p>
                        )}
                        {connectPlatformStatus.error && (
                          <p className="mt-1 text-xs text-yellow-700">{connectPlatformStatus.error}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setConnectPlatformStatus({ checked: false, platformConfigured: null })}
                        className="text-xs text-gray-400 hover:text-gray-500 flex-shrink-0"
                        title="Re-check status"
                      >
                        ↺
                      </button>
                    </div>
                  </div>
                )}
                {/* ──────────────────────────────────────────────────────────────── */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  {payoutRequests.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No payout requests.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-400">
                            <th className="pb-2 pr-4">Date</th>
                            <th className="pb-2 pr-4">Seller ID</th>
                            <th className="pb-2 pr-4">Amount</th>
                            <th className="pb-2 pr-4">Status</th>
                            <th className="pb-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payoutRequests.map((pr) => (
                            <tr key={pr.id} className="border-b border-gray-200 last:border-0">
                              <td className="py-2 pr-4 text-gray-500">
                                {new Date(pr.createdAt).toLocaleDateString('en-GB')}
                              </td>
                              <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                                {pr.sellerId.slice(0, 8)}…
                              </td>
                              <td className="py-2 pr-4 font-medium">{formatPrice(pr.amount)}</td>
                              <td className="py-2 pr-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  pr.status === 'paid'      ? 'bg-green-100 text-green-700' :
                                  pr.status === 'approved'  ? 'bg-blue-100 text-blue-700' :
                                  pr.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                                  pr.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {pr.status.charAt(0).toUpperCase() + pr.status.slice(1)}
                                </span>
                              </td>
                              <td className="py-2">
                                <div className="flex flex-col gap-1.5">
                                  {pr.status === 'requested' && (
                                    <>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleApprovePayout(pr.id)}
                                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                        >
                                          <CheckCircle className="h-3 w-3 inline mr-1" />
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => setRejectingId(rejectingId === pr.id ? null : pr.id)}
                                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                        >
                                          <XCircle className="h-3 w-3 inline mr-1" />
                                          Reject
                                        </button>
                                      </div>
                                      {rejectingId === pr.id && (
                                        <div className="flex gap-2 mt-1">
                                          <input
                                            type="text"
                                            placeholder="Rejection reason (optional)"
                                            value={rejectNotes[pr.id] ?? ''}
                                            onChange={(e) =>
                                              setRejectNotes((prev) => ({ ...prev, [pr.id]: e.target.value }))
                                            }
                                            className="text-xs border border-red-300 rounded px-2 py-1 flex-1"
                                          />
                                          <button
                                            onClick={() => handleRejectPayout(pr.id)}
                                            className="text-xs px-2 py-1 bg-red-600 text-gray-900 rounded hover:bg-red-700"
                                          >
                                            Confirm Reject
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  {pr.status === 'approved' && (
                                    <button
                                      onClick={() => handleCompletePayout(pr.id)}
                                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                    >
                                      <CreditCard className="h-3 w-3 inline mr-1" />
                                      Mark Paid
                                    </button>
                                  )}
                                </div>
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

            {/* Exports Tab */}
            {activeTab === 'exports' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Export Data</h2>
                  <p className="text-gray-500 mb-8">
                    Download your marketplace data in CSV format for analysis and reporting.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Orders Export */}
                    <div className="border border-gray-200 rounded-lg p-5 hover:border-gold/30 transition-colors bg-white/3">
                      <div className="flex items-center gap-3 mb-3">
                        <ShoppingBag className="h-7 w-7 text-gold" />
                        <div>
                          <h3 className="font-bold text-white">Orders Export</h3>
                          <p className="text-sm text-gray-500">{orders.length} orders</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Export all orders with customer details, totals, and status.
                      </p>
                      <button onClick={handleExportOrders} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" />
                        Download Orders CSV
                      </button>
                    </div>

                    {/* Sales Report */}
                    <div className="border border-gray-200 rounded-lg p-5 hover:border-gold/30 transition-colors bg-white/3">
                      <div className="flex items-center gap-3 mb-3">
                        <DollarSign className="h-7 w-7 text-green-400" />
                        <div>
                          <h3 className="font-bold text-white">Sales Report</h3>
                          <p className="text-sm text-gray-500">Daily summary</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Export daily sales totals with VAT and commission breakdown.
                      </p>
                      <button onClick={handleExportSales} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" />
                        Download Sales Report
                      </button>
                    </div>

                    {/* Commissions Export */}
                    <div className="border border-gray-200 rounded-lg p-5 hover:border-gold/30 transition-colors bg-white/3">
                      <div className="flex items-center gap-3 mb-3">
                        <Settings className="h-7 w-7 text-gold" />
                        <div>
                          <h3 className="font-bold text-white">Commission Report</h3>
                          <p className="text-sm text-gray-500">7% marketplace fee</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Export commission earnings per order for financial tracking.
                      </p>
                      <button onClick={handleExportCommissions} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" />
                        Download Commissions CSV
                      </button>
                    </div>

                    {/* VAT Report */}
                    <div className="border border-gray-200 rounded-lg p-5 hover:border-gold/30 transition-colors bg-white/3">
                      <div className="flex items-center gap-3 mb-3">
                        <AlertCircle className="h-7 w-7 text-blue-400" />
                        <div>
                          <h3 className="font-bold text-white">VAT Report</h3>
                          <p className="text-sm text-gray-500">Monthly breakdown</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Export monthly VAT summary for HMRC reporting (20% UK rate).
                      </p>
                      <button onClick={handleExportVAT} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" />
                        Download VAT Report
                      </button>
                    </div>

                    {/* Products Export */}
                    <div className="border border-gray-200 rounded-lg p-5 hover:border-gold/30 transition-colors bg-white/3">
                      <div className="flex items-center gap-3 mb-3">
                        <Package className="h-7 w-7 text-purple-400" />
                        <div>
                          <h3 className="font-bold text-white">Products Export</h3>
                          <p className="text-sm text-gray-500">{products.length} products</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Export all products with pricing, stock, and approval status.
                      </p>
                      <button onClick={handleExportProducts} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" />
                        Download Products CSV
                      </button>
                    </div>

                    {/* Users Export */}
                    <div className="border border-gray-200 rounded-lg p-5 hover:border-gold/30 transition-colors bg-white/3">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="h-7 w-7 text-indigo-400" />
                        <div>
                          <h3 className="font-bold text-white">Users Export</h3>
                          <p className="text-sm text-gray-500">{users.length} users</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        Export all users with roles, status, and registration dates.
                      </p>
                      <button onClick={handleExportUsers} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Download className="h-4 w-4" />
                        Download Users CSV
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 border border-blue-500/20 bg-blue-500/5">
                  <h3 className="font-bold text-gray-900 mb-2">About CSV Exports</h3>
                  <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
                    <li>All dates are in DD/MM/YYYY format</li>
                    <li>All amounts are in GBP (£)</li>
                    <li>CSV files can be opened in Excel, Google Sheets, or any spreadsheet software</li>
                    <li>Data is exported from the current database state</li>
                    <li>For custom reports, contact support at loadifymarket.co.uk@gmail.com</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
