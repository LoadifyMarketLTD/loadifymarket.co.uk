import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, Hexagon } from 'lucide-react';
import { useAuthStore, useCartStore } from '../../store';
import { useState, useEffect } from 'react';

export default function Header() {
  const { user } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  const cartItemCount = getTotalItems();

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-jet/95 backdrop-blur-glass shadow-cinematic'
          : 'bg-jet'
      }`}
    >
      <div className="container-cinematic">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Hexagon className="h-10 w-10 text-gold transition-all duration-300 group-hover:scale-110" strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-gold font-bold text-sm">L</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold text-white tracking-tight">Loadify</span>
              <span className="text-xl font-bold text-gold tracking-tight"> Market</span>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full group">
              <input
                type="text"
                placeholder="Search products, pallets, handmade items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-search w-full pr-12 group-hover:bg-white/10"
              />
              <button
                type="submit"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/catalog"
              className={`nav-link ${isActive('/catalog') ? 'nav-link-active' : ''}`}
            >
              Catalog
            </Link>

            {user ? (
              <>
                {user.role === 'seller' && (
                  <Link
                    to="/seller"
                    className={`nav-link ${isActive('/seller') ? 'nav-link-active' : ''}`}
                  >
                    Dashboard
                  </Link>
                )}
                {user.role === 'admin' && (
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
              </>
            ) : (
              <Link
                to="/login"
                className="nav-link flex items-center space-x-2"
              >
                <User className="h-5 w-5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Cart Icon */}
            <Link
              to="/cart"
              className="relative group"
            >
              <div className="p-2 rounded-full transition-all duration-300 group-hover:bg-white/10">
                <ShoppingCart className="h-6 w-6 text-white group-hover:text-gold transition-colors" />
              </div>
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold text-jet text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-scaleIn">
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
            >
              <ShoppingCart className="h-6 w-6 text-white" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold text-jet text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
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
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-search w-full pr-12"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-gold transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ease-out ${
          mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-graphite/95 backdrop-blur-glass border-t border-white/10">
          <nav className="container-cinematic py-6 space-y-2">
            <Link
              to="/catalog"
              className={`block py-3 px-4 rounded-premium-sm transition-all duration-300 ${
                isActive('/catalog')
                  ? 'bg-gold/10 text-gold'
                  : 'text-white/80 hover:bg-white/5 hover:text-gold'
              }`}
            >
              Catalog
            </Link>

            {user ? (
              <>
                {user.role === 'seller' && (
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
                {user.role === 'admin' && (
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
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
