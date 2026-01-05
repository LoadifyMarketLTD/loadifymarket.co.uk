import { Link } from 'react-router-dom';
import { Mail, MapPin, Hexagon, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-jet text-white mt-auto">
      {/* Main Footer Content */}
      <div className="container-cinematic py-16">
        {/* Top Section with Logo and Social */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 pb-12 border-b border-white/10">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 mb-6 lg:mb-0 group">
            <div className="relative">
              <Hexagon className="h-12 w-12 text-gold transition-all duration-300 group-hover:scale-110" strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-gold font-bold text-lg">L</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-white tracking-tight">Loadify</span>
              <span className="text-2xl font-bold text-gold tracking-tight"> Market</span>
            </div>
          </Link>

          {/* Social Icons */}
          <div className="flex items-center space-x-4">
            <span className="text-white/50 text-sm mr-4">Follow us</span>
            <a
              href="#"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="Facebook"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="Twitter"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">About</h3>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Your trusted marketplace for logistics loads, wholesale pallets, and unique handmade goods — all in one place.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-3 text-white/60">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-gold" />
                <span>101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 flex-shrink-0 text-gold" />
                <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-white/60 hover:text-gold transition-colors">
                  loadifymarket.co.uk@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/catalog" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Browse Catalog
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Help & FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/tracking/search" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Seller Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">Sell on Loadify</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/register?type=seller" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link to="/help#seller" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Seller Guidelines
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Partner with Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">Policies</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/returns-policy" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Returns Policy
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="text-white/60 hover:text-gold transition-colors text-sm underline-gold">
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-graphite/30">
        <div className="container-cinematic py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-white/40 text-sm">
              © {currentYear} Danny Courier LTD. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-white/40">
              <span>VAT: GB375949535</span>
              <span className="hidden md:inline">|</span>
              <span>Company Reg: 12345678</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
