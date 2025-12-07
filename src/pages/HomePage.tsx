import { Link } from 'react-router-dom';
import { Package, TrendingUp, Users, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-navy-900 to-navy-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Welcome to Loadify Market
            </h1>
            <p className="text-xl mb-8 text-gray-200">
              Your trusted B2B & B2C marketplace for products, pallets, and bulk lots.
              Find great deals or sell your inventory to a global audience.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/catalog" className="btn-secondary text-lg">
                Browse Catalog
              </Link>
              <Link to="/register?type=seller" className="btn-outline text-lg bg-white/10 border-white text-white hover:bg-white hover:text-navy-900">
                Become a Seller
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Loadify Market?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <Package className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Wide Selection</h3>
              <p className="text-gray-600">
                From individual products to bulk pallets, find everything you need.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
              <p className="text-gray-600">
                Safe and secure transactions with buyer protection.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Competitive Prices</h3>
              <p className="text-gray-600">
                Best deals on quality products from verified sellers.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-navy-100 text-navy-800 rounded-full mb-4">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Trusted Community</h3>
              <p className="text-gray-600">
                Join thousands of satisfied buyers and sellers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {['Electronics', 'Home & Garden', 'Clothing', 'Pallets & Lots', 'Automotive', 'Sports', 'Books', 'Toys'].map((category) => (
              <Link
                key={category}
                to={`/catalog?category=${category.toLowerCase().replace(' ', '-')}`}
                className="card hover:shadow-lg transition-shadow text-center"
              >
                <h3 className="font-semibold text-lg">{category}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-navy-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Selling?</h2>
          <p className="text-xl mb-8 text-gray-200">
            Join our marketplace and reach thousands of potential customers.
          </p>
          <Link to="/register?type=seller" className="btn-secondary text-lg">
            Register as Seller
          </Link>
        </div>
      </section>
    </div>
  );
}
