import { ArrowRight, CheckCircle2, ShieldCheck, Truck, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/loadify-logo.svg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="hover:text-background transition-colors">
      {children}
    </Link>
  </li>
);

const FOOTER_SECTIONS = [
  {
    id: "buyers",
    title: "For Buyers",
    links: [
      { to: "/catalog", label: "Browse Marketplace" },
      { to: "/trade-account", label: "Trade Account" },
      { to: "/category/health-beauty", label: "Health & Beauty" },
      { to: "/category/wholesale-clothing", label: "Wholesale Clothing" },
      { to: "/category/kitchenware", label: "Kitchenware" },
      { to: "/catalog", label: "All Categories" },
      { to: "/track-order", label: "Track Order" },
      { to: "/faq", label: "Help & FAQ" },
    ],
  },
  {
    id: "sellers",
    title: "For Sellers",
    links: [
      { to: "/signup", label: "Start Selling" },
      { to: "/seller", label: "Seller Dashboard" },
      { to: "/seller/products", label: "List a Product" },
      { to: "/seller-terms", label: "Seller Fees & Pricing" },
      { to: "/seller-guidelines", label: "Seller Guidelines" },
      { to: "/#how-it-works", label: "How It Works" },
      { to: "/contact", label: "Partner With Us" },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace",
    links: [
      { to: "/buyer-terms", label: "Buyer Terms" },
      { to: "/catalog", label: "Browse Sellers" },
      { to: "/shipping", label: "Shipping & Delivery" },
      { to: "/returns", label: "Returns & Refunds" },
      { to: "/contact", label: "Report a Problem" },
    ],
  },
  {
    id: "company",
    title: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/contact", label: "Contact Us" },
      { to: "/contact", label: "Help & Support" },
    ],
  },
  {
    id: "legal",
    title: "Legal",
    links: [
      { to: "/terms", label: "Terms & Conditions" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/cookies", label: "Cookie Policy" },
      { to: "/disclaimer", label: "Disclaimer" },
      { to: "/acceptable-use-policy", label: "Acceptable Use Policy" },
      { to: "/returns", label: "Returns Policy" },
      { to: "/shipping", label: "Shipping Policy" },
      { to: "/buyer-terms", label: "Buyer Terms" },
      { to: "/seller-terms", label: "Seller Terms" },
    ],
  },
];


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
              Browse listings from registered sellers across the UK, or start selling today.
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
            <span className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold text-background">Loadify</span>
              <span className="font-display text-sm font-bold text-[#22C55E]">Market</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-background/70">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Registered Sellers
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
      <div className="bg-foreground py-8">
        <div className="container mx-auto px-4">

          {/* ── Mobile: accordion ────────────────────────────────────── */}
          <div className="md:hidden">
            {/* About block — always visible on mobile */}
            <div className="pb-6 mb-2 border-b border-background/10">
              <p className="text-sm text-background/60 leading-relaxed mb-3">
                An open UK marketplace connecting buyers and sellers across all categories.
              </p>
              <p className="text-xs text-background/55 leading-relaxed mb-3">
                Loadify Market is operated by{" "}
                <span className="font-semibold text-background/75">XDrive Logistics Ltd</span>,
                the legal entity responsible for this platform.
              </p>
              <div className="text-xs text-background/40 space-y-1 mb-3">
                <p>Co. No: 13171804 &nbsp;·&nbsp; VAT: GB375949535</p>
              </div>
              <div className="space-y-1.5 text-xs text-background/50">
                <p className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  101 Cornelian Street, Blackburn BB1 9QL, UK
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-accent shrink-0" />
                  loadifymarket.co.uk@gmail.com
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                  +44 7423 272138
                </p>
              </div>
            </div>

            <Accordion type="multiple" className="w-full">
              {FOOTER_SECTIONS.map((section) => (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border-b border-background/10"
                >
                  <AccordionTrigger className="text-sm font-semibold text-accent uppercase tracking-wider py-3 hover:no-underline">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2.5 text-sm text-background/60 pb-2">
                      {section.links.map((link) => (
                        <FooterLink key={link.to + link.label} to={link.to}>
                          {link.label}
                        </FooterLink>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* ── Desktop: grid ─────────────────────────────────────────── */}
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-8">
            {/* About */}
            <div className="col-span-1 lg:col-span-1">
              <h4 className="font-display font-semibold text-accent text-sm uppercase tracking-wider mb-4">
                About Loadify Market
              </h4>
              <p className="text-sm text-background/60 leading-relaxed mb-3">
                An open UK marketplace connecting buyers and sellers across all categories.
              </p>
              <p className="text-xs text-background/55 leading-relaxed mb-3">
                Loadify Market is operated by{' '}
                <span className="font-semibold text-background/75">XDrive Logistics Ltd</span>,
                the legal entity responsible for this platform, its services, payments, and marketplace operations.
              </p>
              <div className="text-xs text-background/40 space-y-1">
                <p>Co. No: 13171804 &nbsp;·&nbsp; VAT: GB375949535</p>
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
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                  +44 7423 272138
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
                <FooterLink to="/category/health-beauty">Health &amp; Beauty</FooterLink>
                <FooterLink to="/category/wholesale-clothing">Wholesale Clothing</FooterLink>
                <FooterLink to="/category/kitchenware">Kitchenware</FooterLink>
                <FooterLink to="/catalog">All Categories</FooterLink>
                <FooterLink to="/track-order">Track Order</FooterLink>
                <FooterLink to="/faq">Help &amp; FAQ</FooterLink>
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
                <FooterLink to="/seller-guidelines">Seller Guidelines</FooterLink>
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
                <FooterLink to="/buyer-terms">Buyer Terms</FooterLink>
                <FooterLink to="/catalog">Browse Sellers</FooterLink>
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
                <FooterLink to="/acceptable-use-policy">Acceptable Use Policy</FooterLink>
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
              <p>© 2026 Loadify Market. Operated by XDrive Logistics Ltd. All rights reserved.</p>
              <p className="mt-1">
                Loadify Market does not hold inventory. All products are listed and fulfilled by independent sellers. The platform connects buyers and sellers and processes payments as an intermediary — it does not own, stock, or dispatch any products. Sellers are solely responsible for their listings, pricing and fulfilment.
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
