import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, Hexagon, Cpu, Shirt, Home, Wrench, Car, Gamepad2, Heart, PawPrint, Briefcase, Sparkles, Package, Layers, Tag, BookOpen, LayoutGrid, TrendingUp, Star, MessageCircle, HelpCircle, Store, ChevronRight, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore, useCartStore } from '../../store';
import { useState, useEffect } from 'react';
import { BRAND } from '../../constants/brand';
import { supabase } from '../../lib/supabase';


export default function Header() {
  const { user, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/');
  };

  const cartItemCount = getTotalItems();

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu and sidebar on route change
  useEffect(() => {
    if (mobileMenuOpen) setMobileMenuOpen(false);
    if (sidebarOpen) setSidebarOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Off-canvas Left Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-jet z-50 transform transition-transform duration-300 ease-out overflow-y-auto border-r border-white/10 flex flex-col ${
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
          {/* Sell CTA — always first, always prominent */}
          <div>
            <p className="text-[10px] font-bold text-gold/50 uppercase tracking-widest mb-1.5 px-2">
              Start Selling
            </p>
            <Link
              to="/register?type=seller"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-jet bg-gold hover:bg-gold/90 transition-all duration-200 group"
            >
              <Store className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Sell an Item</span>
              <ChevronRight className="w-3.5 h-3.5 transition-colors" />
            </Link>
          </div>

          {/* Categories */}
          <div>
            <p className="text-[10px] font-bold text-gold/50 uppercase tracking-widest mb-1.5 px-2">
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
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Wholesale */}
          <div>
            <p className="text-[10px] font-bold text-gold/50 uppercase tracking-widest mb-1.5 px-2">
              Wholesale
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'Bulk Lots', href: '/shop?category=bulk-lots', icon: Package },
                { label: 'Pallet Deals', href: '/bulk', icon: Layers },
                { label: 'Clearance Stock', href: '/shop?category=clearance', icon: Tag },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Marketplace */}
          <div>
            <p className="text-[10px] font-bold text-gold/50 uppercase tracking-widest mb-1.5 px-2">
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
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account section — dynamic based on auth state */}
          <div>
            <p className="text-[10px] font-bold text-gold/50 uppercase tracking-widest mb-1.5 px-2">
              Account
            </p>
            <ul className="space-y-0.5">
              {user ? (
                <>
                  <li>
                    <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                      <User className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                      <span className="flex-1">My Account</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                    </Link>
                  </li>
                  {(user.role === 'seller' || user.role === 'owner') && (
                    <li>
                      <Link to="/seller" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                        <LayoutDashboard className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                        <span className="flex-1">Seller Dashboard</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">Log Out</span>
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                      <User className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                      <span className="flex-1">Login</span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                      <Store className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
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
            <p className="text-[10px] font-bold text-gold/50 uppercase tracking-widest mb-1.5 px-2">
              Support
            </p>
            <ul className="space-y-0.5">
              {[
                { label: 'Contact', href: '/contact', icon: MessageCircle },
                { label: 'Help & FAQ', href: '/help', icon: HelpCircle },
              ].map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group">
                    <Icon className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
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

    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-jet/95 backdrop-blur-glass shadow-cinematic'
          : 'bg-jet'
      }`}
    >
      <div className="container-cinematic">
        <div className="flex items-center justify-between h-20">
          {/* Sidebar Hamburger — visible on all screen sizes */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-white/70 hover:text-gold transition-colors mr-3 flex-shrink-0"
            aria-label="Open marketplace navigation"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Hexagon className="h-10 w-10 text-gold transition-all duration-300 group-hover:scale-110" strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-gold font-bold text-sm">L</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-white tracking-tight">{BRAND.name}</span>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full group">
              <input
                type="text"
                placeholder="Search products, bulk lots, pallets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-search w-full pr-12 group-hover:bg-white/10"
              />
              <button
                type="submit"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/shop"
              className={`nav-link ${isActive('/shop') ? 'nav-link-active' : ''}`}
            >
              Shop
            </Link>
            <Link
              to="/bulk"
              className={`nav-link ${isActive('/bulk') ? 'nav-link-active' : ''}`}
            >
              Bulk &amp; Pallets
            </Link>
            <Link
              to="/catalog"
              className={`nav-link ${isActive('/catalog') ? 'nav-link-active' : ''}`}
            >
              All Listings
            </Link>
            <Link
              to="/register?type=seller"
              className={`nav-link ${isActive('/register') ? 'nav-link-active' : ''}`}
            >
              Sell Stock
            </Link>
            <Link
              to="/transport-quote"
              className={`nav-link ${isActive('/transport-quote') ? 'nav-link-active' : ''}`}
            >
              Transport
            </Link>

            {user ? (
              <>
                {(user.role === 'seller' || user.role === 'owner') && (
                  <Link
                    to="/seller"
                    className={`nav-link ${isActive('/seller') ? 'nav-link-active' : ''}`}
                  >
                    Dashboard
                  </Link>
                )}
                {(user.role === 'admin' || user.role === 'owner') && (
                  <Link
                    to="/admin"
                    className={`nav-link ${isActive('/admin') ? 'nav-link-active' : ''}`}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className={`nav-link flex items-center space-x-2 ${isActive('/dashboard') ? 'nav-link-active' : ''}`}
                >
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="nav-link flex items-center space-x-1.5 text-white/60 hover:text-red-400 transition-colors"
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="nav-link flex items-center space-x-2"
              >
                <User className="h-5 w-5" />
                <span>Account</span>
              </Link>
            )}

            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative group"
              aria-label={`Shopping cart${cartItemCount > 0 ? ` (${cartItemCount} items)` : ''}`}
            >
              <div className="p-2 rounded-full transition-all duration-300 group-hover:bg-white/10">
                <ShoppingCart className="h-6 w-6 text-white group-hover:text-gold transition-colors" />
              </div>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold text-jet text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-scaleIn" aria-hidden="true">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>
          </nav>

          {/* Mobile: Cart + Menu Button */}
          <div className="flex md:hidden items-center space-x-4">
            <Link
              to="/cart"
              className="relative"
              aria-label={`Shopping cart${cartItemCount > 0 ? ` (${cartItemCount} items)` : ''}`}
            >
              <ShoppingCart className="h-6 w-6 text-white" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold text-jet text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center" aria-hidden="true">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:text-gold transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search - Always visible on small screens */}
        <form onSubmit={handleSearch} className="lg:hidden pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products, bulk lots, pallets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search w-full pr-12"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${
          mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-graphite/95 backdrop-blur-glass border-t border-white/10">
          <nav className="container-cinematic py-6 space-y-2">
            <Link
              to="/shop"
              className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                isActive('/shop')
                  ? 'bg-gold/10 text-gold'
                  : 'text-white/80 hover:bg-white/5 hover:text-gold'
              }`}
            >
              Shop
            </Link>
            <Link
              to="/bulk"
              className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                isActive('/bulk')
                  ? 'bg-gold/10 text-gold'
                  : 'text-white/80 hover:bg-white/5 hover:text-gold'
              }`}
            >
              Bulk &amp; Pallets
            </Link>
            <Link
              to="/catalog"
              className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                isActive('/catalog')
                  ? 'bg-gold/10 text-gold'
                  : 'text-white/80 hover:bg-white/5 hover:text-gold'
              }`}
            >
              All Listings
            </Link>
            <Link
              to="/register?type=seller"
              className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                isActive('/register')
                  ? 'bg-gold/10 text-gold'
                  : 'text-white/80 hover:bg-white/5 hover:text-gold'
              }`}
            >
              Sell Stock
            </Link>
            <Link
              to="/transport-quote"
              className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                isActive('/transport-quote')
                  ? 'bg-gold/10 text-gold'
                  : 'text-white/80 hover:bg-white/5 hover:text-gold'
              }`}
            >
              Transport
            </Link>

            {user ? (
              <>
                {(user.role === 'seller' || user.role === 'owner') && (
                  <Link
                    to="/seller"
                    className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                      isActive('/seller')
                        ? 'bg-gold/10 text-gold'
                        : 'text-white/80 hover:bg-white/5 hover:text-gold'
                    }`}
                  >
                    Seller Dashboard
                  </Link>
                )}
                {(user.role === 'admin' || user.role === 'owner') && (
                  <Link
                    to="/admin"
                    className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                      isActive('/admin')
                        ? 'bg-gold/10 text-gold'
                        : 'text-white/80 hover:bg-white/5 hover:text-gold'
                    }`}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/orders"
                  className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                    isActive('/orders')
                      ? 'bg-gold/10 text-gold'
                      : 'text-white/80 hover:bg-white/5 hover:text-gold'
                  }`}
                >
                  Orders
                </Link>
                <Link
                  to="/dashboard"
                  className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                    isActive('/dashboard')
                      ? 'bg-gold/10 text-gold'
                      : 'text-white/80 hover:bg-white/5 hover:text-gold'
                  }`}
                >
                  Account
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block py-3 px-4 rounded-premium-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                >
                  Log Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block py-3 px-4 rounded-premium-sm text-white/80 hover:bg-white/5 hover:text-gold transition-all duration-300"
              >
                Sign In
              </Link>
            )}

            {/* Divider */}
            <div className="divider-fade my-4" />

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                to="/how-it-works"
                className="py-2 px-4 text-sm text-white/60 hover:text-gold transition-colors"
              >
                How It Works
              </Link>
              <Link
                to="/pricing"
                className="py-2 px-4 text-sm text-white/60 hover:text-gold transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/about"
                className="py-2 px-4 text-sm text-white/60 hover:text-gold transition-colors"
              >
                About Us
              </Link>
              <Link
                to="/help"
                className="py-2 px-4 text-sm text-white/60 hover:text-gold transition-colors"
              >
                Help Center
              </Link>
              <Link
                to="/contact"
                className="py-2 px-4 text-sm text-white/60 hover:text-gold transition-colors"
              >
                Contact
              </Link>
              <Link
                to="/track-order"
                className="py-2 px-4 text-sm text-white/60 hover:text-gold transition-colors"
              >
                Track Order
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
    </>
  );
}
