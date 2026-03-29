// src/pages/Home.tsx

const Home = () => {
  const features = [
    "Verified Sellers",
    "Secure Payments",
    "Free to Join",
    "UK-Based Marketplace",
  ];

  const categories = [
    "Electronics",
    "Fashion",
    "Home & Kitchen",
    "Tools & DIY",
  ];

  const exampleListings = [
    "Sample Listing",
    "Brand Collection",
    "Wholesale Bundle",
    "Clearance Stock",
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HERO */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-blue-600 font-semibold text-sm tracking-wide uppercase">
              UK Multi‑Seller Marketplace
            </span>

            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              The UK Marketplace Connecting Buyers & Sellers
            </h1>

            <p className="mt-5 text-lg text-slate-600 max-w-lg">
              Discover trusted suppliers, list your products, and grow your business —
              all in one secure platform. Loadify Market connects independent sellers
              with buyers across the UK.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/catalog"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700"
              >
                Browse Marketplace
              </a>

              <a
                href="/signup"
                className="px-6 py-3 border border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-50"
              >
                Start Selling
              </a>
            </div>
          </div>

          <div className="hidden md:flex justify-center">
            {/* Hero image — replace src with a local path once the file is
                placed at public/hero-devices.png for self-hosted delivery. */}
            <img
              src="https://github.com/user-attachments/assets/072da9d3-3d98-4a0b-b930-e3e08901ae78"
              alt="Loadify Market — shop on any device"
              width={672}
              height={448}
              className="w-full max-w-lg rounded-2xl shadow-xl object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {features.map((f) => (
            <div key={f} className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg font-bold">
                •
              </div>
              <p className="mt-3 font-semibold text-slate-800">{f}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-16 bg-slate-50 border-b">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Explore Categories
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <div
                key={cat}
                className="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition"
              >
                <div className="h-32 bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                  Category Preview
                </div>
                <div className="p-4 font-semibold text-slate-800">{cat}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXAMPLE LISTINGS */}
      <section className="py-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Example Listings from Independent Sellers
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {exampleListings.map((item) => (
              <div
                key={item}
                className="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition"
              >
                <div className="h-40 bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                  Listing Preview
                </div>
                <div className="p-4 font-semibold text-slate-800">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold text-slate-900">
            Ready to Join the Marketplace?
          </h2>
          <p className="mt-4 text-slate-600">
            Loadify Market is a UK-based multi-seller marketplace for physical goods.
            List your products, reach new buyers, and manage your business in one place.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="/catalog"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700"
            >
              Browse Marketplace
            </a>
            <a
              href="/signup"
              className="px-6 py-3 border border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-50"
            >
              Create Account
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER + DISCLAIMER */}
      <footer className="border-t mt-8 py-6 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-4">
            <a href="/about" className="hover:text-slate-800">
              About Us
            </a>
            <a href="/faq" className="hover:text-slate-800">
              Help Center
            </a>
            <a href="/privacy" className="hover:text-slate-800">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-slate-800">
              Terms
            </a>
          </div>
          <div className="text-right">
            <p>© {new Date().getFullYear()} Loadify Market, All rights reserved.</p>
            <p className="text-xs mt-1">
              Loadify Market is a marketplace platform only. All products are listed,
              managed, and fulfilled by independent sellers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
