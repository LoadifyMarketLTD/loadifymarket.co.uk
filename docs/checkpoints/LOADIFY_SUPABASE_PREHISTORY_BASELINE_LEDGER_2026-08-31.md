# LOADIFY SUPABASE PREHISTORY BASELINE LEDGER — 2026-08-31

## Status

Investigation-only / documentation-only.

No production database mutation is authorized or performed by this ledger.

Tracked issue: `#656 — Restore fresh-db Supabase baseline before 20260810120700`.

## Problem statement

A clean `supabase db reset` cannot replay the canonical migration history from an empty local database because the earliest tracked canonical migration:

`supabase/migrations/20260810120700_reconcile_core_rls_policies_20260810.sql`

assumes that a broad Loadify Market marketplace schema already exists.

The failure is therefore not an isolated missing-table defect. The canonical migration folder was introduced after a substantial pre-existing schema and a sequence of legacy root-level SQL migrations had already been used.

## Exact historical cutoff

The last `supabase/**` change before the first canonical 2026-08-10 migration was:

- commit: `8753a356ef1734126414aac11c2e189526218133`
- timestamp: `2026-07-06T13:22:05Z`
- commit subject: `fix: close prelive marketplace gaps`

No later `supabase/**` commit exists between that cutoff and the first canonical migration on 2026-08-10.

## Last executable consolidated bootstrap

The last historical executable version of:

`supabase/00_consolidated_schema.sql`

was last modified at:

- commit: `249d644ea47f2434bf6c756aea023fef38799e01`
- timestamp: `2026-05-18T06:51:08Z`

At that point the file was an actual `COMPLETE DATABASE SCHEMA FOR SUPABASE` bootstrap, not the later deprecation/guard stub now present on `main`.

The historical snapshot contains both schema/security definitions and intentional bootstrap DML/configuration. Examples include platform settings and shipping method/rate bootstrap data. Therefore it must not be treated as schema-only input.

## Exact post-snapshot delta before canonical migrations

Git comparison between the last consolidated snapshot and the exact prehistory cutoff proves that the only Supabase SQL files added in that interval were exactly migrations 588 through 596:

1. `supabase/588_orphan_offer_cleanup.sql`
2. `supabase/589_fix_conversations_select_rls_drift.sql`
3. `supabase/590_repair_offer_actions.sql`
4. `supabase/591_rebuild_offer_action_rpcs.sql`
5. `supabase/592_add_notification_archive_support.sql`
6. `supabase/593_offer_cancel_rate_limits.sql`
7. `supabase/594_create_order_events_table.sql`
8. `supabase/595_harden_products_and_retire_offers.sql`
9. `supabase/596_disable_rfq_for_fixed_price_launch.sql`

This means the bounded prehistory reconstruction sequence is:

`historical 00_consolidated_schema @ 249d644...`

followed by:

`588 → 589 → 590 → 591 → 592 → 593 → 594 → 595 → 596`

followed by the canonical history beginning at:

`20260810120700_reconcile_core_rls_policies_20260810.sql`.

## Delta integrity: cutoff vs current main

Every one of the nine legacy delta migrations is byte-identical between cutoff commit `8753a356...` and current `main`.

| Migration | Git blob SHA |
|---|---|
| `588_orphan_offer_cleanup.sql` | `e4e2f5d1b0e6db6a4a5d1f0a25553250cc96ed34` |
| `589_fix_conversations_select_rls_drift.sql` | `de503ea1047c226d462b7ae9dbb3f2e7a22b7a60` |
| `590_repair_offer_actions.sql` | `6738ac4af6778b2659efd12c5460b745628fabad` |
| `591_rebuild_offer_action_rpcs.sql` | `8daca40a17deb900abf2b59fde304a49970eee59` |
| `592_add_notification_archive_support.sql` | `df0ca11c3d0d36657767cf314781a1e9c3f458ed` |
| `593_offer_cancel_rate_limits.sql` | `c1e89f5aaaa00703c9ab0a6000e899dcfa10245d` |
| `594_create_order_events_table.sql` | `e09691dbf22f743a480bc8c5f24d19244394bd1c` |
| `595_harden_products_and_retire_offers.sql` | `168b1be6fface8f6dca51c2d0941309a2f67e71d` |
| `596_disable_rfq_for_fixed_price_launch.sql` | `3e07ddbaa48053934078f7c5c573550e3ebb8825` |

Therefore migrations 588→596 can be reused directly from current `main` for an isolated historical replay. Only the consolidated bootstrap itself needs historical materialization from commit `249d644...`.

## Why the first canonical migrations prove the baseline is broad

`20260810120700_reconcile_core_rls_policies_20260810.sql` assumes pre-existing marketplace objects including buyer/seller profiles and stores, promotional and wishlist/search/notification tables, carts/cart items, and `public.is_admin()`.

The immediately following transaction-policy migration assumes payouts, disputes/messages, delivery requests/transport quotes, shipments/events, support tickets/messages and the same admin helper.

The seller-profile reconciliation assumes `seller_profiles` already exists.

A narrow repair that creates only the first missing table would simply move the fresh replay failure to the next prerequisite.

## Important delta semantics

The delta migrations are not all schema-only:

- `594` adds the production-missing `order_events` audit table.
- `595` hardens product writes and retires the offer/RFQ-facing database surface used by the earlier marketplace posture.
- `596` performs configuration DML setting the launch posture to fixed-price (`rfqSystem=false`).

Earlier delta files also repair RLS and offer-action RPC behavior, add notification archive support, and create offer-cancellation rate-limit state.

## Why automatic migration squash is not sufficient

The prehistory includes intentional DML/configuration, both in the historical consolidated snapshot and in the legacy delta. A schema-oriented squash that omits INSERT/UPDATE/DELETE statements cannot reproduce the prehistory semantics by itself.

Likewise:

- `seed.sql` is too late to create prerequisites needed by the earliest migration;
- a current-date migration is too late because clean replay fails before reaching it;
- fabricating a new pre-2026-08-10 migration timestamp is not acceptable migration governance;
- `migration repair` does not reconstruct missing schema truth and must not be used as a shortcut;
- using the current hosted database as a new snapshot while retaining all 2026-08-10+ migrations would duplicate post-cutoff state and create conflicts.

## Current strongest repair candidate — NOT IMPLEMENTED

The strongest current candidate is to make the earliest already-tracked canonical migration:

`20260810120700_reconcile_core_rls_policies_20260810.sql`

self-contained for fresh environments by prepending a reconstructed prehistory baseline derived from the exact sources documented above, then preserving its original RLS-reconciliation body.

Rationale:

- hosted production already records version `20260810120700` as applied;
- changing the repository body would not cause that already-recorded migration to rerun on hosted production;
- a fresh database would receive the schema that the migration historically assumed;
- no artificial earlier timestamp is required.

This is still only a candidate. Rewriting the body of an already-applied migration is sensitive and MUST NOT be merged without a full isolated replay.

## Mandatory proof before any baseline implementation can merge

An isolated environment must prove all of the following:

1. historical `00_consolidated_schema.sql @ 249d644...` executes from an empty supported Supabase Postgres environment;
2. migrations 588→596 then execute in order;
3. the original canonical migration chain beginning at `20260810120700` replays cleanly to the current head;
4. intentional bootstrap/configuration DML is preserved without duplicate or stale production-like records;
5. no customer/order PII is introduced as baseline data;
6. RLS, grants, SECURITY DEFINER functions and exposed RPCs are no weaker than the intended hosted security posture;
7. migration-health tooling continues to distinguish root legacy SQL from canonical timestamped migrations;
8. Supabase security/performance advisors are reviewed after the replay;
9. no `migration repair` is used to manufacture a passing history.

## Current execution blocker

No isolated replay environment is presently available through the assistant runtime:

- the assistant shell has no usable Docker/Postgres toolchain for this repository;
- the connected Supabase project currently has no branch database;
- creating a Supabase branch can incur cost and must not be done autonomously without explicit authorization.

This blocker affects only proof/implementation of the baseline repair. It does not invalidate the provenance reconstruction above.

## Separate Supplier Commerce state

This prehistory issue is separate from the Direct Supplier Supplier-Commerce workstream.

The Direct Supplier atomic signed-feed pipeline is already merged in PR #658 and documented separately. Its migration `20260831002829_direct_supplier_atomic_signed_feed_commit.sql` remains intentionally pending on hosted until it can be applied while preserving its exact CLI-generated migration version.

Do not use the Supabase connector `apply_migration` for that pending migration if it cannot preserve version `20260831002829`; doing so would recreate migration-history drift.

## Continuation order

When an isolated replay environment becomes available:

1. materialize only the historical consolidated snapshot at `249d644...`;
2. use current `main` copies of byte-identical 588→596;
3. replay through canonical migrations from `20260810120700` onward without altering production;
4. record every first failure and determine whether it belongs to missing prehistory or a genuinely non-replayable later migration;
5. only after full green replay prepare an implementation PR for the baseline strategy;
6. keep the pending Direct Supplier atomic hosted migration as a separate controlled operation.