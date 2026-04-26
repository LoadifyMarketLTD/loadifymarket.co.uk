import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

          {/* LEFT COLUMN — text content */}
          <div className="md:col-span-5 flex flex-col gap-6">

            {/* 1. Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-600 text-white text-sm font-semibold w-fit">
              ⚡ 0% Commission Until 1 July 2026
            </span>

            {/* 2. Label */}
            <p className="text-sm text-gray-500">UK Multi‑Category Marketplace</p>

            {/* 3. H1 */}
            <h1 className="text-5xl font-bold leading-tight max-w-xl text-gray-900">
              Sell Across the UK — Reach More Buyers
            </h1>

            {/* 4. Subheading */}
            <p className="text-lg text-gray-700 max-w-lg">
              List your products or services for free and connect with verified UK buyers. No setup fees, no monthly charges.
            </p>

            {/* 5. Bullet list */}
            <ul className="flex flex-col gap-2">
              <li className="flex items-start gap-2 text-base text-gray-700">✔ Free to list — no hidden fees</li>
              <li className="flex items-start gap-2 text-base text-gray-700">✔ 0% commission until 1 July 2026</li>
              <li className="flex items-start gap-2 text-base text-gray-700">✔ Fast Stripe payouts to your bank</li>
            </ul>

            {/* 6 & 7. CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/register?type=seller"
                className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition text-center w-full sm:w-auto"
              >
                Start Selling — It's Free
              </Link>
              <Link
                to="/register"
                className="border border-green-600 text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-green-50 transition text-center w-full sm:w-auto"
              >
                Create Buyer Account
              </Link>
            </div>

            {/* 8. Social proof */}
            <p className="text-sm text-gray-500 mt-4">
              Join our early sellers — priority homepage placement for new sellers.
            </p>

          </div>

          {/* RIGHT COLUMN — image + overlay + trust strip */}
          <div className="md:col-span-7 relative w-full h-full">

            {/* Image */}
            <img
              src="/hero-marketplace.jpg"
              alt="Loadify Market — UK Online Marketplace"
              className="w-full object-cover rounded-xl"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white pointer-events-none rounded-xl" />

            {/* Trust strip */}
            <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4 rounded-b-xl">
              <div className="flex items-center gap-2 text-sm text-gray-700">Stripe Secured Payments</div>
              <div className="flex items-center gap-2 text-sm text-gray-700">Verified UK Sellers</div>
              <div className="flex items-center gap-2 text-sm text-gray-700">UK-Based Marketplace</div>
              <div className="flex items-center gap-2 text-sm text-gray-700">0% Commission Until 1 July 2026</div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
