import { Link } from "react-router-dom";

/**
 * FeaturedCategories — 6 image-card category grid for the homepage.
 *
 * Each card shows a high-resolution cover image, the category name, and a
 * subtle bottom gradient so the white label stays readable.  Hovering the
 * card gently zooms the background image.
 *
 * Only visual markup — no DB calls, no routing changes.
 */

interface CategoryCard {
  label: string;
  href: string;
  image: string;
  alt: string;
}

const FEATURED: CategoryCard[] = [
  {
    label: "Electronics",
    href: "/catalog?category=Electronics",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80",
    alt: "Electronics and gadgets",
  },
  {
    label: "Vehicles",
    href: "/catalog?category=Automotive",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
    alt: "Vehicles and automotive",
  },
  {
    label: "Clothing",
    href: "/catalog?category=Clothing+%26+Fashion",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    alt: "Clothing and fashion",
  },
  {
    label: "Home & Garden",
    href: "/catalog?category=Home+%26+Garden",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    alt: "Home and garden products",
  },
  {
    label: "Beauty",
    href: "/catalog?category=Health+%26+Beauty",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
    alt: "Health and beauty products",
  },
  {
    label: "Toys & Games",
    href: "/catalog?category=Toys+%26+Games",
    image:
      "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
    alt: "Toys and games",
  },
];

const FeaturedCategories = () => (
  <section className="bg-white border-b border-gray-200 py-10 px-4 sm:px-6 lg:px-10" aria-labelledby="featured-cats-heading">
    <div className="w-full max-w-[1280px] mx-auto">

      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            id="featured-cats-heading"
            className="text-xl font-bold text-gray-900"
          >
            Shop by Category
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Browse popular categories across the marketplace
          </p>
        </div>
        <Link
          to="/catalog"
          className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors"
        >
          View all →
        </Link>
      </div>

      {/* 3-column card grid */}
      <div
        id="grid"
        className="grid grid-cols-2 sm:grid-cols-3 gap-4"
      >
        {FEATURED.map((cat) => (
          <Link
            key={cat.href}
            to={cat.href}
            className="group relative overflow-hidden rounded-2xl aspect-[4/3] block shadow-sm hover:shadow-lg transition-shadow duration-300"
          >
            {/* Cover image — zooms slightly on hover */}
            <img
              src={cat.image}
              alt={cat.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />

            {/* Bottom gradient + label */}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
            <span className="absolute bottom-3 left-4 text-white text-base sm:text-lg font-bold drop-shadow-sm">
              {cat.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Mobile "view all" link */}
      <div className="sm:hidden mt-5 text-center">
        <Link
          to="/catalog"
          className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors"
        >
          View all categories →
        </Link>
      </div>

    </div>
  </section>
);

export default FeaturedCategories;
