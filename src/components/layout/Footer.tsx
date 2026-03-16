import { Link, useLocation } from 'react-router-dom';
import { Mail, MapPin, Hexagon, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { BRAND } from '../../constants/brand';

const DASHBOARD_PATHS = ['/dashboard', '/seller', '/admin'];

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

const SUPPORT_EMAIL = 'loadifymarket.co.uk@gmail.com';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  if (isDashboardRoute(location.pathname)) {
    return (
    <footer className="bg-[#1E3A5F] text-white mt-auto border-t border-white/10">
      <div className="container-cinematic py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/80">
            <p>&copy; {currentYear} {BRAND.name}. Operated by {BRAND.companyName} (CRN: {BRAND.companyNumber}).</p>
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

          <div className="flex items-center space-x-4">
            <span className="text-white/80 text-sm mr-4">Follow us</span>
            <a href="https://www.facebook.com/loadifymarket" target="_blank" className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300" aria-label="Facebook" rel="noopener noreferrer">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="https://twitter.com/loadifymarket" target="_blank" className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300" aria-label="Twitter" rel="noopener noreferrer">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="https://www.instagram.com/loadifymarket" target="_blank" className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300" aria-label="Instagram" rel="noopener noreferrer">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://www.linkedin.com/company/loadifymarket" target="_blank" className="p-2 rounded-full bg-white/5 text-gold hover:bg-gold hover:text-jet transition-all duration-300" aria-label="LinkedIn" rel="noopener noreferrer">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Links Grid — 6 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
          {/* About Loadify Market */}
          <div className="lg:col-span-2">
            <h3 className="text-lg font-bold mb-4 text-gold">About Loadify Market</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              Loadify Market is a UK multi-category marketplace connecting buyers and sellers of pallets, wholesale lots, clearance stock, retail products, automotive parts and industrial equipment.
            </p>
            <div className="space-y-2 text-sm">
              <div className="text-white/80 text-xs space-y-1">
                <p className="font-semibold text-white/90">Operated by {BRAND.companyName}</p>
                <p>Company Number: {BRAND.companyNumber}</p>
                <p>Registered in England and Wales</p>
              </div>
              <div className="flex items-start space-x-2 text-white/80 text-xs">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gold" />
                <span>101 Cornelian Street<br />Blackburn, BB1 9QL<br />United Kingdom</span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gold" />
                <div>
                  <p className="text-white/90 font-medium">Customer Support</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white/80 hover:text-gold transition-colors">{SUPPORT_EMAIL}</a>
                </div>
              </div>
            </div>
          </div>

          {/* For Buyers */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold">For Buyers</h3>
            <ul className="space-y-2">
              <li><Link to="/catalog" className="text-white/80 hover:text-gold transition-colors text-sm">Browse Marketplace</Link></li>
              <li><Link to="/bulk" className="text-white/80 hover:text-gold transition-colors text-sm">Bulk &amp; Pallet Deals</Link></li>
              <li><Link to="/catalog?type=lot" className="text-white/80 hover:text-gold transition-colors text-sm">Wholesale Lots</Link></li>
              <li><Link to="/shop?category=electronics" className="text-white/80 hover:text-gold transition-colors text-sm">Electronics</Link></li>
              <li><Link to="/shop?category=fashion" className="text-white/80 hover:text-gold transition-colors text-sm">Fashion</Link></li>
              <li><Link to="/shop?category=home-garden" className="text-white/80 hover:text-gold transition-colors text-sm">Home &amp; Garden</Link></li>
              <li><Link to="/shop?category=vehicles" className="text-white/80 hover:text-gold transition-colors text-sm">Automotive Parts</Link></li>
              <li><Link to="/track-order" className="text-white/80 hover:text-gold transition-colors text-sm">Track Order</Link></li>
              <li><Link to="/help" className="text-white/80 hover:text-gold transition-colors text-sm">Help &amp; FAQ</Link></li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold">For Sellers</h3>
            <ul className="space-y-2">
              <li><Link to="/register?type=seller" className="text-white/80 hover:text-gold transition-colors text-sm">Start Selling</Link></li>
              <li><Link to="/seller" className="text-white/80 hover:text-gold transition-colors text-sm">Seller Dashboard</Link></li>
              <li><Link to="/seller/products/new" className="text-white/80 hover:text-gold transition-colors text-sm">List a Product</Link></li>
              <li><Link to="/pricing" className="text-white/80 hover:text-gold transition-colors text-sm">Seller Fees &amp; Pricing</Link></li>
              <li><Link to="/how-it-works" className="text-white/80 hover:text-gold transition-colors text-sm">Seller Guidelines</Link></li>
              <li><Link to="/how-it-works" className="text-white/80 hover:text-gold transition-colors text-sm">How It Works</Link></li>
              <li><Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm">Partner With Us</Link></li>
            </ul>
          </div>

          {/* Marketplace Services */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold">Services</h3>
            <ul className="space-y-2">
              <li><Link to="/buyer-protection" className="text-white/80 hover:text-gold transition-colors text-sm">Buyer Protection</Link></li>
              <li><Link to="/transport-quote" className="text-white/80 hover:text-gold transition-colors text-sm">Transport Quote</Link></li>
              <li><Link to="/rfq" className="text-white/80 hover:text-gold transition-colors text-sm">Request a Shipping Quote</Link></li>
              <li><Link to="/catalog" className="text-white/80 hover:text-gold transition-colors text-sm">Verified Sellers</Link></li>
              <li><Link to="/bulk" className="text-white/80 hover:text-gold transition-colors text-sm">Bulk Orders</Link></li>
              <li><Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm">Business Accounts</Link></li>
            </ul>

            <h3 className="text-lg font-bold mb-3 mt-6 text-gold">Company</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-white/80 hover:text-gold transition-colors text-sm">About Us</Link></li>
              <li><Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm">Contact Us</Link></li>
              <li><Link to="/help" className="text-white/80 hover:text-gold transition-colors text-sm">Help Centre</Link></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`} className="text-white/80 hover:text-gold transition-colors text-sm">Support</a></li>
              <li><Link to="/contact" className="text-white/80 hover:text-gold transition-colors text-sm">Business Enquiries</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-gold">Legal</h3>
            <ul className="space-y-2">
              <li><Link to="/terms" className="text-white/80 hover:text-gold transition-colors text-sm">Terms &amp; Conditions</Link></li>
              <li><Link to="/privacy" className="text-white/80 hover:text-gold transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="text-white/80 hover:text-gold transition-colors text-sm">Cookie Policy</Link></li>
              <li><Link to="/returns-policy" className="text-white/80 hover:text-gold transition-colors text-sm">Returns Policy</Link></li>
              <li><Link to="/shipping-policy" className="text-white/80 hover:text-gold transition-colors text-sm">Shipping Policy</Link></li>
              <li><Link to="/terms" className="text-white/80 hover:text-gold transition-colors text-sm">Acceptable Use Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-[#152D4A]">
        <div className="container-cinematic py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-white/90 text-sm">
              &copy; {currentYear} {BRAND.name}. Operated by {BRAND.companyName} (CRN: {BRAND.companyNumber}).
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/90">
              <span>VAT: {BRAND.vatNumber}</span>
              <span className="hidden md:inline">|</span>
              <span>Marketplace commission: {BRAND.marketplaceFeePercent}% per completed sale</span>
              <span className="hidden md:inline">|</span>
              <span>Returns handled according to individual seller policies.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
