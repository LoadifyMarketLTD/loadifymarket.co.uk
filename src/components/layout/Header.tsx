import { Link } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, Package } from 'lucide-react';
import { useAuthStore, useCartStore } from '../../store';
import { useState } from 'react';

export default function Header() {
  const { user } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cartItemCount = getTotalItems();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/catalog?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="bg-navy-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Package className="h-8 w-8 text-gold-500" />
            <span className="text-xl font-bold">Loadify Market</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products, pallets, lots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pr-10 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-navy-800"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/catalog" className="hover:text-gold-500 transition-colors">
              Catalog
            </Link>
            
            {user ? (
              <>
                {user.role === 'seller' && (
                  <Link to="/seller" className="hover:text-gold-500 transition-colors">
                    Seller Dashboard
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="hover:text-gold-500 transition-colors">
                    Admin
                  </Link>
                )}
                <Link to="/orders" className="hover:text-gold-500 transition-colors">
                  Orders
                </Link>
                <Link to="/dashboard" className="hover:text-gold-500 transition-colors flex items-center space-x-1">
                  <User className="h-5 w-5" />
                  <span>Account</span>
                </Link>
              </>
            ) : (
              <Link to="/login" className="hover:text-gold-500 transition-colors flex items-center space-x-1">
                <User className="h-5 w-5" />
                <span>Sign In</span>
              </Link>
            )}
            
            <Link to="/cart" className="hover:text-gold-500 transition-colors relative">
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gold-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden pb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pr-10 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-navy-800"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-800 border-t border-navy-700">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link
              to="/catalog"
              className="block py-2 hover:text-gold-500 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Catalog
            </Link>
            {user ? (
              <>
                {user.role === 'seller' && (
                  <Link
                    to="/seller"
                    className="block py-2 hover:text-gold-500 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Seller Dashboard
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="block py-2 hover:text-gold-500 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/orders"
                  className="block py-2 hover:text-gold-500 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Orders
                </Link>
                <Link
                  to="/dashboard"
                  className="block py-2 hover:text-gold-500 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Account
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="block py-2 hover:text-gold-500 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
            <Link
              to="/cart"
              className="block py-2 hover:text-gold-500 transition-colors"
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
