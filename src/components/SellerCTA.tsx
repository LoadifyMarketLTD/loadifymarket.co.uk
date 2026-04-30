import { Link } from "react-router-dom";
import { Rocket } from "lucide-react";

export default function SellerCTA() {
  return (
    <section className="bg-[linear-gradient(135deg,#111827,#020617)] border-y border-yellow-400/20">

      {/* ── Mobile layout ───────────────────────────────────────────── */}
      <div className="sm:hidden px-4 py-8 text-center">

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0B1220] border border-[#FBBF24]/20 flex items-center justify-center">
            <Rocket className="w-7 h-7 text-[#FBBF24]" aria-hidden="true" />
          </div>
        </div>

        {/* Heading */}
        <p className="text-white font-extrabold text-2xl leading-tight mb-2">
          Start Selling for <span className="text-[#FBBF24]">FREE</span>
        </p>

        {/* Subtext */}
        <p className="text-[13px] text-slate-400 mb-6 leading-relaxed mx-auto max-w-[260px]">
          List products, receive offers, get paid securely.
        </p>

        {/* Gold CTA button */}
        <Link
          to="/register?type=seller"
          className="inline-flex items-center justify-center w-full bg-[linear-gradient(135deg,#FBBF24,#D97706)] text-[#020617] font-bold py-3.5 px-6 rounded-xl text-base shadow-[0_0_22px_rgba(251,191,36,0.25)] transition-all hover:-translate-y-0.5"
        >
          Become a Seller
        </Link>

        <p className="text-[11px] text-slate-500 mt-3">
          No fees. No monthly charges. No risk.
        </p>
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
