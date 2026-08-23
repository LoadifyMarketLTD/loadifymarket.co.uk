import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, Hexagon, Cpu, Shirt, Home, Wrench, Car, Gamepad2, Heart, PawPrint, Briefcase, Sparkles, Package, Layers, Tag, BookOpen, LayoutGrid, TrendingUp, Star, MessageCircle, HelpCircle, Store, ChevronRight, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore, useCartStore } from '../../store';
import { useState, useEffect } from 'react';
import { BRAND } from '../../constants/brand';
import { supabase } from '../../lib/supabase';

const DASHBOARD_PATHS = ['/dashboard', '/seller', '/admin'];
function isDashboardRoute(pathname: string) {
  return DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export default function Header() {
  const { user, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const onDashboard = isDashboardRoute(location.pathname);

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

      {/* Off-canvas Left Sidebar */}
      <div
        id="marketplace-sidebar"
        className={`fixed top-0 left-0 h-full w-72 bg-[#1E3A5F] z-50 transform transition-transform duration-300 ease-out overflow-y-auto border-r border-white/10 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Marketplace Navigation"
        aria-modal="true"
        role="dialog"
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <span className="text-white font-bold text-base tracking-tight">Browse Loadify</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-white/50 hover:text-white transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
          {/* Sell CTA */}
          <div>
            <p className="text-[10px] font-bold text-[#F4C400]/60 uppercase tracking-widest mb-1.5 px-2">
              Start Selling
            </p>
            <Link
              to="/register?type=seller"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-900 bg-[#F4C400] hover:bg-yellow-400 transition-all duration-200 group"
            >
              <Store className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Sell an Item</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Categories */}
          <div>
            <p className="text-[10px] font-bold text-[#F4C400]/60 uppercase tracking-widest mb-1.5 px-2">
              Categories
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'Electronics', href: '/shop?category=electronics', icon: Cpu },
                { label: 'Fashion', href: '/shop?category=fashion', icon: Shirt },
                { label: 'Home & Garden', href: '/shop?category=home-garden', icon: Home },
                { label: 'Tools', href: '/shop?category=tools', icon: Wrench },
                { label: 'Vehicles', href: '/shop?category=vehicles', icon: Car },
                { label: 'Toys', href: '/shop?category=toys', icon: Gamepad2 },
                { label: 'Health & Beauty', href: '/shop?category=health-beauty', icon: Heart },
                { label: 'Pets', href: '/shop?category=pets', icon: PawPrint },
                { label: 'Office Supplies', href: '/shop?category=office-supplies', icon: Briefcase },
                { label: 'Handmade', href: '/shop?category=handmade', icon: Sparkles },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Wholesale */}
          <div>
            <p className="text-[10px] font-bold text-[#F4C400]/60 uppercase tracking-widest mb-1.5 px-2">
              Wholesale
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'Bulk Lots', href: '/shop?category=bulk-lots', icon: Package },
                { label: 'Pallet Deals', href: '/bulk', icon: Layers },
                { label: 'Clearance Stock', href: '/shop?category=clearance', icon: Tag },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Marketplace */}
          <div>
            <p className="text-[10px] font-bold text-[#F4C400]/60 uppercase tracking-widest mb-1.5 px-2">
              Marketplace
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'All Listings', href: '/catalog', icon: LayoutGrid },
                { label: 'Trending Listings', href: '/catalog?sort=trending', icon: TrendingUp },
                { label: 'New Listings', href: '/catalog?sort=createdAt_desc', icon: Star },
                { label: 'Featured Deals', href: '/bulk', icon: BookOpen },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <p className="text-[10px] font-bold text-[#F4C400]/60 uppercase tracking-widest mb-1.5 px-2">
              Account
            </p>
            <ul className="space-y-0.5">
              {user ? (
                <>
                  <li>
                    <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                      <User className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                      <span className="flex-1">My Account</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                    </Link>
                  </li>
                  {(user.role === 'seller' || user.role === 'owner') && (
                    <li>
                      <Link to="/seller" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                        <LayoutDashboard className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                        <span className="flex-1">Seller Dashboard</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-red-300/80 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 group"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">Log Out</span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                      <User className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                      <span className="flex-1">Login</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                      <Store className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                      <span className="flex-1">Register</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-[10px] font-bold text-[#F4C400]/60 uppercase tracking-widest mb-1.5 px-2">
              Support
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'Contact', href: '/contact', icon: MessageCircle },
                { label: 'Help & FAQ', href: '/help', icon: HelpCircle },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-[#F4C400]/60 group-hover:text-[#F4C400] transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
          <p className="text-xs text-white/50 text-center">{BRAND.name} — Open Marketplace</p>
        </div>
      </div>

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
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-600 hover:text-[#1E3A5F] transition-colors flex-shrink-0"
                aria-label="Open marketplace navigation"
                aria-expanded={sidebarOpen}
                aria-controls="marketplace-sidebar"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <Hexagon className="h-8 w-8 text-[#F4C400]" strokeWidth={1.5} />
                <span className="hidden sm:block text-lg font-bold text-[#1E3A5F]">{BRAND.name}</span>
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
                    aria-label="Search"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>

              {/* Right nav */}
              <nav className="hidden md:flex items-center gap-5 ml-auto">
                <Link to="/catalog" className="text-sm text-gray-700 hover:text-[#1E3A5F] font-medium whitespace-nowrap">Shop</Link>
                <Link to="/register?type=seller" className="text-sm text-gray-700 hover:text-[#1E3A5F] font-medium whitespace-nowrap">Start Selling</Link>
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
                <button type="submit" className="px-3 bg-[#F4C400] hover:bg-[#EAB308] rounded-r-md transition-colors">
                  <Search className="h-4 w-4 text-gray-900" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Category Navigation — hide on dashboard routes */}
        {!onDashboard && (
          <div className="bg-[#F8F9FA] border-b border-gray-200 hidden md:block">
            <div className="container-market">
              <nav className="flex items-center gap-1 overflow-x-auto py-1.5 text-sm scrollbar-hide" aria-label="Category navigation">
                <Link to="/catalog" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap font-medium">All Categories</Link>
                <Link to="/catalog?type=lot" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Amazon Returns</Link>
                <Link to="/catalog?type=clearance" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Clearance</Link>
                <Link to="/bulk" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Wholesale</Link>
                <Link to="/shop?category=electronics" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Electronics</Link>
                <Link to="/shop?category=home-garden" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Home &amp; Garden</Link>
                <Link to="/shop?category=tools" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Tools &amp; DIY</Link>
                <Link to="/shop?category=business" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Business Supplies</Link>
                <Link to="/shop?category=fashion" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Fashion</Link>
                <Link to="/shop?category=vehicles" className="px-3 py-1.5 text-gray-700 hover:text-[#1E3A5F] hover:bg-[#F4C400]/10 rounded whitespace-nowrap">Automotive</Link>
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
