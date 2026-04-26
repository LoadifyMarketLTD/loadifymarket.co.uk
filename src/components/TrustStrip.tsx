import { ShieldCheck, BadgeCheck, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* UK flag SVG inline — no external dep */
const UKFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="h-5 w-auto" aria-label="UK flag">
    <clipPath id="a"><path d="M0 0v30h60V0z"/></clipPath>
    <clipPath id="b"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>
    <g clipPath="url(#a)">
      <path d="M0 0v30h60V0z" fill="#012169"/>
      <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
      <path d="M0 0l60 30m0-30L0 30" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4"/>
      <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
      <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
    </g>
  </svg>
);

interface TrustItem {
  icon?: LucideIcon;
  flag?: boolean;
  label: string;
  sub: string;
}

const ITEMS: TrustItem[] = [
  { icon: ShieldCheck, label: "Secure Payments", sub: "with Stripe" },
  { flag: true,        label: "UK Marketplace",  sub: "Platform" },
  { icon: BadgeCheck,  label: "Seller Verification", sub: "via Stripe" },
  { icon: Percent,     label: "0% Commission",   sub: "Until 31 Dec 2026" },
];

const TrustStrip = () => (
  <div className="bg-[#0A1930]" aria-label="Platform trust features">
    <div className="w-full px-4 sm:px-6 py-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ITEMS.map(({ icon: Icon, flag, label, sub }) => (
          <div key={label} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-4">
            <span className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
              {flag
                ? <UKFlag />
                : Icon && <Icon className="h-5 w-5 text-green-700" aria-hidden="true" />
              }
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">{label}</p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default TrustStrip;
