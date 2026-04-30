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
  { icon: BadgeCheck,  label: "Stripe Verified", sub: "Platform" },
  { flag: true,        label: "UK Marketplace",  sub: "Platform" },
  { icon: Percent,     label: "0% Commission",   sub: "Until 31 Dec 2026" },
];

const TrustStrip = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6" aria-label="Platform trust features">
    {ITEMS.map(({ icon: Icon, flag, label, sub }) => (
      <div
        key={label}
        className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-white/5 bg-[linear-gradient(145deg,#0F172A,#020617)] px-3 sm:px-5 py-3 sm:py-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(251,191,36,0.15)] hover:border-yellow-400/25"
      >
        <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 overflow-hidden">
          {flag
            ? <UKFlag />
            : Icon && (
                <Icon
                  className="h-5 w-5 sm:h-6 sm:w-6 text-[#FBBF24]"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.4))' }}
                  aria-hidden="true"
                />
              )
          }
        </span>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-sm font-semibold text-white leading-tight">{label}</p>
          <p className="text-[10px] sm:text-xs text-slate-400 leading-tight mt-0.5">{sub}</p>
        </div>
      </div>
    ))}
  </div>
);

export default TrustStrip;
