import { Link } from "react-router-dom";

export default function SellerCTA() {
  return (
    <section
      className="sm:bg-[linear-gradient(135deg,#121A2B,#0A0E1A)] sm:border-y sm:border-primary/40 bg-surface"
    >
      {/* ── Mobile: card with margin/radius ───────────────────────── */}
      <div className="sm:hidden" style={{ padding: '24px 16px' }}>
        <div
          style={{
            background: 'rgba(12,10,0,1)',
            border: '1px solid rgba(212,175,55,0.2)',
            borderRadius: '20px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          {/* Heading */}
          <p style={{ fontWeight: 800, fontSize: '24px', lineHeight: 1.2, marginBottom: '10px' }} className="text-white">
            Start Selling for{' '}
            <span className="text-primary" style={{}}>FREE</span>
          </p>

          {/* Subtext */}
          <p style={{ fontSize: '14px', lineHeight: 1.55, marginBottom: '22px' }} className="text-muted-foreground">
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
              background: 'rgba(212,175,55,1)',
              color: 'rgba(18,26,43,1)',
              fontWeight: 700,
              fontSize: '16px',
              borderRadius: '14px',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            Become a Seller
          </Link>

          <p style={{ fontSize: '12px' }} className="text-muted-foreground">
            No fees. No monthly charges. No risk.
          </p>
        </div>
      </div>

      {/* ── Desktop layout — unchanged ────────────────────────────── */}
      <div className="hidden sm:block px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-foreground font-medium text-base text-center sm:text-left">
            Join UK sellers earning more with 0% commission until 31 December 2026.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
            <Link
              to="/register?type=seller"
              data-magnetic
              className="bg-primary hover:shadow-[0_0_22px_rgba(212,175,55,0.25)] hover:-translate-y-0.5 text-background font-bold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm whitespace-nowrap"
            >
              Create Your Free Seller Account
            </Link>
            <p className="text-muted-foreground/80 text-sm whitespace-nowrap">
              No fees. No monthly charges. No risk.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
