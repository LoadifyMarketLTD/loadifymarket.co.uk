import { ShieldCheck, BadgeCheck, Percent } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* UK flag SVG inline — no external dep */
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
  { icon: ShieldCheck, label: "Secure Payments", sub: "with Stripe" },
  { icon: BadgeCheck,  label: "Stripe Verified", sub: "Platform" },
  { flag: true,        label: "UK Marketplace",  sub: "Platform" },
  { icon: Percent,     label: "0% Commission",   sub: "Until 31 Dec 2026" },
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
          /* layout */
          "flex items-center gap-2.5 sm:gap-3",
          /* shape — mobile: 16px radius; desktop: 2xl */
          "rounded-2xl",
          /* background — mobile: #12121A solid; desktop: gradient */
          "bg-[#12121A] sm:bg-[linear-gradient(145deg,#0F172A,#020617)]",
          /* border — mobile: faint white; desktop: same then hover changes it */
          "border border-white/[0.07] sm:border-white/5",
          /* padding — mobile: 14px; desktop: px-5 py-4 */
          "p-[14px] sm:px-5 sm:py-4",
          /* desktop hover */
          "transition-all duration-300",
          "sm:hover:-translate-y-1 sm:hover:shadow-[0_0_25px_rgba(251,191,36,0.15)] sm:hover:border-yellow-400/25",
        ].join(" ")}
      >
        <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 overflow-hidden">
          {flag
            ? <UKFlag />
            : Icon && (
                <Icon
                  className="h-[18px] w-[18px] sm:h-6 sm:w-6 text-[#F5B942] sm:text-[#FBBF24]"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(245,185,66,0.4))' }}
                  aria-hidden="true"
                />
              )
          }
        </span>
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-white leading-tight">{label}</p>
          <p className="text-[11px] sm:text-xs text-[#A0A0A0] sm:text-slate-400 leading-tight mt-0.5">{sub}</p>
        </div>
      </div>
    ))}
  </div>
);

export default TrustStrip;
