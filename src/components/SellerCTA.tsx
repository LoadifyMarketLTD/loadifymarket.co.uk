import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section className="sm:bg-[#0A234F] sm:border-y sm:border-[#F5A300]/40 bg-[#0A234F]">
      <div className="sm:hidden" style={{ padding: '24px 16px' }}>
        <div
          style={{
            background: '#0B2F6B',
            border: '1px solid rgba(245,163,0,0.24)',
            borderRadius: '20px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 18px 42px rgba(10,35,79,0.22)',
          }}
        >
          <p style={{ fontWeight: 800, fontSize: '24px', lineHeight: 1.2, marginBottom: '10px' }} className="text-white">
            Start Selling for{' '}
            <span className="text-[#F5A300]">FREE</span>
          </p>

          <p style={{ fontSize: '14px', lineHeight: 1.55, marginBottom: '22px' }} className="text-white/68">
            List products free, sell at fixed prices, and keep more from every order.
          </p>

          <Link
            to="/register?type=seller"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              background: '#F5A300',
              color: '#0A234F',
              fontWeight: 700,
              fontSize: '16px',
              borderRadius: '14px',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            Open Your Seller Account
          </Link>

          <p style={{ fontSize: '12px' }} className="text-white/62">
            0% seller commission until 31 December 2026.
          </p>
        </div>
      </div>

      <div className="hidden sm:block px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white font-medium text-base text-center sm:text-left">
            List products free, sell at fixed prices, and keep more from every order with 0% seller commission until 31 December 2026.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/register?type=seller"
              data-magnetic
              className="bg-[#F5A300] hover:bg-[#E69500] hover:shadow-[0_0_22px_rgba(245,163,0,0.25)] hover:-translate-y-0.5 text-[#0A234F] font-bold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm whitespace-nowrap"
            >
              Open Your Free Seller Account
            </Link>
            <p className="text-white/65 text-sm whitespace-nowrap">
              Stripe payments. Fixed prices. No monthly fee.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
