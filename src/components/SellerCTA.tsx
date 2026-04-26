import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section className="bg-[#0B1016] py-8">
      <div className="px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#F5F1E8] font-medium text-base text-center sm:text-left">
            Join UK sellers earning more with 0% commission until 31 December 2026.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/register?type=seller"
              className="bg-[#C99A3E] hover:bg-[#D8AE57] text-[#0B1016] font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm whitespace-nowrap"
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
