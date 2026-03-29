// src/pages/Home.tsx
//
// IMAGE SWAP GUIDE — replace the empty `image` strings below with the
// generated image URLs (or local public/ paths) when they become available.
// Each slot maps to one of the AI-generated cinematic product photos.

// ─── Hero ────────────────────────────────────────────────────────────────────
const HERO_IMAGE = "https://github.com/user-attachments/assets/ee430825-8d41-48cc-9eb0-0bda5068e190";

// ─── Category tiles (swap empty string → image URL when generated) ───────────
const CATEGORY_IMAGES: Record<string, string> = {
  "Electronics":    "", // prompt: laptop, phone, tablet, headphones, camera…
  "Fashion":        "", // prompt: handbag, heels, sunglasses, jewellery, hat…
  "Home & Kitchen": "", // prompt: coffee maker, mug, bowl, utensils, lamp…
  "Tools & DIY":    "", // prompt: cordless drill, hammer, screwdriver set…
};

// ─── Featured listing cards (swap empty string → image URL when generated) ───
const LISTING_IMAGES: string[] = [
  "", // #1 — cardboard shipping box, soft glow inside
  "", // #2 — compact smart gadget box / accessory case
  "", // #3 — medium home accessory box / lifestyle packaging
  "", // #4 — clearance / mixed stock flat-lay
];

const Home = () => {
  const features = [
    "Verified Sellers",
    "Secure Payments",
    "Free to Join",
    "UK-Based Marketplace",
  ];

  const categories = [
    { name: "Electronics",    slug: "electronics" },
    { name: "Fashion",        slug: "fashion" },
    { name: "Home & Kitchen", slug: "home-kitchen" },
    { name: "Tools & DIY",    slug: "tools-diy" },
  ];

  const exampleListings = [
    { name: "Sample Listing",    image: LISTING_IMAGES[0] },
    { name: "Brand Collection",  image: LISTING_IMAGES[1] },
    { name: "Wholesale Bundle",  image: LISTING_IMAGES[2] },
    { name: "Clearance Stock",   image: LISTING_IMAGES[3] },
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
            {/* Hero image — self-host by placing file at public/hero-devices.jpg
                and updating HERO_IMAGE at the top of this file. */}
            <img
              src={HERO_IMAGE}
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
            {categories.map(({ name, slug }) => {
              const img = CATEGORY_IMAGES[name];
              return (
                <a
                  key={name}
                  href={`/catalog?category=${slug}`}
                  className="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={name}
                      width={400}
                      height={128}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-32 bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                      {name}
                    </div>
                  )}
                  <div className="p-4 font-semibold text-slate-800">{name}</div>
                </a>
              );
            })}
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
            {exampleListings.map(({ name, image }) => (
              <div
                key={name}
                className="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition"
              >
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    width={400}
                    height={160}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-40 bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                    Listing Preview
                  </div>
                )}
                <div className="p-4 font-semibold text-slate-800">{name}</div>
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
