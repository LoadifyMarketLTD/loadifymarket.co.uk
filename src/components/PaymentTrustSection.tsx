import { ShieldCheck, Lock } from "lucide-react";

/**
 * Homepage payment trust section.
 *
 * Only displays payment methods that are actually supported:
 *   Visa · Mastercard · American Express — all processed via Stripe.
 *
 * PayPal, Apple Pay and Google Pay are intentionally absent.
 *
 * Badge assets: /public/payment-icons/ (SVG, 38×24 viewBox)
 */
const PaymentTrustSection = () => (
  <section className="bg-white py-10 border-b border-gray-100">
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6">

      {/* Heading row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Secure Payments via Stripe</h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Visa, Mastercard &amp; American Express accepted
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>256-bit SSL encrypted · PCI-DSS compliant</span>
        </div>
      </div>

      {/* Badge row — all badges share h-10 (40 px), width auto (no distortion) */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">

        <img
          src="/payment-icons/visa.svg"
          alt="Visa"
          className="h-10 w-auto rounded-lg border border-gray-200 shadow-sm"
          width="64"
          height="40"
          loading="lazy"
          decoding="async"
        />

        <img
          src="/payment-icons/mastercard.svg"
          alt="Mastercard"
          className="h-10 w-auto rounded-lg border border-gray-200 shadow-sm"
          width="64"
          height="40"
          loading="lazy"
          decoding="async"
        />

        <img
          src="/payment-icons/amex.svg"
          alt="American Express"
          className="h-10 w-auto rounded-lg border border-gray-200 shadow-sm"
          width="64"
          height="40"
          loading="lazy"
          decoding="async"
        />

        {/* Vertical rule between card brands and processor/security badges */}
        <div className="hidden sm:block h-8 w-px bg-gray-200" aria-hidden="true" />

        {/* Stripe — processor badge */}
        <div className="flex items-center gap-2.5 rounded-lg border border-[#635BFF]/30 bg-[#635BFF]/5 px-4 py-2">
          <img
            src="/payment-icons/stripe.svg"
            alt="Stripe"
            className="h-7 w-auto rounded"
            width="44"
            height="28"
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className="text-xs font-semibold text-[#635BFF] leading-none">Powered by Stripe</p>
            <p className="text-[10px] text-[#64748B] mt-0.5 leading-none">Secure payment processing</p>
          </div>
        </div>

        {/* Secure checkout badge */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 leading-none">Secure Checkout</p>
            <p className="text-[10px] text-emerald-600 mt-0.5 leading-none">Dispute support available</p>
          </div>
        </div>

      </div>
    </div>
  </section>
);

export default PaymentTrustSection;
