import { Link } from 'react-router-dom';
import { ArrowRight, Store, Tag, ShieldCheck, BadgeCheck } from 'lucide-react';

const VALUE_POINTS = [
  { icon: Tag,         label: '0% Commission',   note: 'Launch Offer' },
  { icon: ShieldCheck, label: 'Secure Payments', note: 'Stripe Protected' },
  { icon: BadgeCheck,  label: 'Verified Buyers', note: 'Controlled Onboarding' },
];

export default function CinematicHero() {
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="container-market">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 py-10 lg:py-16 items-center">

          {/* Left: Text */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#F4C400]/20 text-[#92700A] text-xs font-bold px-3 py-1.5 rounded-full mb-5 tracking-wide uppercase">
              Launch Phase — 0% Commission
            </div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-5">
              Sell Faster.<br />Scale Bigger.<br />Keep More Profit.
            </h1>

            <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-md">
              Join a UK marketplace built for serious sellers — not casual listings.
            </p>

            {/* Value points */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8">
              {VALUE_POINTS.map(({ icon: Icon, label, note }) => (
                <div
                  key={label}
                  className="flex items-center gap-2.5 bg-[#F8F9FA] border border-gray-200 rounded-lg px-3.5 py-2.5"
                >
                  <Icon className="w-4 h-4 text-[#1E3A5F] flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{label}</p>
                    <p className="text-xs text-gray-500 leading-tight">{note}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-bold px-6 py-3.5 rounded-lg text-base transition-colors shadow-md"
              >
                <Store className="h-5 w-5" />
                Start Selling &amp; Keep 100% Profit
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-[#1E3A5F] hover:text-[#1E3A5F] font-semibold px-6 py-3.5 rounded-lg text-base transition-colors"
              >
                Browse Marketplace
              </Link>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              No setup fees. No contracts. Your stock, your prices, your business.
            </p>
          </div>

          {/* Right: Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3]">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=768&q=65&auto=format&fit=max&fm=webp"
                srcSet="
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=480&q=65&auto=format&fit=max&fm=webp 480w,
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=640&q=65&auto=format&fit=max&fm=webp 640w,
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=768&q=65&auto=format&fit=max&fm=webp 768w,
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1280&q=65&auto=format&fit=max&fm=webp 1280w"
                sizes="(max-width: 480px) 100vw, (max-width: 1023px) 100vw, 640px"
                alt="Products for sale on a UK marketplace"
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3">
                <p className="text-xs font-bold text-[#1E3A5F] mb-0.5">Launch Phase Active</p>
                <p className="text-xs text-gray-600">0% commission for early sellers</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
