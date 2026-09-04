# Returns delivery / escrow hold closure

Branch: `fix/returns-delivery-right-escrow-hold-20260904`
Base: `034e4a35a48c15ab10d5d5e22a34717ce931ff71`

Current scope:
- repository migration aligns `public.can_open_return()` to `delivered`/`completed`;
- the same DB boundary now requires a verified delivered shipment within the canonical 14-day return window;
- escrow release is held only while a return is `requested` or `approved`;
- active returns are re-checked after Stripe transfer and compensated before finalisation if a return wins the race;
- refund execution remains admin-only and unchanged;
- Buyer Orders exposes return action from the delivery boundary;
- focused source-level regression coverage protects both escrow-return and return-eligibility boundaries;
- no hosted Supabase migration applied;
- no production payment/refund mutation executed.

Validation required before merge:
- Netlify preview for the latest HEAD;
- final diff against current main;
- confirm no new review blocker;
- merge only if all available evidence is clean.
