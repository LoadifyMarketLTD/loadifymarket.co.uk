import { Link } from 'react-router-dom';
import { Mail, MapPin, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-jet text-white mt-auto">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-display font-bold mb-6 text-gold-400">Loadify Market</h3>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Your marketplace for logistics, stock & handmade goods. From pallets to unique handmade art — everything in one place.
            </p>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-gold-400" />
                <span>101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-gold-400" />
                <a href="mailto:loadifymarket.co.uk@gmail.com" className="hover:text-gold-400 transition-colors">
                  loadifymarket.co.uk@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-display font-bold mb-6">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/catalog" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Browse Catalog
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Help & FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Seller Info */}
          <div>
            <h3 className="text-lg font-display font-bold mb-6">For Sellers</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/register?type=seller" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Sell on Loadify Market
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link to="/help#seller" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Seller Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h3 className="text-lg font-display font-bold mb-6">Policies</h3>
            <ul className="space-y-3 text-sm mb-8">
              <li>
                <Link to="/terms" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/returns-policy" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Returns Policy
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="text-gray-300 hover:text-gold-400 transition-colors flex items-center group">
                  <span className="w-1.5 h-1.5 bg-gold-400 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  Shipping Policy
                </Link>
              </li>
            </ul>
            
            {/* Social Icons */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-gold-400">Connect With Us</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-gold-400 transition-colors">
                  <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-gold-400 transition-colors">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-gold-400 transition-colors">
                  <Twitter className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-gold-400 transition-colors">
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-graphite mt-12 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © {currentYear} <span className="text-gold-400 font-semibold">Danny Courier LTD</span>. All rights reserved.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            VAT: <span className="text-gold-400">GB375949535</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
