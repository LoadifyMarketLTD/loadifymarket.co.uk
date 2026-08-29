import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const HeroSection = () => (
  <section
    aria-label="Loadify Market seller marketplace"
    className="bg-[#F8F7F4] text-[#0A234F]"
  >
    <div className="mx-auto grid min-h-[690px] max-w-[1480px] grid-cols-1 items-center gap-10 px-6 pb-14 pt-[166px] lg:grid-cols-12 lg:gap-14 lg:px-10 lg:pb-16 lg:pt-[170px]">
      <div className="lg:col-span-5">
        <p className="mb-7 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A7351]">
          Built for UK sellers, brands &amp; wholesalers
        </p>

        <h1 className="max-w-[610px] font-serif text-[3.05rem] font-normal leading-[1.02] tracking-[-0.035em] text-[#0A234F] sm:text-[3.55rem] lg:text-[3.75rem]">
          <span className="block">The UK marketplace for</span>
          <span className="block">independent sellers</span>
        </h1>

        <p className="mt-7 max-w-[570px] text-[16px] font-normal leading-7 text-[#5A6578] sm:text-[17px] sm:leading-8">
          A modern UK sales channel for independent sellers, brands and wholesalers. List products, manage marketplace orders and follow eligible payouts from one connected environment.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
          <Link
            to="/register?type=seller"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#0A234F] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#071A3C]"
          >
            Start selling
          </Link>

          <Link
            to="/seller-guidelines"
            className="group inline-flex items-center gap-2 py-3 text-sm font-medium text-[#334155] transition-colors hover:text-[#0A234F]"
          >
            Explore benefits
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="overflow-hidden rounded-[16px] border border-black/[0.05] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.055)]">
          <img
            src="/hero-marketplace.jpg"
            alt="A curated selection of products representing the Loadify Market marketplace"
            className="h-[430px] w-full object-cover object-center sm:h-[500px] lg:h-[520px]"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </div>
    </div>
  </section>
);

export default HeroSection;
