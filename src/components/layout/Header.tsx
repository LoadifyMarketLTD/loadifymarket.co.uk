import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, LayoutGrid, TrendingUp, Star, MessageCircle, HelpCircle, Store, ChevronRight, LogOut, LayoutDashboard, Tag } from 'lucide-react';
import { useAuthStore, useCartStore } from '../../store';
import { useState, useEffect } from 'react';
import { BRAND } from '../../constants/brand';
import { supabase } from '../../lib/supabase';
import CATEGORY_CONFIG from '../../lib/category-config';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Lazy-mount: sidebar DOM is not created until the user first opens it,
  // reducing initial page DOM size by ~130 elements.
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const cartItemCount = getTotalItems();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // ESC key closes sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Off-canvas Left Sidebar — only mounted after first open to keep initial DOM lean */}
      {sidebarMounted && <div
        id="marketplace-sidebar"
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-out overflow-y-auto border-r border-gray-200 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Marketplace Navigation"
        aria-modal="true"
        role="dialog"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <img
              src="/branding/loadify-logo-transparent.svg"
              alt="Loadify Market"
              className="h-8 w-auto"
              loading="eager"
              decoding="async"
            />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
          {/* Sell CTA */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-2">
              Start Selling
            </p>
            <Link
              to="/sell"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#1E3A5F] hover:bg-[#2C4E73] transition-all duration-200 group"
            >
              <Store className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Sell an Item</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Marketplace */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-2">
              Marketplace
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'All Listings', href: '/catalog', icon: LayoutGrid },
                { label: 'Trending Listings', href: '/catalog?sort=trending', icon: TrendingUp },
                { label: 'New Listings', href: '/catalog?sort=createdAt_desc', icon: Star },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-100 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#1E3A5F] transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-2">
              Categories
            </p>
            <ul className="space-y-0.5">
              {CATEGORY_CONFIG.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <li key={cat.slug}>
                    <Link
                      to={`/category/${cat.slug}`}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-100 transition-all duration-200 group"
                    >
                      <CatIcon className={`w-4 h-4 flex-shrink-0 ${cat.iconColor} opacity-70 group-hover:opacity-100 transition-opacity`} />
                      <span className="flex-1">{cat.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-2">
              Account
            </p>
            <ul className="space-y-0.5">
              {user ? (
                <>
                  <li>
                    <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-100 transition-all duration-200 group">
                      <User className="w-4 h-4 text-gray-400 group-hover:text-[#1E3A5F] transition-colors flex-shrink-0" />
                      <span className="flex-1">My Account</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                    </Link>
                  </li>
                  {(user.role === 'seller' || user.role === 'owner') && (
                    <li>
                      <Link to="/seller" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-100 transition-all duration-200 group">
                        <LayoutDashboard className="w-4 h-4 text-gray-400 group-hover:text-[#1E3A5F] transition-colors flex-shrink-0" />
                        <span className="flex-1">Seller Dashboard</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">Log Out</span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-100 transition-all duration-200 group">
                      <User className="w-4 h-4 text-gray-400 group-hover:text-[#1E3A5F] transition-colors flex-shrink-0" />
                      <span className="flex-1">Login</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-100 transition-all duration-200 group">
                      <Store className="w-4 h-4 text-gray-400 group-hover:text-[#1E3A5F] transition-colors flex-shrink-0" />
                      <span className="flex-1">Register</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-2">
              Support
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'Contact', href: '/contact', icon: MessageCircle },
                { label: 'Help & FAQ', href: '/help', icon: HelpCircle },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-600 hover:text-[#1E3A5F] hover:bg-gray-100 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-[#1E3A5F] transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">{BRAND.name} — Open Marketplace</p>
        </div>
      </div>}

      <header className="fixed top-0 left-0 right-0 z-30 bg-white shadow-sm">
        {/* Top Utility Bar */}
        <div className="hidden md:block bg-[#1E3A5F] text-white text-xs py-1.5">
          <div className="container-market flex items-center justify-between">
            <span>UK Multi-Category Marketplace</span>
            <div className="flex items-center gap-6">
              <span>✓ Verified Sellers</span>
              <span>✓ Buyer Protection</span>
              <span>✓ Delivery Support via XDrive Logistics</span>
            </div>
          </div>
        </div>

        {/* Main Header Row */}
        <div className="bg-white border-b border-gray-200">
          <div className="container-market">
            <div className="flex items-center gap-4 h-16">
              {/* Hamburger */}
              <button
                onClick={() => { setSidebarMounted(true); setSidebarOpen(true); }}
                className="p-2 text-gray-600 hover:text-[#1E3A5F] transition-colors flex-shrink-0"
                aria-label="Open marketplace navigation"
                aria-haspopup="dialog"
                aria-expanded={sidebarMounted ? sidebarOpen : undefined}
                aria-controls={sidebarMounted ? 'marketplace-sidebar' : undefined}
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-3 flex-shrink-0" aria-label="Loadify Market homepage">
                {/* Mobile: icon only */}
                <img
                  src="/branding/loadify-mark.svg"
                  alt="Loadify"
                  className="h-8 w-8 sm:hidden"
                  loading="eager"
                  decoding="async"
                />
                {/* Desktop: full logo */}
                <img
                  src="/branding/loadify-logo-transparent.svg"
                  alt="Loadify Market"
                  className="hidden sm:block h-9 w-auto"
                  loading="eager"
                  decoding="async"
                />
              </Link>

              {/* Search — grows to fill space, hidden on mobile (shown below) */}
              <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl">
                <div className="flex w-full">
                  <input
                    type="text"
                    placeholder="Search pallets, products, wholesale lots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 border-r-0 rounded-l-md text-sm focus:outline-none focus:border-[#F4C400] focus:ring-1 focus:ring-[#F4C400]"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 rounded-r-md transition-colors"
                    aria-label="Search marketplace"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>

              {/* Right nav */}
              <nav className="hidden md:flex items-center gap-5 ml-auto">
                <Link to="/catalog" className="text-sm text-gray-700 hover:text-[#1E3A5F] font-medium whitespace-nowrap">Shop</Link>
                <Link to="/sell" className="text-sm text-gray-700 hover:text-[#1E3A5F] font-medium whitespace-nowrap">Start Selling</Link>
                {user ? (
                  <>
                    <Link to="/dashboard" className="flex items-center gap-1 text-sm text-gray-700 hover:text-[#1E3A5F]">
                      <User className="h-4 w-4" />
                      <span>Account</span>
                    </Link>
                    {(user.role === 'seller' || user.role === 'owner') && (
                      <Link to="/seller" className="text-sm text-gray-700 hover:text-[#1E3A5F] font-medium whitespace-nowrap">Dashboard</Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
                      aria-label="Log out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="flex items-center gap-1 text-sm text-gray-700 hover:text-[#1E3A5F]">
                    <User className="h-4 w-4" />
                    <span>Sign In</span>
                  </Link>
                )}
                <Link
                  to="/cart"
                  className="relative"
                  aria-label={`Shopping cart${cartItemCount > 0 ? ` (${cartItemCount} items)` : ''}`}
                >
                  <ShoppingCart className="h-6 w-6 text-gray-700 hover:text-[#1E3A5F] transition-colors" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#F4C400] text-gray-900 text-xs font-bold rounded-full h-[18px] w-[18px] flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              </nav>

              {/* Mobile: cart icon only */}
              <div className="flex md:hidden items-center gap-3 ml-auto">
                <Link to="/cart" className="relative" aria-label="Cart">
                  <ShoppingCart className="h-6 w-6 text-gray-700" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#F4C400] text-gray-900 text-xs font-bold rounded-full h-[18px] w-[18px] flex items-center justify-center">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile search */}
            <form onSubmit={handleSearch} className="md:hidden pb-3">
              <div className="flex">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 border-r-0 rounded-l-md text-sm focus:outline-none focus:border-[#F4C400]"
                />
                <button type="submit" className="px-3 bg-[#F4C400] hover:bg-[#EAB308] rounded-r-md transition-colors" aria-label="Search marketplace">
                  <Search className="h-4 w-4 text-gray-900" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Category navigation bar — visible on all pages */}
        <div className="hidden md:block bg-[#1E3A5F] border-t border-white/10">
          <div className="container-market">
            <nav
              className="flex items-center gap-0.5 overflow-x-auto scrollbar-none"
              aria-label="Category navigation"
            >
              <Link
                to="/catalog"
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border-b-2 ${
                  location.pathname === '/catalog'
                    ? 'border-[#F4C400] text-[#F4C400]'
                    : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                All Categories
              </Link>
              <Link
                to="/deals"
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border-b-2 ${
                  location.pathname === '/deals'
                    ? 'border-[#F4C400] text-[#F4C400]'
                    : 'border-transparent text-[#F4C400]/80 hover:text-[#F4C400] hover:border-[#F4C400]/50'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                Deals
              </Link>
              {CATEGORY_CONFIG.map((cat) => {
                const CatIcon = cat.icon;
                const isActive = location.pathname === `/category/${cat.slug}`;
                return (
                  <Link
                    key={cat.slug}
                    to={`/category/${cat.slug}`}
                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 border-b-2 ${
                      isActive
                        ? 'border-[#F4C400] text-[#F4C400]'
                        : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                    }`}
                  >
                    <CatIcon className="h-3.5 w-3.5" />
                    {cat.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

      </header>
    </>
  );
}
