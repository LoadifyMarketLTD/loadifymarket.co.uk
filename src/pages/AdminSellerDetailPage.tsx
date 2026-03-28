import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { hasAdminAccess } from '../lib/roleUtils';
import type { User, SellerProfile, SellerStore, Product } from '../types';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Ban,
  Star,
  Package,
  Store,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  ExternalLink,
  Edit2,
  RefreshCcw,
  Send,
} from 'lucide-react';import { formatDistanceToNow } from 'date-fns';
import RoleBadge from '../components/RoleBadge';

const DEFAULT_COMMISSION_RATE = 7;

interface SellerDetail {
  user: User;
  profile: SellerProfile;
  store: SellerStore | null;
  products: Product[];
}

export default function AdminSellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: adminUser } = useAuthStore();

  const [data, setData] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingCommission, setEditingCommission] = useState(false);
  const [commissionValue, setCommissionValue] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');

  const fetchSeller = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (userError) throw userError;

      // Fetch seller profile
      const { data: profileData, error: profileError } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('userId', id)
        .single();

      const profile: SellerProfile = profileData || {
        userId: id,
        isApproved: false,
        rating: 0,
        totalSales: 0,
        commission: DEFAULT_COMMISSION_RATE,
      };
      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Fetch seller store
      const { data: storeData } = await supabase
        .from('seller_stores')
        .select('*')
        .eq('userId', id)
        .maybeSingle();

      // Fetch seller products (all, including inactive – admin view)
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('sellerId', id)
        .order('createdAt', { ascending: false })
        .limit(20);

      setData({
        user: userData,
        profile,
        store: storeData || null,
        products: productsData || [],
      });
      setCommissionValue(String(profile.commission ?? DEFAULT_COMMISSION_RATE));
    } catch (err) {
      console.error('Error fetching seller detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSeller();
  }, [fetchSeller]);

  const suspendSeller = async () => {
    if (!id || !confirm('Suspend this seller? They will not be able to use seller features.')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ sellerStatus: 'suspended' })
        .eq('userId', id);
      if (error) throw error;
      await fetchSeller();
    } catch (err) {
      console.error('Error suspending seller:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const reactivateSeller = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      // Set back to 'submitted' — the auto-activation logic will promote to
      // 'active' automatically if all conditions are already met.
      const { error } = await supabase
        .from('seller_profiles')
        .update({ sellerStatus: 'submitted' })
        .eq('userId', id);
      if (error) throw error;
      await fetchSeller();
    } catch (err) {
      console.error('Error reactivating seller:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const blockUser = async () => {
    if (!id || !confirm('Block this user? They will not be able to log in.')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ isActive: false })
        .eq('id', id);
      if (error) throw error;
      await fetchSeller();
    } catch (err) {
      console.error('Error blocking user:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const unblockUser = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ isActive: true })
        .eq('id', id);
      if (error) throw error;
      await fetchSeller();
    } catch (err) {
      console.error('Error unblocking user:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const saveCommission = async () => {
    if (!id) return;
    const parsed = parseFloat(commissionValue);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      alert('Commission must be a number between 0 and 100');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ commission: parsed })
        .eq('userId', id);
      if (error) throw error;
      setEditingCommission(false);
      await fetchSeller();
    } catch (err) {
      console.error('Error saving commission:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!id || !adminUser?.id) {
      setResendStatus('error');
      setResendMessage('Admin session not found. Please refresh the page and try again.');
      setTimeout(() => setResendStatus('idle'), 5000);
      return;
    }
    setResendStatus('sending');
    setResendMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      const res = await fetch('/.netlify/functions/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: id }),
      });
      let json: { error?: string; message?: string; success?: boolean } = {};
      try {
        json = await res.json();
      } catch {
        // Non-JSON body (e.g. unhandled Netlify 500) – keep empty json
      }
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        if (res.status === 403) {
          throw new Error('Permission denied – admin access required.');
        }
        throw new Error(json.error || `Request failed (${res.status}). Please try again.`);
      }
      setResendStatus('success');
      setResendMessage(json.message || 'Verification email sent');
    } catch (err) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setTimeout(() => setResendStatus('idle'), 5000);
    }
  };

  if (!hasAdminAccess(adminUser)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <p className="text-red-600">Access Denied: Admin only</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-navy-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading seller details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="card text-center py-16">
            <ShieldAlert className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Seller Not Found</h2>
            <p className="text-gray-500 mb-6">This seller does not exist or was deleted.</p>
            <button onClick={() => navigate(-1)} className="btn-primary">
              Back to Sellers
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { user: sellerUser, profile, store, products } = data;

  const approvedProducts  = products.filter((p) => p.isApproved && p.isActive);
  const pendingProducts   = products.filter((p) => !p.isApproved);
  const inactiveProducts  = products.filter((p) => p.isApproved && !p.isActive);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">

        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-navy-800 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sellers
        </button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {sellerUser.firstName} {sellerUser.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {(profile.sellerStatus === 'active') ? (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                  <CheckCircle className="w-3 h-3" />
                  Seller account active
                </span>
              ) : (profile.sellerStatus === 'suspended') ? (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  <Ban className="w-3 h-3" />
                  Seller account suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  <ShieldAlert className="w-3 h-3" />
                  Setup in progress
                </span>
              )}
              {!sellerUser.isActive && (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  <Ban className="w-3 h-3" />
                  Blocked
                </span>
              )}
              {profile.marketplaceRole && <RoleBadge role={profile.marketplaceRole} size="sm" />}
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2">
            {profile.sellerStatus !== 'suspended' ? (
              <button
                onClick={suspendSeller}
                disabled={actionLoading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm transition-colors"
              >
                <Ban className="w-4 h-4" />
                Suspend Seller
              </button>
            ) : (
              <button
                onClick={reactivateSeller}
                disabled={actionLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Reactivate Seller
              </button>
            )}

            {sellerUser.isActive ? (
              <button
                onClick={blockUser}
                disabled={actionLoading}
                className="bg-red-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm transition-colors"
              >
                <Ban className="w-4 h-4" />
                Block User
              </button>
            ) : (
              <button
                onClick={unblockUser}
                disabled={actionLoading}
                className="bg-green-600 text-gray-900 px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Unblock User
              </button>
            )}

            <button
              onClick={fetchSeller}
              disabled={actionLoading || loading}
              className="btn-outline flex items-center gap-2"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>

            <button
              onClick={resendVerificationEmail}
              disabled={resendStatus === 'sending'}
              className="btn-outline flex items-center gap-2"
              title="Resend Verification Email"
            >
              <Send className="w-4 h-4" />
              {resendStatus === 'sending' ? 'Sending…' : 'Resend Verification Email'}
            </button>
          </div>

          {/* Resend status toast */}
          {resendStatus !== 'idle' && resendStatus !== 'sending' && (
            <div className={`mt-2 text-sm px-3 py-2 rounded flex items-center gap-2 ${
              resendStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {resendStatus === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {resendMessage}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: Account & Profile Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Account Info */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-navy-800" />
                Account Information
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">User ID</dt>
                  <dd className="font-mono text-xs text-gray-700 mt-0.5 break-all">{sellerUser.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Role</dt>
                  <dd className="text-gray-900 mt-0.5 capitalize">{sellerUser.role}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </dt>
                  <dd className="text-gray-900 mt-0.5">{sellerUser.email}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Joined
                  </dt>
                  <dd className="text-gray-900 mt-0.5">
                    {new Date(sellerUser.createdAt).toLocaleDateString('en-GB')}{' '}
                    <span className="text-gray-400 text-xs">
                      ({formatDistanceToNow(new Date(sellerUser.createdAt), { addSuffix: true })})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Account Status</dt>
                  <dd className="mt-0.5">
                    {sellerUser.isActive ? (
                      <span className="text-green-700 font-medium">Active</span>
                    ) : (
                      <span className="text-red-700 font-medium">Blocked</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Email Verified</dt>
                  <dd className="mt-0.5">
                    {sellerUser.isEmailVerified ? (
                      <span className="text-green-700 font-medium">Yes</span>
                    ) : (
                      <span className="text-yellow-700 font-medium">No</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Business Profile */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Store className="w-5 h-5 text-navy-800" />
                Business Profile
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {profile.businessName && (
                  <div>
                    <dt className="text-gray-500">Business Name</dt>
                    <dd className="text-gray-900 mt-0.5 font-medium">{profile.businessName}</dd>
                  </div>
                )}
                {profile.storeName && (
                  <div>
                    <dt className="text-gray-500">Store Name</dt>
                    <dd className="text-gray-900 mt-0.5">{profile.storeName}</dd>
                  </div>
                )}
                {profile.vatNumber && (
                  <div>
                    <dt className="text-gray-500">VAT Number</dt>
                    <dd className="text-gray-900 mt-0.5">{profile.vatNumber}</dd>
                  </div>
                )}
                {profile.companyRegistrationNumber && (
                  <div>
                    <dt className="text-gray-500">Company Reg.</dt>
                    <dd className="text-gray-900 mt-0.5">{profile.companyRegistrationNumber}</dd>
                  </div>
                )}
                {profile.phone && (
                  <div>
                    <dt className="text-gray-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Phone
                    </dt>
                    <dd className="text-gray-900 mt-0.5">{profile.phone}</dd>
                  </div>
                )}
                {profile.country && (
                  <div>
                    <dt className="text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Country
                    </dt>
                    <dd className="text-gray-900 mt-0.5">{profile.country}</dd>
                  </div>
                )}
                {profile.businessAddress && (
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Business Address</dt>
                    <dd className="text-gray-900 mt-0.5">
                      {profile.businessAddress.line1}
                      {profile.businessAddress.line2 ? `, ${profile.businessAddress.line2}` : ''},&nbsp;
                      {profile.businessAddress.city}, {profile.businessAddress.postcode},{' '}
                      {profile.businessAddress.country}
                    </dd>
                  </div>
                )}
                {profile.sellerStatus && (
                  <div>
                    <dt className="text-gray-500">Seller Status</dt>
                    <dd className="mt-0.5 capitalize">{profile.sellerStatus}</dd>
                  </div>
                )}
                {profile.marketplaceRole && (
                  <div>
                    <dt className="text-gray-500">Marketplace Role</dt>
                    <dd className="mt-0.5 capitalize">{profile.marketplaceRole}</dd>
                  </div>
                )}
                {profile.paymentBehaviour && (
                  <div>
                    <dt className="text-gray-500">Payment Behaviour</dt>
                    <dd className="mt-0.5 capitalize">{profile.paymentBehaviour.replace(/_/g, ' ')}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Store Info */}
            {store && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-navy-800" />
                  Store Details
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {store.storeName && (
                    <div>
                      <dt className="text-gray-500">Store Name</dt>
                      <dd className="text-gray-900 mt-0.5">{store.storeName}</dd>
                    </div>
                  )}
                  {store.storeSlug && (
                    <div>
                      <dt className="text-gray-500">Store Slug</dt>
                      <dd className="mt-0.5 flex items-center gap-1">
                        <span className="text-gray-900">{store.storeSlug}</span>
                        <Link
                          to={`/seller/${store.storeSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy-800 hover:text-navy-600"
                          title="View public store"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-500">Store Active</dt>
                    <dd className="mt-0.5">
                      {store.isActive ? (
                        <span className="text-green-700 font-medium">Yes</span>
                      ) : (
                        <span className="text-red-700 font-medium">No</span>
                      )}
                    </dd>
                  </div>
                  {store.storeDescription && (
                    <div className="sm:col-span-2">
                      <dt className="text-gray-500">Description</dt>
                      <dd className="text-gray-700 mt-0.5">{store.storeDescription}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Products */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Package className="w-5 h-5 text-navy-800" />
                Listings ({products.length})
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                <span className="text-green-700 font-medium">{approvedProducts.length} active</span>
                {' · '}
                <span className="text-yellow-700 font-medium">{pendingProducts.length} pending</span>
                {' · '}
                <span className="text-gray-500">{inactiveProducts.length} inactive</span>
              </p>

              {products.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">No listings yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <div key={product.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {product.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                          <p className="text-xs text-gray-500">
                            £{product.price.toFixed(2)} · {product.condition} · Qty: {product.stockQuantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {product.isApproved && product.isActive ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">Active</span>
                        ) : !product.isApproved ? (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">Pending</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">Inactive</span>
                        )}
                        <Link
                          to={`/product/${product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-navy-800 transition-colors"
                          title="View product"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Stats & Admin Controls */}
          <div className="space-y-6">

            {/* Performance Stats */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-navy-800" />
                Performance
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400" /> Rating
                  </span>
                  <span className="font-semibold text-gray-900">
                    {profile.rating.toFixed(1)} / 5.0
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Sales</span>
                  <span className="font-semibold text-gray-900">{profile.totalSales}</span>
                </div>
                {profile.salesCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Orders Completed</span>
                    <span className="font-semibold text-gray-900">{profile.salesCount}</span>
                  </div>
                )}
                {profile.disputeRate !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dispute Rate</span>
                    <span className="font-semibold text-gray-900">
                      {(profile.disputeRate * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                {profile.deliverySuccessRate !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery Success</span>
                    <span className="font-semibold text-gray-900">
                      {(profile.deliverySuccessRate * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Commission */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Commission Rate</h2>
              {editingCommission ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Commission (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveCommission}
                      disabled={actionLoading}
                      className="btn-primary text-sm flex-1"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingCommission(false);
                        setCommissionValue(String(profile.commission ?? DEFAULT_COMMISSION_RATE));
                      }}
                      className="btn-outline text-sm flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-navy-800">{profile.commission}%</span>
                  <button
                    onClick={() => setEditingCommission(true)}
                    className="btn-outline flex items-center gap-1 text-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Stripe Connect / Payout */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Stripe Connect</h2>
              {profile.stripeAccountId ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500 text-xs">Account ID</dt>
                    <dd className="font-mono text-xs text-gray-700 break-all mt-0.5">{profile.stripeAccountId}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 text-xs">Connect Status</dt>
                    <dd className="mt-0.5">
                      {profile.stripeConnectStatus === 'active' && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      )}
                      {profile.stripeConnectStatus === 'restricted' && (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded">
                          <ShieldAlert className="w-3 h-3" /> Restricted
                        </span>
                      )}
                      {(profile.stripeConnectStatus === 'pending' || !profile.stripeConnectStatus) && (
                        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">
                          <ShieldAlert className="w-3 h-3" /> Pending Setup
                        </span>
                      )}
                    </dd>
                  </div>
                  {profile.payoutDetails?.bankName && (
                    <div>
                      <dt className="text-gray-500 text-xs">Bank</dt>
                      <dd className="text-gray-900 mt-0.5">{profile.payoutDetails.bankName}</dd>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not connected — seller has not set up Stripe Connect.</p>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
