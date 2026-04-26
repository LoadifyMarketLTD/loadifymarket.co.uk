import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section className="py-24 bg-green-600 text-white">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Start Selling on Loadify Market Today
        </h2>
        <p className="text-xl text-white mb-10">
          Join UK sellers earning more with 0% commission until 1 July 2026.
        </p>
        <div className="flex justify-center">
          <Link
            to="/register-seller"
            className="w-full sm:w-auto bg-white text-green-700 font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity"
          >
            Create Your Free Seller Account
          </Link>
        </div>
        <p className="text-sm text-white mt-4">
          No fees. No monthly charges. No risk.
        </p>
      </div>
    </section>
  );
}
