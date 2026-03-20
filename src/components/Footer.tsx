import { ArrowRight, CheckCircle2, ShieldCheck, Truck, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/loadify-logo.png";

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="hover:text-background transition-colors">
      {children}
    </Link>
  </li>
);


const Footer = () => {
  return (
    <footer>
      {/* Pre-footer CTA bar */}
      <div className="bg-primary/10 border-y border-primary/20">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-display font-semibold text-foreground text-sm sm:text-base">
              Find what you need — or sell what you don't
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Browse thousands of listings from verified sellers across the UK, or start selling today.
            </p>
          </div>
          <Link to="/catalog" className="shrink-0">
            <Button variant="default" size="sm" className="font-semibold">
              Browse Marketplace <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Logo bar with trust badges */}
      <div className="bg-foreground border-b border-background/10">
        <div className="container mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Loadify Market" className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-background">
              Loadify Market
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-background/70">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Verified Sellers
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Secure Platform
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-emerald-400" />
              UK Delivery Support
            </span>
          </div>
          <div className="flex items-center gap-3">
            {[
              { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61583570176707", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
              { label: "Instagram", href: "https://www.instagram.com/loadifymarket/", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
              { label: "LinkedIn", href: "https://www.linkedin.com/company/loadify-market/", path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="w-8 h-8 rounded-full border border-background/20 flex items-center justify-center text-background/50 hover:text-background hover:border-background/40 transition-colors"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d={social.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer links */}
      <div className="bg-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {/* About */}
            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <h4 className="font-display font-semibold text-accent text-sm uppercase tracking-wider mb-4">
                About Loadify Market
              </h4>
              <p className="text-sm text-background/60 leading-relaxed mb-4">
                An open UK marketplace platform where individuals and businesses can buy and sell products across all categories.
              </p>
              <div className="text-xs text-background/40 space-y-1.5">
                <p className="font-semibold text-background/60">Operated by</p>
                <p className="font-semibold text-background/70">XDrive Logistics Ltd</p>
                <p>Co. No: 13171804</p>
                <p>VAT: GB375949535</p>
              </div>
              <div className="mt-4 space-y-2 text-xs text-background/50">
                <p className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  101 Cornelian Street<br />Blackburn BB1 9QL, UK
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-accent shrink-0" />
                  loadifymarket.co.uk@gmail.com
                </p>
              </div>
            </div>

            {/* For Buyers */}
            <div>
              <h4 className="font-display font-semibold text-accent text-sm uppercase tracking-wider mb-4">
                For Buyers
              </h4>
              <ul className="space-y-2 text-sm text-background/60">
                <FooterLink to="/catalog">Browse Marketplace</FooterLink>
                <FooterLink to="/clearance">Clearance &amp; Bulk Deals</FooterLink>
                <FooterLink to="/catalog">Electronics</FooterLink>
                <FooterLink to="/catalog">Fashion &amp; Clothing</FooterLink>
                <FooterLink to="/catalog">Home &amp; Garden</FooterLink>
                <FooterLink to="/catalog">All Categories</FooterLink>
                <FooterLink to="/dashboard/orders">Track Order</FooterLink>
                <FooterLink to="/contact">Help &amp; FAQ</FooterLink>
              </ul>
            </div>

            {/* For Sellers */}
            <div>
              <h4 className="font-display font-semibold text-accent text-sm uppercase tracking-wider mb-4">
                For Sellers
              </h4>
              <ul className="space-y-2 text-sm text-background/60">
                <FooterLink to="/signup">Start Selling</FooterLink>
                <FooterLink to="/seller">Seller Dashboard</FooterLink>
                <FooterLink to="/seller/products">List a Product</FooterLink>
                <FooterLink to="/seller-terms">Seller Fees &amp; Pricing</FooterLink>
                <FooterLink to="/seller-terms">Seller Guidelines</FooterLink>
                <FooterLink to="/#how-it-works">How It Works</FooterLink>
                <FooterLink to="/contact">Partner With Us</FooterLink>
              </ul>
            </div>

            {/* Marketplace */}
            <div>
              <h4 className="font-display font-semibold text-accent text-sm uppercase tracking-wider mb-4">
                Marketplace
              </h4>
              <ul className="space-y-2 text-sm text-background/60">
                <FooterLink to="/buyer-terms">Buyer Protection</FooterLink>
                <FooterLink to="/catalog">Verified Sellers</FooterLink>
                <FooterLink to="/shipping">Shipping &amp; Delivery</FooterLink>
                <FooterLink to="/returns">Returns &amp; Refunds</FooterLink>
                <FooterLink to="/contact">Report a Problem</FooterLink>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-display font-semibold text-accent text-sm uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-2 text-sm text-background/60">
                <FooterLink to="/about">About Us</FooterLink>
                <FooterLink to="/contact">Contact Us</FooterLink>
                <FooterLink to="/contact">Help &amp; Support</FooterLink>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-display font-semibold text-accent text-sm uppercase tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-2 text-sm text-background/60">
                <FooterLink to="/terms">Terms &amp; Conditions</FooterLink>
                <FooterLink to="/privacy">Privacy Policy</FooterLink>
                <FooterLink to="/cookies">Cookie Policy</FooterLink>
                <FooterLink to="/disclaimer">Disclaimer</FooterLink>
                <FooterLink to="/returns">Returns Policy</FooterLink>
                <FooterLink to="/shipping">Shipping Policy</FooterLink>
                <FooterLink to="/buyer-terms">Buyer Terms</FooterLink>
                <FooterLink to="/seller-terms">Seller Terms</FooterLink>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-foreground border-t border-background/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-xs text-background/40 text-center md:text-left">
              <p>© 2026 Loadify Market. All rights reserved.</p>
              <p className="mt-1">
                Loadify Market is an online marketplace platform that connects independent buyers and sellers. We do not own, stock, or sell any products listed on the platform. All listings are created by independent sellers who are solely responsible for their products, pricing and fulfilment. Payments are processed securely via third-party providers.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-background/50 shrink-0">
              <Link to="/terms" className="hover:text-background transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-background transition-colors">Privacy</Link>
              <Link to="/cookies" className="hover:text-background transition-colors">Cookies</Link>
              <Link to="/disclaimer" className="hover:text-background transition-colors">Disclaimer</Link>
              <Link to="/contact" className="hover:text-background transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
