import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section className="sm:bg-surface sm:border-y sm:border-primary/40 bg-surface" aria-label="Sell on Loadify Market">
      <div className="sm:hidden" style={{ padding: '24px 16px' }}>
        <div
          style={{
            background: 'rgba(12,10,0,1)',
            border: '1px solid rgba(212,175,55,0.24)',
            borderRadius: '20px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <p className="text-primary" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
            For sellers
          </p>
          <p style={{ fontWeight: 800, fontSize: '24px', lineHeight: 1.2, marginBottom: '10px' }} className="text-white">
            Grow your sales on <span className="text-primary">Loadify</span>
          </p>
          <p style={{ fontSize: '14px', lineHeight: 1.55, marginBottom: '22px' }} className="text-white/75">
            Build your catalogue, manage marketplace orders and reach UK buyers without a monthly seller fee.
          </p>
          <Link
            to="/register?type=seller"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              background: 'rgba(212,175,55,1)',
              color: 'rgba(18,26,43,1)',
              fontWeight: 700,
              fontSize: '16px',
              borderRadius: '14px',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            Open Your Seller Account
          </Link>
          <p style={{ fontSize: '12px' }} className="text-white/70">
            0% seller commission until 31 December 2026.
          </p>
        </div>
      </div>

      <div className="hidden sm:block px-8 py-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 max-w-[1280px] mx-auto">
          <div className="text-center lg:text-left max-w-3xl">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em] mb-1.5">For sellers</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">Turn your catalogue into new marketplace opportunities.</h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              List products, manage orders and receive eligible payouts through Stripe Connect. 0% seller commission until 31 December 2026.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/register?type=seller"
              data-magnetic
              className="bg-primary hover:bg-primary-hover hover:shadow-[0_0_22px_rgba(212,175,55,0.25)] hover:-translate-y-0.5 text-black font-bold px-7 py-3 rounded-xl transition-all duration-300 text-sm whitespace-nowrap"
            >
              Start Selling on Loadify
            </Link>
            <Link to="/#how-it-works-sellers" className="text-white/75 hover:text-primary text-sm font-medium transition-colors whitespace-nowrap">
              See how selling works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
