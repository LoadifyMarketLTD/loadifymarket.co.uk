import { Link, useLocation } from 'react-router-dom';
import { Mail, MapPin, Hexagon, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import { BRAND } from '../../constants/brand';

const DASHBOARD_PATHS = ['/dashboard', '/seller', '/admin'];

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

const footerLinkClass =
  'text-[#E5E7EB] hover:text-[#F4B400] transition-colors duration-200 text-[14px] font-normal block py-3';

const footerTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  letterSpacing: '0.5px',
  color: '#F4B400',
  marginBottom: '14px',
};

export default function Footer() {
  const location = useLocation();

  if (isDashboardRoute(location.pathname)) {
    return (
      <footer style={{ background: 'linear-gradient(180deg,#0A2239,#081A2C)' }} className="text-white mt-auto border-t border-white/10">
        <div className="container-cinematic py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-white/70">
            <p>© 2025 {BRAND.name}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="hover:text-[#F4B400] transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-[#F4B400] transition-colors">Privacy</Link>
              <Link to="/contact" className="hover:text-[#F4B400] transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer style={{ background: 'linear-gradient(180deg,#0A2239,#081A2C)' }} className="text-white mt-auto">
      {/* ROW 1: Footer Top Bar — Logo + Social Icons */}
      <div
        className="footer-top"
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '32px 40px 28px',
        }}
      >
        <Link to="/" className="flex items-center space-x-3 group" aria-label="Loadify Market homepage">
          <div className="relative flex-shrink-0">
            <Hexagon className="h-10 w-10 text-[#F4B400] transition-all duration-300 group-hover:scale-110" strokeWidth={1.5} />
            <span className="absolute inset-0 flex items-center justify-center text-[#F4B400] font-bold text-base">L</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">{BRAND.name}</span>
        </Link>
        {/* Social Icons */}
        <div className="footer-social">
          <a
            href="https://www.facebook.com/loadifymarket"
            target="_blank"
            className="hover:text-[#F4B400] transition-opacity duration-200"
            aria-label="Facebook"
            rel="noopener noreferrer"
          >
            <Facebook className="h-[20px] w-[20px]" />
          </a>
          <a
            href="https://twitter.com/loadifymarket"
            target="_blank"
            className="hover:text-[#F4B400] transition-opacity duration-200"
            aria-label="Twitter"
            rel="noopener noreferrer"
          >
            <Twitter className="h-[20px] w-[20px]" />
          </a>
          <a
            href="https://www.instagram.com/loadifymarket"
            target="_blank"
            className="hover:text-[#F4B400] transition-opacity duration-200"
            aria-label="Instagram"
            rel="noopener noreferrer"
          >
            <Instagram className="h-[20px] w-[20px]" />
          </a>
          <a
            href="https://www.linkedin.com/company/loadifymarket"
            target="_blank"
            className="hover:text-[#F4B400] transition-opacity duration-200"
            aria-label="LinkedIn"
            rel="noopener noreferrer"
          >
            <Linkedin className="h-[20px] w-[20px]" />
          </a>
        </div>
      </div>

      {/* Divider between top bar and main grid */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 40px' }}>
        <div className="footer-divider" />
      </div>

      {/* ROW 2: Footer Main Grid — All 6 columns */}
      <div
        style={{
          maxWidth: '1400px',
          margin: 'auto',
          padding: '50px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr 1fr',
          gap: '40px',
          alignItems: 'start',
        }}
        className="footer-grid"
      >
        {/* Column 1: About */}
        <div className="footer-about">
          <h3 style={footerTitleStyle}>About Loadify Market</h3>
          <p className="text-[#E5E7EB] text-[13px] leading-relaxed">
            UK multi-category marketplace connecting buyers and sellers of pallets,
            wholesale &amp; clearance stock, electronics and retail goods.
          </p>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }} className="text-[13px] text-[#9CA3AF] space-y-1">
            <p className="text-[#E5E7EB] font-semibold text-[12px] uppercase tracking-wide mb-2">Company</p>
            <p>Operated by <span className="text-[#E5E7EB] font-medium">{BRAND.companyName}</span></p>
            <p>Company No: {BRAND.companyNumber}</p>
            <p>VAT: {BRAND.vatNumber}</p>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }} className="info-row text-[13px] text-[#9CA3AF]">
            <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[#F4B400]" />
            <address className="not-italic">101 Cornelian Street<br />Blackburn BB1 9QL<br />United Kingdom</address>
          </div>

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }} className="text-[13px] text-[#9CA3AF]">
            <p className="text-[#E5E7EB] font-semibold text-[12px] uppercase tracking-wide mb-2">Support</p>
            <div className="info-row">
              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#F4B400]" />
              <a
                href={`mailto:${BRAND.supportEmail}`}
                className="text-[#E5E7EB] hover:text-[#F4B400] transition-colors duration-200"
              >
                {BRAND.supportEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Column 2: For Buyers */}
        <div>
          <h3 style={footerTitleStyle}>For Buyers</h3>
          <ul>
            <li><Link to="/shop" className={footerLinkClass}>Browse Marketplace</Link></li>
            <li><Link to="/category/wholesale" className={footerLinkClass}>Wholesale &amp; Pallets</Link></li>
            <li><Link to="/category/amazon-returns" className={footerLinkClass}>Amazon Returns</Link></li>
            <li><Link to="/category/electronics" className={footerLinkClass}>Electronics</Link></li>
            <li><Link to="/category/fashion" className={footerLinkClass}>Fashion</Link></li>
            <li><Link to="/category/home-garden" className={footerLinkClass}>Home &amp; Garden</Link></li>
            <li><Link to="/category/automotive" className={footerLinkClass}>Automotive</Link></li>
            <li><Link to="/track-order" className={footerLinkClass}>Track Order</Link></li>
            <li><Link to="/help" className={footerLinkClass}>Help &amp; FAQ</Link></li>
          </ul>
        </div>

        {/* Column 3: For Sellers */}
        <div>
          <h3 style={footerTitleStyle}>For Sellers</h3>
          <ul>
            <li><Link to="/register?type=seller" className={footerLinkClass}>Start Selling</Link></li>
            <li><Link to="/seller" className={footerLinkClass}>Seller Dashboard</Link></li>
            <li><Link to="/seller/products/new" className={footerLinkClass}>List a Product</Link></li>
            <li><Link to="/pricing" className={footerLinkClass}>Seller Fees &amp; Pricing</Link></li>
            <li><Link to="/seller-guidelines" className={footerLinkClass}>Seller Guidelines</Link></li>
            <li><Link to="/how-it-works" className={footerLinkClass}>How It Works</Link></li>
            <li><Link to="/contact" className={footerLinkClass}>Partner With Us</Link></li>
          </ul>
        </div>

        {/* Column 4: Marketplace Services */}
        <div>
          <h3 style={footerTitleStyle}>Marketplace</h3>
          <ul>
            <li><Link to="/buyer-protection" className={footerLinkClass}>Buyer Protection</Link></li>
            <li><Link to="/transport-quote" className={footerLinkClass}>Transport Quote</Link></li>
            <li><Link to="/rfq" className={footerLinkClass}>Request Shipping Quote</Link></li>
            <li><Link to="/verified-sellers" className={footerLinkClass}>Verified Sellers</Link></li>
            <li><Link to="/category/wholesale" className={footerLinkClass}>Wholesale Orders</Link></li>
            <li><Link to="/contact" className={footerLinkClass}>Business Accounts</Link></li>
          </ul>
        </div>

        {/* Column 5: Company */}
        <div>
          <h3 style={footerTitleStyle}>Company</h3>
          <ul>
            <li><Link to="/about" className={footerLinkClass}>About Us</Link></li>
            <li><Link to="/contact" className={footerLinkClass}>Contact Us</Link></li>
            <li><Link to="/help" className={footerLinkClass}>Help Centre</Link></li>
            <li><Link to="/contact" className={footerLinkClass}>Support</Link></li>
            <li><Link to="/contact" className={footerLinkClass}>Business Enquiries</Link></li>
          </ul>
        </div>

        {/* Column 6: Legal */}
        <div>
          <h3 style={footerTitleStyle}>Legal</h3>
          <ul>
            <li><Link to="/terms" className={footerLinkClass}>Terms &amp; Conditions</Link></li>
            <li><Link to="/privacy" className={footerLinkClass}>Privacy Policy</Link></li>
            <li><Link to="/cookies" className={footerLinkClass}>Cookie Policy</Link></li>
            <li><Link to="/returns-policy" className={footerLinkClass}>Returns Policy</Link></li>
            <li><Link to="/shipping-policy" className={footerLinkClass}>Shipping Policy</Link></li>
            <li><Link to="/acceptable-use-policy" className={footerLinkClass}>Acceptable Use Policy</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="footer-divider"
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '20px 40px',
        }}
      >
        <p style={{ fontSize: '13px', color: '#9CA3AF' }}>
          © 2025 {BRAND.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
