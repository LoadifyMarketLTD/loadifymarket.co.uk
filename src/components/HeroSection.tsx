import { Link } from 'react-router-dom';

/**
 * HeroSection — compact marketplace hero, max ~200px height.
 * Title: Buy & sell across the UK
 * Subtitle: Fast. Secure. Simple.
 * Single CTA: Browse Products
 */
const HeroSection = () => (
  <section
    aria-label="Loadify Market — UK Online Marketplace"
    className="relative w-full overflow-hidden"
    style={{ background: "linear-gradient(135deg, #0B0F1A 0%, #111827 100%)", minHeight: 180, maxHeight: 220 }}
  >
    {/* Gold accent bar at top */}
    <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#FBBF24]" aria-hidden="true" />

    {/* Content */}
    <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-8" style={{ minHeight: 180 }}>
      <h1 className="text-[1.55rem] font-extrabold leading-tight text-white mb-1.5">
        Buy &amp; sell across the UK
      </h1>
      <p className="text-[13px] text-slate-400 mb-5">
        Fast. Secure. Simple.
      </p>
      <Link
        to="/catalog"
        className="inline-flex items-center justify-center bg-[#FBBF24] hover:bg-[#F59E0B] text-[#0B0F1A] font-bold px-7 py-2.5 rounded-xl text-sm transition-colors shadow-[0_0_14px_rgba(251,191,36,0.30)]"
      >
        Browse Products
      </Link>
    </div>
  </section>
);

export default HeroSection;
