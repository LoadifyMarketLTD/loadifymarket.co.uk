import { Link, useLocation } from 'react-router-dom';
import { Mail, MapPin, Hexagon, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { BRAND } from '../../constants/brand';

const DASHBOARD_PATHS = ['/dashboard', '/seller', '/admin'];

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export default function Footer() {
  const location = useLocation();

  if (isDashboardRoute(location.pathname)) {
    return (
    <footer className="bg-[#1E3A5F] text-white mt-auto border-t border-white/10">
      <div className="container-cinematic py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/70">
            <p>© 2025 {BRAND.name}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-gold transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
              <Link to="/contact" className="hover:text-gold transition-colors">Contact</Link>
            </div>
          </div>
        </div>
    </footer>
  );
  }

  return (
    <footer className="bg-[#1E3A5F] text-white mt-auto">
      {/* Main Footer Content */}
      <div className="container-cinematic py-8">
        {/* Top Section with Logo and Social */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 pb-8 border-b border-white/10">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 mb-6 lg:mb-0 group" aria-label="Loadify Market homepage">
            <div className="relative">
              <Hexagon className="h-12 w-12 text-gold transition-all duration-300 group-hover:scale-110" strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-gold font-bold text-lg">L</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-white tracking-tight">{BRAND.name}</span>
              <p className="text-xs text-white/80 mt-0.5">{BRAND.tagline}</p>
            </div>
          </Link>

          {/* Social Icons */}
          <div className="flex items-center space-x-4">
            <span className="text-white/70 text-sm mr-4">Follow us</span>
            <a
              href="https://www.facebook.com/loadifymarket"
              target="_blank"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="Facebook"
              rel="noopener noreferrer"
            >
              <Facebook className="h-5 w-5" />
            </a>
            <a
              href="https://twitter.com/loadifymarket"
              target="_blank"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="Twitter"
              rel="noopener noreferrer"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://www.instagram.com/loadifymarket"
              target="_blank"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="Instagram"
              rel="noopener noreferrer"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="https://www.linkedin.com/company/loadifymarket"
              target="_blank"
              className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300"
              aria-label="LinkedIn"
              rel="noopener noreferrer"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">About Loadify Market</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Loadify Market is a UK multi-category marketplace connecting buyers and sellers of pallets, wholesale lots, clearance stock, retail products, automotive parts and industrial equipment.
            </p>
            <div className="space-y-3 text-sm">
              <div className="text-white/70 text-xs space-y-1">
                <p>Operated by <span className="font-semibold text-white/90">{BRAND.companyName}</span></p>
                <p>Company Number: {BRAND.companyNumber}</p>
                <p>VAT Number: {BRAND.vatNumber}</p>
                <p>Registered in England and Wales</p>
              </div>
              <div className="flex items-start space-x-3 text-white/80">
                <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-gold" />
                <span className="text-xs">{BRAND.companyAddress}</span>
              </div>
              <div className="text-white/70 text-xs mt-2">
                <p className="font-semibold text-white/80 mb-1">Customer Support</p>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 flex-shrink-0 text-gold" />
                  <a href={`mailto:${BRAND.supportEmail}`} className="text-white/80 hover:text-gold transition-colors">
                    {BRAND.supportEmail}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">For Buyers</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/shop" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Browse Marketplace
                </Link>
              </li>
              <li>
                <Link to="/bulk" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Bulk &amp; Pallet Deals
                </Link>
              </li>
              <li>
                <Link to="/bulk?type=wholesale" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Wholesale Lots
                </Link>
              </li>
              <li>
                <Link to="/shop?category=electronics" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/shop?category=fashion" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Fashion
                </Link>
              </li>
              <li>
                <Link to="/shop?category=home-garden" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Home &amp; Garden
                </Link>
              </li>
              <li>
                <Link to="/shop?category=automotive-parts" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Automotive Parts
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Track Order
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Help &amp; FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Seller Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">For Sellers</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/register?type=seller" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Start Selling
                </Link>
              </li>
              <li>
                <Link to="/seller" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link to="/seller/products/new" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  List a Product
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Seller Fees &amp; Pricing
                </Link>
              </li>
              <li>
                <Link to="/seller-guidelines" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Seller Guidelines
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Partner With Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Marketplace Services */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">Marketplace Services</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/buyer-protection" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Buyer Protection
                </Link>
              </li>
              <li>
                <Link to="/transport-quote" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Transport Quote
                </Link>
              </li>
              <li>
                <Link to="/rfq" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Request a Shipping Quote
                </Link>
              </li>
              <li>
                <Link to="/verified-sellers" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Verified Sellers
                </Link>
              </li>
              <li>
                <Link to="/bulk" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Bulk Orders
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Business Accounts
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/about" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Help Centre
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Support
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Business Enquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gold">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/returns-policy" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Returns Policy
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/acceptable-use-policy" className="text-white/80 hover:text-gold transition-colors text-sm underline-gold">
                  Acceptable Use Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-[#152D4A]">
        <div className="container-cinematic py-4">
          <p className="text-white/70 text-sm text-center">
            © 2025 {BRAND.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
