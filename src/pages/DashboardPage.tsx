import { Link, useNavigate } from 'react-router-dom';
import {
  User, ShoppingBag, Heart, RotateCcw, AlertTriangle,
  Bell, MessageSquare, Settings, MapPin, ChevronRight,
  Shield, Package, Truck, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store';
import { BRAND } from '../constants/brand';
import { supabase } from '../lib/supabase';

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

const TRUST_FEATURES = [
  { icon: Shield,  label: 'Buyer Protection',  desc: `Every purchase is protected by ${BRAND.name}` },
  { icon: RotateCcw, label: `${BRAND.returnsDays}-Day Returns`, desc: 'Easy returns within 14 days' },
  { icon: Package, label: 'Secure Payments',   desc: 'Stripe-encrypted checkout' },
];

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : '';

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
            <h1 className="text-2xl font-bold text-white">Welcome back{displayName ? `, ${displayName.split(' ')[0]}` : ''}!</h1>
            <p className="text-white/50 text-sm mt-1">{user?.email}</p>
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

        {/* Trust Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TRUST_FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="card-glass flex items-start gap-3">
                <div className="p-2 bg-gold/10 rounded-premium-sm flex-shrink-0">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.label}</p>
                  <p className="text-white/40 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
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
