import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  User, ShoppingBag, Heart, RotateCcw, AlertTriangle,
  Bell, MessageSquare, Settings, MapPin, ChevronRight,
  Shield, Truck, LogOut, ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { BRAND } from '../constants/brand';
import { supabase } from '../lib/supabase';
import { getDisplayName } from '../lib/displayName';
import type { SellerIdentity } from '../lib/displayName';

const QUICK_LINKS = [
  { label: 'My Orders',         icon: ShoppingBag,   to: '/orders',        desc: 'View and track your orders' },
  { label: 'Wishlist',          icon: Heart,          to: '/wishlist',      desc: 'Saved products' },
  { label: 'Returns',           icon: RotateCcw,      to: '/returns',       desc: 'Manage return requests' },
  { label: 'Disputes',          icon: AlertTriangle,  to: '/disputes',      desc: 'Open or view disputes' },
  { label: 'Messages',          icon: MessageSquare,  to: '/messages',      desc: 'Inbox & conversations' },
  { label: 'Notifications',     icon: Bell,           to: '/notifications', desc: 'Email & push preferences' },
  { label: 'Track Order',       icon: Truck,          to: '/track-order',   desc: 'Track a shipment' },
  { label: 'Account Settings',  icon: Settings,       to: '/dashboard',     desc: 'Profile and security' },
];

interface OrderCounts {
  pending: number;
  shipped: number;
  delivered: number;
  returns: number;
}

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [orderCounts, setOrderCounts] = useState<OrderCounts>({ pending: 0, shipped: 0, delivered: 0, returns: 0 });
  const [sellerProfile, setSellerProfile] = useState<SellerIdentity | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('status')
          .eq('buyer_id', user.id);
        if (data) {
          setOrderCounts({
            pending:   data.filter(o => o.status === 'pending' || o.status === 'paid').length,
            shipped:   data.filter(o => o.status === 'shipped').length,
            delivered: data.filter(o => o.status === 'delivered').length,
            returns:   data.filter(o => o.status === 'return_requested' || o.status === 'returned').length,
          });
        }
      } catch {
        // silently fail — dashboard is non-critical
      }

      // Fetch seller profile to resolve storeName / businessName for sellers
      if (user.role === 'seller' || user.role === 'owner') {
        try {
          const { data: profile } = await supabase
            .from('seller_profiles')
            .select('storeName, businessName')
            .eq('userId', user.id)
            .single();
          if (profile) setSellerProfile(profile);
        } catch {
          // silently fail
        }
      }
    })();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };


  return (
    <div className="bg-jet min-h-screen pt-24">
      <div className="container-cinematic py-10 max-w-5xl">

        {/* Welcome Header */}
        <div className="card-glass flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-gold" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {getDisplayName(user, sellerProfile)}
            </h1>
            <p className="text-white/50 text-sm mt-1">{BRAND.name} Dashboard</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                UK
              </span>
              <span className="capitalize bg-gold/10 text-gold px-2 py-0.5 rounded-full border border-gold/20">
                {user?.role || 'buyer'}
              </span>
              {user?.isEmailVerified && (
                <span className="flex items-center gap-1 text-green-400">
                  <Shield className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
          </div>
          {user?.role === 'seller' && (
            <Link to="/seller" className="btn-primary py-2 px-4 text-sm flex items-center gap-2 flex-shrink-0">
              Seller Dashboard <ChevronRight className="w-4 h-4" />
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 py-2 px-4 text-sm text-red-400/80 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all duration-200 flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>

        {/* Orders Summary */}
        <div className="card-glass mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList className="w-5 h-5 text-gold" />
            <h2 className="text-lg font-bold text-white">Orders Summary</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Pending Orders', count: orderCounts.pending },
              { label: 'Shipped',        count: orderCounts.shipped },
              { label: 'Delivered',      count: orderCounts.delivered },
              { label: 'Returns',        count: orderCounts.returns },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center text-center p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-2xl font-bold text-gold">{item.count}</span>
                <span className="text-xs text-white/50 mt-1">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links Grid */}
        <h2 className="text-lg font-bold text-white mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {QUICK_LINKS.map(link => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="card-glass group hover:border-gold/40 hover:scale-[1.02] transition-all duration-200 flex flex-col items-center text-center p-6"
              >
                <div className="w-12 h-12 rounded-premium-sm bg-gold/10 flex items-center justify-center mb-3 group-hover:bg-gold/20 transition-colors">
                  <Icon className="w-6 h-6 text-gold" />
                </div>
                <span className="font-semibold text-white text-sm">{link.label}</span>
                <span className="text-white/40 text-xs mt-1 leading-tight">{link.desc}</span>
              </Link>
            );
          })}
        </div>

        {/* Seller Upgrade CTA */}
        {user?.role === 'buyer' && (
          <div className="card-glass border border-gold/20 text-center py-8">
            <h3 className="text-xl font-bold text-white mb-2">Want to start selling?</h3>
            <p className="text-white/60 text-sm mb-5">
              List products, bulk lots, and pallets. Only {BRAND.marketplaceFeePercent}% commission per sale.
            </p>
            <Link to="/register?type=seller" className="btn-primary inline-flex items-center gap-2">
              Become a Seller <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
