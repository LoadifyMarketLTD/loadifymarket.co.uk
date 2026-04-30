import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section
      className="sm:bg-[linear-gradient(135deg,#111827,#020617)] sm:border-y sm:border-yellow-400/20"
      style={{ backgroundColor: '#0B0B0F' }}
    >
      {/* ── Mobile: card with margin/radius ───────────────────────── */}
      <div className="sm:hidden" style={{ padding: '24px 16px' }}>
        <div
          style={{
            background: 'linear-gradient(145deg, #1C1400, #0D0D12)',
            border: '1px solid rgba(245,185,66,0.2)',
            borderRadius: '20px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          {/* Heading */}
          <p style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '24px', lineHeight: 1.2, marginBottom: '10px' }}>
            Start Selling for{' '}
            <span style={{ color: '#F5B942' }}>FREE</span>
          </p>

          {/* Subtext */}
          <p style={{ fontSize: '14px', color: '#A0A0A0', lineHeight: 1.55, marginBottom: '22px' }}>
            List products, receive offers, get paid securely.
          </p>

          {/* Gold CTA button */}
          <Link
            to="/register?type=seller"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              background: '#F5B942',
              color: '#0B0B0F',
              fontWeight: 700,
              fontSize: '16px',
              borderRadius: '14px',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            Become a Seller
          </Link>

          <p style={{ fontSize: '12px', color: '#505050' }}>
            No fees. No monthly charges. No risk.
          </p>
        </div>
      </div>

      {/* ── Desktop layout — unchanged ────────────────────────────── */}
      <div className="hidden sm:block px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#F5F1E8] font-medium text-base text-center sm:text-left">
            Join UK sellers earning more with 0% commission until 31 December 2026.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/register?type=seller"
              data-magnetic
              className="bg-[linear-gradient(135deg,#FBBF24,#D97706)] hover:shadow-[0_0_22px_rgba(251,191,36,0.25)] hover:-translate-y-0.5 text-[#020617] font-bold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm whitespace-nowrap"
            >
              Create Your Free Seller Account
            </Link>
            <p className="text-[#C9D0D6]/80 text-sm whitespace-nowrap">
              No fees. No monthly charges. No risk.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
