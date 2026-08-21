import { ShieldCheck, BadgeCheck, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const UKFlag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="h-[18px] sm:h-5 w-auto" aria-label="UK flag">
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
  { icon: ShieldCheck, label: "Secure Checkout", sub: "Powered by Stripe" },
  { icon: BadgeCheck,  label: "Seller Accounts", sub: "Profile checks" },
  { flag: true,        label: "UK Marketplace",  sub: "Built for UK trade" },
  { icon: Percent,     label: "0% Seller Fee",   sub: "Until 31 Dec 2026" },
];

const TrustStrip = () => (
  <div
    className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6"
    aria-label="Platform trust features"
  >
    {ITEMS.map(({ icon: Icon, flag, label, sub }) => (
      <div
        key={label}
        className={[
          "flex items-center gap-2.5 sm:gap-3",
          "rounded-2xl",
          "bg-[#0A234F]",
          "border border-white/10",
          "p-[14px] sm:px-5 sm:py-4",
          "transition-all duration-300",
          "sm:hover:-translate-y-1 sm:hover:shadow-[0_0_25px_rgba(29,87,216,0.24)] sm:hover:border-[#F5A300]/40",
        ].join(" ")}
        style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(29,87,216,0.24), transparent 46%)' }}
      >
        <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 overflow-hidden">
          {flag
            ? <UKFlag />
            : Icon && (
                <Icon
                  className="h-[18px] w-[18px] sm:h-6 sm:w-6 text-[#F5A300]"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(245,163,0,0.32))' }}
                  aria-hidden="true"
                />
              )
          }
        </span>
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-white leading-tight">{label}</p>
          <p className="text-[11px] sm:text-xs text-white/62 leading-tight mt-0.5">{sub}</p>
        </div>
      </div>
    ))}
  </div>
);

export default TrustStrip;
