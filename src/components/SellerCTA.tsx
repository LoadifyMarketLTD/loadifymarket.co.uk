import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section className="bg-green-600 py-8">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 xl:px-14">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white font-medium text-base text-center sm:text-left">
            Join UK sellers earning more with 0% commission until 31 December 2026.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/register?type=seller"
              className="bg-white text-green-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
            >
              Create Your Free Seller Account
            </Link>
            <p className="text-white/80 text-sm whitespace-nowrap">
              No fees. No monthly charges. No risk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
