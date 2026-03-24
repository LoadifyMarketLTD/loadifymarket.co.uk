import { ShieldCheck, Lock } from "lucide-react";

/**
 * Homepage payment trust section.
 * Only lists actually-supported payment methods: Visa, Mastercard, Amex via Stripe.
 * PayPal / Apple Pay / Google Pay are intentionally absent.
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
          <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span>256-bit SSL encrypted · PCI-DSS compliant</span>
        </div>
      </div>

      {/* Card brand badges + Stripe badge */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Visa */}
        <div
          className="h-10 w-16 rounded-lg border border-gray-200 bg-white shadow-sm flex items-center justify-center"
          title="Visa"
        >
          <svg viewBox="0 0 60 20" aria-label="Visa" className="w-10 h-5">
            <text
              x="2"
              y="16"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              fontSize="16"
              fill="#1A1F71"
              letterSpacing="0.5"
            >
              VISA
            </text>
          </svg>
        </div>

        {/* Mastercard */}
        <div
          className="h-10 w-16 rounded-lg border border-gray-200 bg-white shadow-sm flex items-center justify-center"
          title="Mastercard"
        >
          <svg viewBox="0 0 48 32" aria-label="Mastercard" className="w-9 h-6">
            <circle cx="17" cy="16" r="10" fill="#EB001B" />
            <circle cx="31" cy="16" r="10" fill="#F79E1B" />
            <path d="M24 8.27a10 10 0 010 15.46A10 10 0 0124 8.27z" fill="#FF5F00" />
          </svg>
        </div>

        {/* American Express */}
        <div
          className="h-10 w-16 rounded-lg border border-gray-200 bg-[#016FD0] shadow-sm flex items-center justify-center"
          title="American Express"
        >
          <svg viewBox="0 0 56 20" aria-label="American Express" className="w-10 h-4">
            <text
              x="2"
              y="15"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              fontSize="13"
              fill="white"
              letterSpacing="0.5"
            >
              AMEX
            </text>
          </svg>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-gray-200" aria-hidden="true" />

        {/* Stripe trust badge */}
        <div className="flex items-center gap-2 rounded-lg border border-[#635BFF]/30 bg-[#635BFF]/5 px-4 py-2">
          {/* Stripe "S" circle */}
          <svg viewBox="0 0 16 16" className="h-5 w-5 shrink-0" aria-hidden="true">
            <circle cx="8" cy="8" r="8" fill="#635BFF" />
            <path
              fill="white"
              d="M8.4 11.6c-1.4 0-2.2-.6-2.8-1.2l.8-.8c.4.5 1 .8 2 .8.9 0 1.4-.4 1.4-1 0-.5-.3-.8-1.4-1.1-1.4-.3-2.2-.9-2.2-2 0-1.1.9-1.9 2.2-1.9 1 0 1.7.4 2.3.9l-.8.8c-.4-.4-.9-.6-1.5-.6-.8 0-1.2.4-1.2.9 0 .5.3.8 1.4 1.1 1.4.3 2.2.9 2.2 2 0 1.2-.9 2.1-2.4 2.1z"
            />
          </svg>
          <div>
            <p className="text-xs font-semibold text-[#635BFF] leading-none">Powered by Stripe</p>
            <p className="text-[10px] text-[#64748B] mt-0.5 leading-none">Secure payment processing</p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-700 leading-none">Secure Checkout</p>
            <p className="text-[10px] text-emerald-600 mt-0.5 leading-none">Buyer protection included</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default PaymentTrustSection;
