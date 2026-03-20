import { Link, useLocation } from 'react-router-dom';
import {
  Mail, MapPin, Hexagon, ArrowRight,
  Facebook, Twitter, Instagram, Linkedin,
  ShieldCheck, Truck, BadgeCheck,
} from 'lucide-react';
import { BRAND } from '../../constants/brand';

const DASHBOARD_PATHS = ['/dashboard', '/seller', '/admin'];

function isDashboardRoute(pathname: string) {
  return DASHBOARD_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

// ── Social links ──────────────────────────────────────────────────────────────
const SOCIAL_LINKS = [
  { href: 'https://www.facebook.com/loadifymarket',       Icon: Facebook,  label: 'Facebook'  },
  { href: 'https://twitter.com/loadifymarket',            Icon: Twitter,   label: 'Twitter'   },
  { href: 'https://www.instagram.com/loadifymarket',      Icon: Instagram, label: 'Instagram' },
  { href: 'https://www.linkedin.com/company/loadifymarket', Icon: Linkedin, label: 'LinkedIn' },
];

// ── Trust items ───────────────────────────────────────────────────────────────
const FOOTER_TRUST = [
  { Icon: BadgeCheck, label: 'Verified Sellers'     },
  { Icon: ShieldCheck, label: 'Secure Platform'     },
  { Icon: Truck,       label: 'UK Delivery Support' },
];

// ── Nav columns ───────────────────────────────────────────────────────────────
const NAV_COLUMNS = [
  {
    heading: 'For Buyers',
    links: [
      { label: 'Browse Marketplace',   to: '/shop'                      },
      { label: 'Electronics',          to: '/category/electronics'      },
      { label: 'Fashion',              to: '/category/fashion'          },
      { label: 'Home & Living',        to: '/category/home-garden'      },
      { label: 'Tools & Equipment',    to: '/category/tools-diy'        },
      { label: 'Deals & Clearance',    to: '/deals'                     },
      { label: 'Automotive',           to: '/category/automotive'       },
      { label: 'Track Order',          to: '/track-order'               },
      { label: 'Help & FAQ',           to: '/help'                      },
    ],
  },
  {
    heading: 'For Sellers',
    links: [
      { label: 'Start Selling',        to: '/register?type=seller'      },
      { label: 'Seller Dashboard',     to: '/seller'                    },
      { label: 'List a Product',       to: '/seller/products/new'       },
      { label: 'Seller Fees & Pricing', to: '/pricing'                  },
      { label: 'Seller Guidelines',    to: '/seller-guidelines'         },
      { label: 'How It Works',         to: '/how-it-works'              },
      { label: 'Partner With Us',      to: '/contact'                   },
    ],
  },
  {
    heading: 'Marketplace',
    links: [
      { label: 'Buyer Protection',     to: '/buyer-protection'          },
      { label: 'Verified Sellers',     to: '/verified-sellers'          },
      { label: 'All Categories',       to: '/catalog'                   },
      { label: 'Business Accounts',    to: '/contact'                   },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us',             to: '/about'                     },
      { label: 'Contact Us',           to: '/contact'                   },
      { label: 'Help Centre',          to: '/help'                      },
      { label: 'Support',              to: '/contact'                   },
      { label: 'Business Enquiries',   to: '/contact'                   },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms & Conditions',   to: '/terms'                     },
      { label: 'Privacy Policy',       to: '/privacy'                   },
      { label: 'Cookie Policy',        to: '/cookies'                   },
      { label: 'Disclaimer',           to: '/disclaimer'                },
      { label: 'Returns Policy',       to: '/returns-policy'            },
      { label: 'Shipping Policy',      to: '/shipping-policy'           },
      { label: 'Buyer Terms',          to: '/buyer-terms'               },
      { label: 'Seller Terms',         to: '/seller-terms'              },
    ],
  },
];

// ── Dashboard mini-footer ─────────────────────────────────────────────────────
function DashboardFooter() {
  return (
    <footer className="lm-footer-dash mt-auto">
      <div className="lm-footer-inner-sm">
        <p className="text-xs text-gray-400">© 2025 {BRAND.name}. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <Link to="/terms"   className="text-xs text-gray-400 hover:text-[#1E3A5F] transition-colors">Terms</Link>
          <Link to="/privacy" className="text-xs text-gray-400 hover:text-[#1E3A5F] transition-colors">Privacy</Link>
          <Link to="/contact" className="text-xs text-gray-400 hover:text-[#1E3A5F] transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}

// ── Main footer ───────────────────────────────────────────────────────────────
export default function Footer() {
  const location = useLocation();

  if (isDashboardRoute(location.pathname)) {
    return <DashboardFooter />;
  }

  return (
    <footer className="lm-footer text-white mt-auto">

      {/* ── ZONE 0 — CTA strip ──────────────────────────────────── */}
      <div className="lm-footer-cta-strip">
        <div className="lm-footer-inner lm-footer-cta-inner">
          <div className="lm-footer-cta-text">
            <p className="lm-footer-cta-headline">
              Start selling on the UK's modern multi-vendor marketplace
            </p>
            <p className="lm-footer-cta-sub">
              Thousands of products. Verified sellers. Secure payments. All in one place.
            </p>
          </div>
          <Link
            to="/shop"
            className="lm-footer-cta-btn"
            aria-label="Browse the Loadify Market marketplace"
          >
            Browse Marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ── ZONE A — Top brand bar ───────────────────────────────────── */}
      <div className="lm-footer-zone-a">
        <div className="lm-footer-inner lm-footer-topbar">
          {/* Brand */}
          <Link to="/" className="lm-footer-brand group" aria-label="Loadify Market homepage">
            <div className="lm-footer-brand-icon">
              <Hexagon className="h-10 w-10 text-[#F4B400] group-hover:scale-105 transition-transform" strokeWidth={1.5} />
              <span className="absolute inset-0 flex items-center justify-center text-[#F4B400] font-bold text-base select-none">L</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">{BRAND.name}</span>
          </Link>

          {/* Trust pills */}
          <div className="lm-footer-trust-pills">
            {FOOTER_TRUST.map(({ Icon, label }) => (
              <div key={label} className="lm-footer-trust-pill">
                <Icon className="h-4 w-4 text-[#F4B400] flex-shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Social */}
          <div className="lm-footer-social">
            {SOCIAL_LINKS.map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="lm-footer-social-link"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── ZONE B — Main link grid ──────────────────────────────────── */}
      <div className="lm-footer-zone-b">
        <div className="lm-footer-inner lm-footer-grid">

          {/* About column */}
          <div className="lm-footer-about-col">
            <h3 className="lm-footer-heading">About Loadify Market</h3>
            <p className="lm-footer-about-desc">
              UK multi-category marketplace connecting buyers and sellers across electronics, fashion, home, tools, and more.
            </p>

            <div className="lm-footer-about-info-group">
              <p className="lm-footer-about-label">Operated by</p>
              <p className="lm-footer-about-value">{BRAND.companyName}</p>
              <p className="lm-footer-about-meta">Co. No: {BRAND.companyNumber}</p>
              <p className="lm-footer-about-meta">VAT: {BRAND.vatNumber}</p>
            </div>

            <div className="lm-footer-about-info-group">
              <div className="lm-footer-about-row">
                <MapPin className="h-3.5 w-3.5 text-[#F4B400] flex-shrink-0 mt-0.5" />
                <address className="not-italic lm-footer-about-meta">
                  101 Cornelian Street<br />Blackburn BB1 9QL, UK
                </address>
              </div>
              <div className="lm-footer-about-row" style={{ marginTop: '8px' }}>
                <Mail className="h-3.5 w-3.5 text-[#F4B400] flex-shrink-0 mt-0.5" />
                <a
                  href={`mailto:${BRAND.supportEmail}`}
                  className="lm-footer-about-meta hover:text-[#F4B400] transition-colors"
                >
                  {BRAND.supportEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map((col) => (
            <div key={col.heading} className="lm-footer-nav-col">
              <h3 className="lm-footer-heading">{col.heading}</h3>
              <ul className="lm-footer-nav-list">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.to}-${link.label}`}>
                    <Link to={link.to} className="lm-footer-link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>
      </div>

      {/* ── ZONE C — Bottom legal strip ──────────────────────────────── */}
      <div className="lm-footer-zone-c">
        <div className="lm-footer-inner lm-footer-bottom">
          <p className="lm-footer-copyright">
            © 2026 {BRAND.name}. All rights reserved.
          </p>
          <div className="lm-footer-bottom-links">
            <Link to="/terms"       className="lm-footer-bottom-link">Terms</Link>
            <span className="lm-footer-bottom-sep" aria-hidden="true">|</span>
            <Link to="/privacy"     className="lm-footer-bottom-link">Privacy</Link>
            <span className="lm-footer-bottom-sep" aria-hidden="true">|</span>
            <Link to="/cookies"     className="lm-footer-bottom-link">Cookies</Link>
            <span className="lm-footer-bottom-sep" aria-hidden="true">|</span>
            <Link to="/disclaimer"  className="lm-footer-bottom-link">Disclaimer</Link>
            <span className="lm-footer-bottom-sep" aria-hidden="true">|</span>
            <Link to="/contact"     className="lm-footer-bottom-link">Contact</Link>
          </div>
          <div className="lm-footer-bottom-social" aria-label="Social media links">
            {SOCIAL_LINKS.map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="lm-footer-bottom-social-link"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {/* Intermediary disclaimer */}
        <div className="lm-footer-inner pb-4">
          <p className="text-xs text-gray-400 text-center">
            Loadify Market is an online marketplace connecting independent buyers and sellers.
            We do not own or sell any products listed on the platform.
            Sellers are solely responsible for their listings.
            Payments are processed securely via{' '}
            <span className="text-gray-300">Stripe</span>.{' '}
            <Link to="/terms" className="underline hover:text-gray-500 transition-colors">Learn more</Link>.
          </p>
        </div>
      </div>

    </footer>
  );
}
