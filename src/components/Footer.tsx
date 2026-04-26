import { Link } from "react-router-dom";
import { ShieldCheck, Store, Truck, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import SocialCard from "@/components/ui/SocialCard";

// ─── helpers ────────────────────────────────────────────────────────────────

const ColHeading = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-bold tracking-widest uppercase text-[#C99A3E] mb-4">
    {children}
  </p>
);

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link
      to={to}
      className="text-[13px] text-[#C9D0D6]/70 hover:text-[#D8AE57] transition-colors duration-150"
    >
      {children}
    </Link>
  </li>
);

// ─── Footer ──────────────────────────────────────────────────────────────────

const Footer = () => {
  return (
    <footer className="bg-[linear-gradient(180deg,#0B1220,#020617)] text-[#C9D0D6] border-t border-white/[0.06]">

      {/* ── Trust row ───────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-[#C9D0D6]">
              <ShieldCheck className="h-5 w-5 text-[#C99A3E] shrink-0" />
              Registered Sellers
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#C9D0D6]">
              <ShieldCheck className="h-5 w-5 text-[#C99A3E] shrink-0" />
              Secure Platform
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#C9D0D6]">
              <Truck className="h-5 w-5 text-[#C99A3E] shrink-0" />
              UK Delivery Support
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#C9D0D6]">
              <Store className="h-5 w-5 text-[#C99A3E] shrink-0" />
              Independent UK Marketplace
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SocialCard href="https://www.facebook.com/loadifymarket"          label="Loadify Market on Facebook"   Icon={Facebook}  platform="facebook"  size="footer" />
            <SocialCard href="https://www.twitter.com/loadifymarket"           label="Loadify Market on X / Twitter" Icon={Twitter}   platform="twitter"   size="footer" />
            <SocialCard href="https://www.instagram.com/loadifymarket"         label="Loadify Market on Instagram"   Icon={Instagram} platform="instagram" size="footer" />
            <SocialCard href="https://www.linkedin.com/company/loadifymarket"  label="Loadify Market on LinkedIn"    Icon={Linkedin}  platform="linkedin"  size="footer" />
          </div>
        </div>
      </div>

      {/* ── Main columns ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 lg:gap-6">

          {/* Col 1 — About (spans 2 columns on lg) */}
          <div className="lg:col-span-2">
            <p className="text-lg font-bold text-[#F5F1E8] mb-3">Loadify Market</p>
            <p className="text-[13px] text-[#C9D0D6]/70 leading-relaxed mb-4">
              Loadify Market is operated by <strong className="text-[#C9D0D6]">XDrive Logistics Ltd</strong>.
              We are a marketplace that connects buyers with independent sellers across the UK.
              Loadify Market does not own, stock, sell, or ship any products — all orders are
              fulfilled directly by the independent seller.
            </p>
            <ul className="space-y-1 text-[12px] text-[#C9D0D6]/55">
              <li>Company No. 13171804</li>
              <li>VAT GB375949535</li>
              <li>101 Cornelian Street, Blackburn BB1 9QL, UK</li>
              <li>
                <a href="mailto:contact@loadifymarket.co.uk" className="hover:text-white/70 transition-colors">
                  contact@loadifymarket.co.uk
                </a>
              </li>
              <li>
                <a href="tel:+447423272138" className="hover:text-white/70 transition-colors">
                  +44 7423 272138
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2 — For Buyers */}
          <div>
            <ColHeading>For Buyers</ColHeading>
            <ul className="space-y-2.5">
              <FooterLink to="/catalog">Browse Marketplace</FooterLink>
              <FooterLink to="/category/health-beauty">Health &amp; Beauty</FooterLink>
              <FooterLink to="/wholesale-info">Wholesale Clothing</FooterLink>
              <FooterLink to="/category/kitchen-dining">Kitchenware</FooterLink>
              <FooterLink to="/catalog">All Categories</FooterLink>
              <FooterLink to="/track-order">Track Order</FooterLink>
              <FooterLink to="/faq">Help &amp; FAQ</FooterLink>
            </ul>
          </div>

          {/* Col 3 — For Sellers */}
          <div>
            <ColHeading>For Sellers</ColHeading>
            <ul className="space-y-2.5">
              <FooterLink to="/register">Start Selling</FooterLink>
              <FooterLink to="/seller">Seller Dashboard</FooterLink>
              <FooterLink to="/seller/products/new">List a Product</FooterLink>
              <FooterLink to="/seller-terms">Seller Fees &amp; Pricing</FooterLink>
              <FooterLink to="/seller-guidelines">Seller Guidelines</FooterLink>
              <FooterLink to="/#how-it-works-sellers">How It Works</FooterLink>
              <FooterLink to="/contact">Partner With Us</FooterLink>
            </ul>
          </div>

          {/* Col 4 — Marketplace */}
          <div>
            <ColHeading>Marketplace</ColHeading>
            <ul className="space-y-2.5">
              <FooterLink to="/buyer-terms">Buyer Terms</FooterLink>
              <FooterLink to="/shipping">Shipping &amp; Delivery</FooterLink>
              <FooterLink to="/returns">Returns &amp; Refunds</FooterLink>
              <FooterLink to="/contact">Report a Problem</FooterLink>
            </ul>

            <p className="text-[11px] font-bold tracking-widest uppercase text-[#C99A3E] mt-7 mb-4">
              Company
            </p>
            <ul className="space-y-2.5">
              <FooterLink to="/about">About Us</FooterLink>
              <FooterLink to="/contact">Contact Us</FooterLink>
              <FooterLink to="/faq">Help &amp; Support</FooterLink>
            </ul>
          </div>

          {/* Col 5 — Legal */}
          <div>
            <ColHeading>Legal</ColHeading>
            <ul className="space-y-2.5">
              <FooterLink to="/terms">Terms &amp; Conditions</FooterLink>
              <FooterLink to="/privacy">Privacy Policy</FooterLink>
              <FooterLink to="/cookies">Cookie Policy</FooterLink>
              <FooterLink to="/disclaimer">Disclaimer</FooterLink>
              <FooterLink to="/acceptable-use-policy">Acceptable Use Policy</FooterLink>
              <FooterLink to="/returns-policy">Returns Policy</FooterLink>
              <FooterLink to="/shipping-policy">Shipping Policy</FooterLink>
              <FooterLink to="/buyer-terms">Buyer Terms</FooterLink>
              <FooterLink to="/seller-terms">Seller Terms</FooterLink>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.07]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">

          <p className="text-[12px] text-[#C9D0D6]/45">
            &copy; 2021 XDrive Logistics Ltd (Company No. 13171804). All rights reserved.
            Loadify Market is a trading name of XDrive Logistics Ltd, registered in England &amp; Wales.
          </p>

          <p className="text-[12px] text-[#C9D0D6]/45 lg:text-right">
            Payments secured by Stripe · Independent sellers fulfil all orders ·
            Loadify Market is not a seller or retailer.
          </p>

        </div>

        {/* Quick legal links bar */}
        <div className="border-t border-white/[0.05]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap gap-x-5 gap-y-1">
            {[
              { to: "/terms", label: "Terms" },
              { to: "/privacy", label: "Privacy" },
              { to: "/cookies", label: "Cookies" },
              { to: "/disclaimer", label: "Disclaimer" },
              { to: "/acceptable-use-policy", label: "Acceptable Use" },
              { to: "/buyer-terms", label: "Buyer Terms" },
              { to: "/seller-terms", label: "Seller Terms" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-[11px] text-[#C9D0D6]/40 hover:text-[#C9D0D6]/70 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
