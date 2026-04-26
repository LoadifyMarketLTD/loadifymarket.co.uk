import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section className="bg-[linear-gradient(135deg,#111827,#020617)] border-y border-yellow-400/20 py-8">
      <div className="px-8">
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
