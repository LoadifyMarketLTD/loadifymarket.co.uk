import { Link } from 'react-router-dom';

const HeroSection = () => (
  <section
    aria-label="Loadify Market — UK Online Marketplace"
    className="relative w-full min-h-[75vh] bg-[#0B1016]"
  >
    {/* ── Background image — full cover, no distortion ─────────────────── */}
    <img
      src="/hero-gold.jpeg"
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover object-center"
      loading="eager"
    />

    {/* ── Premium dark overlay for text legibility ─────────────────────── */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: 'linear-gradient(90deg, rgba(11,16,22,0.88) 0%, rgba(11,16,22,0.68) 42%, rgba(11,16,22,0.18) 100%)' }}
      aria-hidden="true"
    />

    {/* ── Content ──────────────────────────────────────────────────────── */}
    <div className="absolute inset-0 flex items-center">
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[122px] pb-8 lg:py-24">
      <div className="flex flex-col gap-5 text-center sm:text-left items-center sm:items-start max-w-2xl">

        {/* 1. Promo badge */}
        <div className="inline-flex items-center bg-[#C99A3E] text-[#0B1016] text-sm font-bold rounded-full px-4 py-1.5 tracking-wide uppercase">
          0% Commission Until 31 December 2026
        </div>

        {/* 2. H1 */}
        <h1 className="text-5xl sm:text-6xl font-extrabold leading-snug text-[#F5F1E8]">
          The UK Marketplace<br />
          <span className="text-[#C99A3E]">Built for Modern Sellers</span>
        </h1>

        {/* 3. Description */}
        <p className="text-lg text-[#C9D0D6] max-w-xl">
          Sell products, manage orders, and get paid —<br className="hidden sm:block" />
          all in one secure platform.
        </p>

        {/* 4. CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            to="/register?type=seller"
            className="w-full sm:w-auto bg-[#C99A3E] hover:bg-[#D8AE57] text-[#0B1016] font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
          >
            Start Selling Today
          </Link>
          <Link
            to="/products"
            className="w-full sm:w-auto border border-white/40 text-white hover:bg-white/10 font-semibold px-7 py-3.5 rounded-lg text-center transition-colors text-sm"
          >
            Browse the Marketplace
          </Link>
        </div>

        {/* 5. Payment badges */}
        <div className="flex flex-col items-center sm:items-start gap-2 mt-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-[#C9D0D6]/60">
            Secure Payments Powered By
          </span>
          <div className="flex items-center gap-4">
            {/* Visa */}
            <svg viewBox="0 0 780 500" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto" aria-label="Visa">
              <rect width="780" height="500" rx="40" fill="#1a1f71"/>
              <path d="M290 357l37-218h59l-37 218h-59zM539 145c-12-4-30-9-52-9-57 0-97 29-97 70 0 30 28 47 50 57 22 10 29 17 29 26 0 14-18 20-34 20-22 0-34-3-52-11l-7-3-8 46c13 6 37 11 62 11 61 0 100-29 100-73 0-24-16-43-50-58-21-10-34-16-34-26 0-9 11-18 34-18 20 0 34 4 45 8l5 2 8-42zM614 139h-45c-14 0-24 4-30 18l-85 200h60l12-32h73l7 32h53l-45-218zm-70 140l22-59 5-14 2 8 13 65h-42zM231 139l-57 148-6-30c-10-34-42-70-77-88l52 188h61l91-218h-64z" fill="#fff"/>
              <path d="M152 139H57l-1 5c74 18 123 62 143 114l-21-103c-4-13-13-16-26-16z" fill="#f9a533"/>
            </svg>
            {/* Mastercard */}
            <svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto" aria-label="Mastercard">
              <rect width="38" height="24" rx="3" fill="#252525"/>
              <circle cx="15" cy="12" r="7" fill="#eb001b"/>
              <circle cx="23" cy="12" r="7" fill="#f79e1b"/>
              <path d="M19 7a7 7 0 010 10A7 7 0 0119 7z" fill="#ff5f00"/>
            </svg>
            {/* Stripe wordmark */}
            <svg viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" className="h-7 w-auto" aria-label="Stripe">
              <path d="M5.4 10.2c0-.8.7-1.1 1.8-1.1 1.6 0 3.6.5 5.2 1.3V5.7C10.8 5 9 4.7 7.2 4.7 3 4.7.6 6.9.6 10.4c0 5.5 7.5 4.6 7.5 7 0 .9-.8 1.2-2 1.2-1.7 0-3.9-.7-5.6-1.7V22c1.9.8 3.8 1.2 5.6 1.2 4.3 0 7.2-2.1 7.2-5.7-.1-5.9-7.9-4.9-7.9-7.3zM22.2 1.5L17.8 2.5 17.8 7.1 15 7.1 15 11.5 17.8 11.5 17.8 19c0 3.6 1.7 4.8 5 4.8 1.3 0 2.8-.2 4-.7l0-4.3c-.7.3-2.1.7-3 .7-1.3 0-1.8-.5-1.8-1.8V11.5h4.8V7.1h-4.6V1.5zM38.7 7c-1.8 0-3 .9-3.7 1.5l-.3-1.4h-4.5V23.5h5.1V12.9c.6-.7 1.5-1.1 2.6-1.1.4 0 .8 0 1.1.1V7C38.8 7 38.7 7 38.7 7zM44 4.3c-1.6 0-2.9 1.2-2.9 2.8 0 1.6 1.3 2.8 2.9 2.8 1.7 0 2.9-1.2 2.9-2.8C46.9 5.5 45.7 4.3 44 4.3zM41.5 23.5h5.1V7.1h-5.1V23.5zM60 14.2c0-4.4-2.1-7.5-6.3-7.5-4.2 0-6.8 3.1-6.8 7.5 0 5 2.8 7.5 7.1 7.5 2 0 3.6-.4 5-1.2l0-3.8c-1.2.7-2.6 1.2-4.2 1.2-1.6 0-3-.6-3.2-2.7h8.3C60 14.8 60 14.5 60 14.2zM51.6 12.7c.1-2 1.2-2.8 2.3-2.8 1.1 0 2.1.8 2.1 2.8H51.6z" fill="#fff"/>
            </svg>
          </div>
        </div>

      </div>
    </div>
    </div>
  </section>
);

export default HeroSection;
