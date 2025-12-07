import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold-500">Loadify Market</h3>
            <p className="text-sm text-gray-300 mb-4">
              Your trusted B2B & B2C marketplace for products, pallets, and bulk lots.
            </p>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                <span>101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:loadifymarket.co.uk@gmail.com" className="hover:text-gold-500">
                  loadifymarket.co.uk@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/catalog" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Browse Catalog
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Help & FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/tracking/search" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Seller Info */}
          <div>
            <h3 className="text-lg font-bold mb-4">For Sellers</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/register?type=seller" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link to="/help#seller" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Seller Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/returns-policy" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Returns Policy
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="text-gray-300 hover:text-gold-500 transition-colors">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-navy-700 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>
            © {currentYear} Danny Courier LTD. All rights reserved. | VAT: GB375949535
          </p>
        </div>
      </div>
    </footer>
  );
}
