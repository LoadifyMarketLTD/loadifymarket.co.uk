import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, ShieldCheck, Store, Truck, Twitter } from "lucide-react";
import SocialCard from "@/components/ui/SocialCard";
import TikTokIcon from "@/components/ui/TikTokIcon";

const ColHeading = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-primary">{children}</p>
);

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="text-[13px] text-muted-foreground transition-colors duration-150 hover:text-white">
      {children}
    </Link>
  </li>
);

const legalLinks = [
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/cookies", label: "Cookies" },
  { to: "/disclaimer", label: "Disclaimer" },
  { to: "/acceptable-use-policy", label: "Acceptable Use" },
  { to: "/prohibited-items-policy", label: "Prohibited Items" },
  { to: "/seller-verification-policy", label: "Seller Verification" },
  { to: "/ip-trademark-complaints", label: "IP Complaints" },
  { to: "/returns-policy", label: "Returns Policy" },
  { to: "/shipping-policy", label: "Shipping Policy" },
  { to: "/buyer-terms", label: "Buyer Terms" },
  { to: "/seller-terms", label: "Seller Terms" },
];

const Footer = () => (
  <footer className="border-t border-white/[0.06] bg-surface text-muted-foreground">
    <div className="sm:hidden flex flex-col items-center gap-3 px-4 py-5">
      <div className="flex flex-wrap items-center justify-center gap-5">
        <Link to="/terms" className="text-[13px] text-white/75">Terms</Link>
        <Link to="/privacy" className="text-[13px] text-white/75">Privacy</Link>
        <Link to="/contact" className="text-[13px] text-white/75">Support</Link>
      </div>
      <p className="text-center text-[12px] text-white/60">&copy; {new Date().getFullYear()} Loadify Market</p>
    </div>

    <div className="hidden sm:block">
      <div className="border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-5 lg:flex-row lg:items-center lg:px-8">
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[12px] font-semibold text-white/60">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />Stripe-powered checkout</span>
            <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-primary" aria-hidden="true" />Order tracking</span>
            <span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-primary" aria-hidden="true" />UK operated</span>
          </div>
          <div className="flex items-center gap-2.5">
            <SocialCard href="https://www.facebook.com/profile.php?id=61583570176707" label="Loadify Market on Facebook" Icon={Facebook} platform="facebook" size="footer" />
            <SocialCard href="https://www.twitter.com/loadifymarket" label="Loadify Market on X / Twitter" Icon={Twitter} platform="twitter" size="footer" />
            <SocialCard href="https://www.instagram.com/loadifymarket" label="Loadify Market on Instagram" Icon={Instagram} platform="instagram" size="footer" />
            <SocialCard href="https://www.tiktok.com/@loadifymarket" label="Loadify Market on TikTok" Icon={TikTokIcon} platform="tiktok" size="footer" />
            <SocialCard href="https://www.linkedin.com/company/loadify-market" label="Loadify Market on LinkedIn" Icon={Linkedin} platform="linkedin" size="footer" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-9 lg:px-8 lg:py-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr]">
          <div className="col-span-2 max-w-xl lg:col-span-1">
            <p className="text-xl font-black tracking-[-0.02em] text-white">Loadify Market</p>
            <p className="mt-3 max-w-lg text-[13px] leading-6 text-white/60">
              A UK-operated marketplace where customers can discover and purchase products and approved sellers can build their catalogue and manage marketplace orders.
            </p>
            <div className="mt-5 grid gap-1 text-[11px] leading-5 text-white/60 sm:grid-cols-2 lg:grid-cols-1">
              <span>XDrive Logistics Ltd · Company No. 13171804</span>
              <span>VAT GB375949535 · Blackburn BB1 9QL, UK</span>
              <a href="mailto:contact@loadifymarket.co.uk" className="transition-colors hover:text-white/80">contact@loadifymarket.co.uk</a>
              <a href="tel:+447423272138" className="transition-colors hover:text-white/80">+44 7423 272138</a>
            </div>
          </div>

          <div>
            <ColHeading>Shop</ColHeading>
            <ul className="space-y-2.5">
              <FooterLink to="/catalog">Browse Marketplace</FooterLink>
              <FooterLink to="/catalog">All Categories</FooterLink>
              <FooterLink to="/track-order">Track Order</FooterLink>
              <FooterLink to="/returns">Returns &amp; Refunds</FooterLink>
              <FooterLink to="/faq">Help &amp; FAQ</FooterLink>
            </ul>
          </div>

          <div>
            <ColHeading>Sell</ColHeading>
            <ul className="space-y-2.5">
              <FooterLink to="/register?type=seller">Start Selling</FooterLink>
              <FooterLink to="/seller">Seller Dashboard</FooterLink>
              <FooterLink to="/seller/products/new">List a Product</FooterLink>
              <FooterLink to="/seller-terms">Seller Fees &amp; Pricing</FooterLink>
              <FooterLink to="/seller-guidelines">Seller Guidelines</FooterLink>
            </ul>
          </div>

          <div>
            <ColHeading>Loadify</ColHeading>
            <ul className="space-y-2.5">
              <FooterLink to="/about">About Us</FooterLink>
              <FooterLink to="/contact">Contact Us</FooterLink>
              <FooterLink to="/contact">Partner With Us</FooterLink>
              <FooterLink to="/shipping">Shipping &amp; Delivery</FooterLink>
              <FooterLink to="/contact">Report a Problem</FooterLink>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {legalLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-[10px] font-semibold text-white/60 transition-colors hover:text-white/85">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.05] pt-4 text-[11px] leading-5 text-white/60 lg:flex-row lg:items-center lg:justify-between">
            <p>&copy; 2021 XDrive Logistics Ltd. Loadify Market is a trading name of XDrive Logistics Ltd, registered in England &amp; Wales.</p>
            <p className="lg:text-right">Transaction-specific seller, fulfilment, delivery and return terms apply.</p>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
