import { Link } from "react-router-dom";
import { ShieldCheck, Truck, BadgeCheck, Store, Rocket } from "lucide-react";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Registered", sub: "Sellers" },
  { icon: ShieldCheck, label: "Secure",     sub: "Platform" },
  { icon: Truck,       label: "UK Delivery", sub: "Support" },
  { icon: Store,       label: "Independent", sub: "UK Marketplace" },
];

export default function SellerCTA() {
  return (
    <section className="bg-[linear-gradient(135deg,#111827,#020617)] border-y border-yellow-400/20">

      {/* ── Mobile layout ───────────────────────────────────────────── */}
      <div className="sm:hidden px-4 pt-6 pb-5">

        {/* Heading */}
        <div className="flex items-start gap-3 mb-3">
          <Rocket className="w-7 h-7 text-[#FBBF24] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-white font-bold text-base leading-tight">
              Start Selling for <span className="text-[#FBBF24]">FREE</span>
            </p>
            <p className="text-[12px] text-slate-400 mt-0.5 leading-snug">
              Join UK sellers earning more with 0% commission until 31 Dec 2026.
            </p>
          </div>
        </div>

        {/* CTA button */}
        <Link
          to="/register?type=seller"
          className="block w-full bg-[linear-gradient(135deg,#FBBF24,#D97706)] text-[#020617] font-bold py-3 rounded-xl text-sm text-center mb-2"
        >
          Create Your Free Seller Account
        </Link>
        <p className="text-center text-[11px] text-slate-500 mb-4">
          No fees. No monthly charges. No risk.
        </p>

        {/* Trust badges row */}
        <div className="grid grid-cols-4 gap-1.5">
          {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-[#0B1220] border border-white/[0.07] flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#FBBF24]" aria-hidden="true" />
              </div>
              <p className="text-[9px] font-semibold text-white/80 text-center leading-tight">{label}</p>
              <p className="text-[9px] text-slate-400 text-center leading-tight">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop layout ──────────────────────────────────────────── */}
      <div className="hidden sm:block px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#F5F1E8] font-medium text-base text-center sm:text-left">
            Join UK sellers earning more with 0% commission until 31 December 2026.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/register?type=seller"
              data-magnetic
              className="bg-[linear-gradient(135deg,#FBBF24,#D97706)] hover:shadow-[0_0_22px_rgba(251,191,36,0.25)] hover:-translate-y-0.5 text-[#020617] font-bold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm whitespace-nowrap"
            >
              Create Your Free Seller Account
            </Link>
            <p className="text-[#C9D0D6]/80 text-sm whitespace-nowrap">
              No fees. No monthly charges. No risk.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
