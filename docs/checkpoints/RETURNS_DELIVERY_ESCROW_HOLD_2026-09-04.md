# Returns delivery / escrow hold closure

Branch: `fix/returns-delivery-right-escrow-hold-20260904`
Base: `034e4a35a48c15ab10d5d5e22a34717ce931ff71`

Current scope:
- add repository migration aligning `public.can_open_return()` to `delivered`/`completed`;
- hold escrow release while any non-rejected return exists;
- re-check active returns after Stripe transfer and compensate before finalisation if a return wins the race;
- keep refund execution admin-only and unchanged;
- no hosted Supabase migration applied;
- no production payment/refund mutation executed.

Still required before merge:
- align Buyer Orders return button with the delivery boundary;
- validate focused tests/build/preview;
- inspect final diff against current main;
- only then consider merge.
