# Database Drift Audit & Runtime Isolation Matrix

Stare: **Non-destructive Hold**  
Data auditului: **30 August 2026**

## Structuri Necanonice (BLOCATE de la Runtime)

Următoarele tabele create manual în Supabase sunt marcate ca **REDUNDANTE / PARALELE** și NU vor fi importate în `src/types/supabase.ts` sau utilizate în codul aplicației:

- `stripe_webhook_events` -> **BLOCAT** (Se folosește exclusiv tabelul canonical `stripe_events`)
- `in_app_notifications` -> **BLOCAT** (Se folosește exclusiv tabelul canonical `notifications`)
- `disputes_and_returns` -> **BLOCAT** (Se păstrează fluxul canonical `disputes` + `refunds`)
- `vendor_sync_feeds` -> **PENDING** (Rămâne în așteptare până la canonicalizarea cu Direct Supplier)
- `product_variants_3p` -> **PENDING** (Consolidare ulterioară cu schema `products/SKU/variants`)

## Decizii de Securitate și RLS

- Comanda `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public` este **RESPINSĂ definitiv** ca operațiune globală de hardening.
- Se păstrează hardening-ul existent Loadify: fail-closed, RLS/grants țintite și RPC-uri validate individual.
- Nu se execută cleanup destructiv (`DROP TABLE`, alterări destructive, ștergeri de date) pentru structurile izolate până la introspecția completă a bazei hosted.

## Regula de Runtime Invariant

- `create-checkout.ts` rămâne **Single-Seller Checkout** (fără split-order experimental).
- `escrow-release.ts` rămâne mecanismul unic de plată/reconciliere/transfer Stripe.
- Runtime-ul nu va fi repointat către structurile necanonice de mai sus fără un PR explicit de reconciliere, dovezi de introspecție hosted și verificări RLS/grants/dependencies.

## Hold de Execuție Hosted

Până la activarea accesului de introspecție Supabase hosted:

- nu modificăm schema hosted pentru a adapta runtime-ul la tabelele paralele;
- nu importăm aceste tabele în tipurile TypeScript canonice;
- nu introducem dependențe în Edge Functions, webhook-uri, checkout, notificări, Seller Workspace sau job-uri programate;
- orice viitoare consolidare trebuie să păstreze un singur source of truth per domeniu.
