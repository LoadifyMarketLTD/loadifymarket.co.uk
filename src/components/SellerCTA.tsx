import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section
      className="mx-4 my-4 rounded-2xl border border-[#FBBF24]/20 py-6 px-5 text-center"
      style={{ background: "linear-gradient(135deg, #111827, #0B0F1A)" }}
    >
      <p className="text-white font-bold text-base mb-1">
        Start selling today
      </p>
      <p className="text-slate-400 text-xs mb-4">
        0% commission — no monthly charges.
      </p>
      <Link
        to="/register?type=seller"
        className="inline-flex items-center justify-center bg-[#FBBF24] hover:bg-[#F59E0B] text-[#0B0F1A] font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_14px_rgba(251,191,36,0.25)]"
      >
        Start Selling (0% fees)
      </Link>
    </section>
  );
}
