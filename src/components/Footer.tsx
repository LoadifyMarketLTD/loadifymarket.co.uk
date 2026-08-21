import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, ShieldCheck, Store, Truck, Twitter } from "lucide-react";
import SocialCard from "@/components/ui/SocialCard";
import TikTokIcon from "@/components/ui/TikTokIcon";

const ColHeading = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#F5A300]">{children}</p>
);

const FooterLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <Link to={to} className="text-[13px] text-white/70 transition-colors duration-150 hover:text-white">
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

const SocialLinks = () => (
  <div className="flex items-center gap-2.5">
    <SocialCard href="https://www.facebook.com/profile.php?id=61583570176707" label="Loadify Market on Facebook" Icon={Facebook} platform="facebook" size="footer" />
    <SocialCard href="https://www.twitter.com/loadifymarket" label="Loadify Market on X / Twitter" Icon={Twitter} platform="twitter" size="footer" />
    <SocialCard href="https://www.instagram.com/loadifymarket" label="Loadify Market on Instagram" Icon={Instagram} platform="instagram" size="footer" />
    <SocialCard href="https://www.tiktok.com/@loadifymarket" label="Loadify Market on TikTok" Icon={TikTokIcon} platform="tiktok" size="footer" />
    <SocialCard href="https://www.linkedin.com/company/loadify-market" label="Loadify Market on LinkedIn" Icon={Linkedin} platform="linkedin" size="footer" />
  </div>
);

const Footer = () => (
  <footer className="bg-[#F7F9FC] px-4 pb-4 sm:px-6 sm:pb-10 lg:px-10">
    <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[30px] border border-[#0A234F]/10 bg-[#0A234F] text-white shadow-[0_22px_60px_rgba(10,35,79,0.17)]">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-[#F5A300]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#1D57D8]/25 blur-3xl" aria-hidden="true" />

      <div className="relative sm:hidden">
        <div className="border-b border-white/10 bg-white/[0.045] px-5 pb-5 pt-5">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-semibold text-white/72">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#F5A300]" aria-hidden="true" />Stripe-powered checkout</span>
            <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-[#F5A300]" aria-hidden="true" />Order tracking</span>
            <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-[#F5A300]" aria-hidden="true" />UK operated</span>
          </div>
          <div className="mt-4 overflow-x-auto pb-1">
            <SocialLinks />
          </div>
        </div>

        <div className="px-5 py-6">
          <p className="text-lg font-black tracking-[-0.02em]">Loadify Market</p>
          <p className="mt-2 text-[12px] leading-5 text-white/72">
            A UK-operated marketplace where customers can discover and purchase products and approved sellers can build their catalogue and manage marketplace orders.
          </p>
          <div className="mt-4 grid gap-1 text-[10px] leading-4 text-white/60">
            <span>XDrive Logistics Ltd · Company No. 13171804</span>
            <span>VAT GB375949535 · Blackburn BB1 9QL, UK</span>
            <a href="mailto:contact@loadifymarket.co.uk" className="hover:text-white">contact@loadifymarket.co.uk</a>
            <a href="tel:+447423272138" className="hover:text-white">+44 7423 272138</a>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-x-7 gap-y-7 border-t border-white/10 pt-6">
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

            <div className="col-span-2 border-t border-white/10 pt-6">
              <ColHeading>Loadify</ColHeading>
              <ul className="grid grid-cols-2 gap-x-7 gap-y-2.5">
                <FooterLink to="/about">About Us</FooterLink>
                <FooterLink to="/contact">Contact Us</FooterLink>
                <FooterLink to="/contact">Partner With Us</FooterLink>
                <FooterLink to="/shipping">Shipping &amp; Delivery</FooterLink>
                <FooterLink to="/contact">Report a Problem</FooterLink>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-white/[0.045] px-5 py-5">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-[9px] font-semibold text-white/62 hover:text-white/90">
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-white/10 pt-4 text-[10px] leading-4 text-white/60">
            <p>&copy; 2021 XDrive Logistics Ltd. Loadify Market is a trading name of XDrive Logistics Ltd, registered in England &amp; Wales.</p>
            <p className="mt-2">Transaction-specific seller, fulfilment, delivery and return terms apply.</p>
          </div>
        </div>
      </div>

      <div className="relative hidden sm:block">
        <div className="border-b border-white/10 bg-white/[0.045]">
          <div className="mx-auto flex flex-col items-start justify-between gap-4 px-6 py-5 lg:flex-row lg:items-center lg:px-8">
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-[12px] font-semibold text-white/72">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />Stripe-powered checkout</span>
              <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />Order tracking</span>
              <span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />UK operated</span>
            </div>
            <SocialLinks />
          </div>
        </div>

        <div className="px-6 py-9 lg:px-8 lg:py-10">
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-[1.7fr_0.8fr_0.8fr_0.9fr]">
            <div className="col-span-2 max-w-xl lg:col-span-1">
              <p className="text-xl font-black tracking-[-0.02em] text-white">Loadify Market</p>
              <p className="mt-3 max-w-lg text-[13px] leading-6 text-white/72">
                A UK-operated marketplace where customers can discover and purchase products and approved sellers can build their catalogue and manage marketplace orders.
              </p>
              <div className="mt-5 grid gap-1 text-[11px] leading-5 text-white/62 sm:grid-cols-2 lg:grid-cols-1">
                <span>XDrive Logistics Ltd · Company No. 13171804</span>
                <span>VAT GB375949535 · Blackburn BB1 9QL, UK</span>
                <a href="mailto:contact@loadifymarket.co.uk" className="transition-colors hover:text-white">contact@loadifymarket.co.uk</a>
                <a href="tel:+447423272138" className="transition-colors hover:text-white">+44 7423 272138</a>
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

        <div className="border-t border-white/10 bg-white/[0.045]">
          <div className="px-6 py-5 lg:px-8">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <Link key={link.to} to={link.to} className="text-[10px] font-semibold text-white/62 transition-colors hover:text-white/90">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4 text-[11px] leading-5 text-white/62 lg:flex-row lg:items-center lg:justify-between">
              <p>&copy; 2021 XDrive Logistics Ltd. Loadify Market is a trading name of XDrive Logistics Ltd, registered in England &amp; Wales.</p>
              <p className="lg:text-right">Transaction-specific seller, fulfilment, delivery and return terms apply.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
