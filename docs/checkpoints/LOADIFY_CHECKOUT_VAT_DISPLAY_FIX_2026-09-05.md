# Loadify Checkout VAT Display Fix — 2026-09-05

Branch: `fix/checkout-vat-display-20260905`
Base main: `7324738875066b25eb1c74ab3b31dd238549fee2`

Scope:
- remove hard-coded checkout UI assumption `VAT (20%) = subtotal / 6`;
- refresh canonical product tax evidence into cart state before checkout;
- display `VAT — not charged by seller` with `£0.00` only for canonical seller non-VAT evidence;
- never invent a VAT amount when tax evidence is missing or unsupported;
- keep Stripe, escrow, webhook and server tax engine unchanged.

Validation required before merge:
- unit tests for checkout VAT display helper;
- build/typecheck through Deploy Preview;
- Preview READY on exact branch HEAD;
- no visual changes outside the checkout VAT line.
