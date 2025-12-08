import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, Hexagon } from 'lucide-react';
import { useAuthStore, useCartStore } from '../../store';
import { useState, useEffect } from 'react';

export default function Header() {
  const { user } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  const cartItemCount = getTotalItems();

  // Handle scroll for blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header 
      className={`bg-jet text-white sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'shadow-cinematic-lg backdrop-blur-lg bg-jet/95' : 'shadow-cinematic'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Hexagon */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Hexagon className="h-10 w-10 text-gold-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" fill="currentColor" />
              <div className="absolute inset-0 bg-gold-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-display font-bold leading-tight">Loadify Market</span>
              <span className="text-xs text-gold-400 font-medium">Premium Marketplace</span>
            </div>
          </Link>

          {/* Search Bar - Desktop with Cinematic Glow */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search logistics, pallets, handmade goods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-3 pr-12 rounded-cinematic-md bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:bg-white/10 focus:border-gold-400/50 transition-all duration-300 shadow-cinematic-glow"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400 hover:text-gold-300 transition-colors"
              >
                <Search className="h-6 w-6" />
              </button>
            </div>
          </form>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/catalog" 
              className="text-white hover:text-gold-400 transition-colors font-medium relative group"
            >
              Catalog
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-400 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            
            {user ? (
              <>
                {user.role === 'seller' && (
                  <Link 
                    to="/seller" 
                    className="text-white hover:text-gold-400 transition-colors font-medium relative group"
                  >
                    Dashboard
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-400 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className="text-white hover:text-gold-400 transition-colors font-medium relative group"
                  >
                    Admin
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-400 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                )}
                <Link 
                  to="/orders" 
                  className="text-white hover:text-gold-400 transition-colors font-medium relative group"
                >
                  Orders
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold-400 transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link 
                  to="/dashboard" 
                  className="flex items-center space-x-2 text-white hover:text-gold-400 transition-colors font-medium group"
                >
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </Link>
              </>
            ) : (
              <Link 
                to="/login" 
                className="flex items-center space-x-2 text-white hover:text-gold-400 transition-colors font-medium group"
              >
                <User className="h-5 w-5" />
                <span>Sign In</span>
              </Link>
            )}
            
            <Link 
              to="/cart" 
              className="relative text-white hover:text-gold-400 transition-colors group"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold-400 text-jet text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-cinematic-glow">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gold-400 hover:text-gold-300 transition-colors"
          >
            <Menu className="h-7 w-7" />
          </button>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-3 pr-12 rounded-cinematic-md bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-gold-400 transition-all duration-300"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-graphite border-t border-white/10">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link
              to="/catalog"
              className="block py-3 text-white hover:text-gold-400 transition-colors font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Catalog
            </Link>
            {user ? (
              <>
                {user.role === 'seller' && (
                  <Link
                    to="/seller"
                    className="block py-3 text-white hover:text-gold-400 transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Seller Dashboard
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block py-3 text-white hover:text-gold-400 transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/orders"
                  className="block py-3 text-white hover:text-gold-400 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Orders
                </Link>
                <Link
                  to="/dashboard"
                  className="block py-3 text-white hover:text-gold-400 transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="block py-3 text-white hover:text-gold-400 transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
            <Link
              to="/cart"
              className="block py-3 text-white hover:text-gold-400 transition-colors font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cart {cartItemCount > 0 && `(${cartItemCount})`}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
