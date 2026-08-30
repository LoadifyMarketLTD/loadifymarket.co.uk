# Loadify Market — P0 Release & Database Governance Checkpoint — 2026-08-30

## Scope

This checkpoint records the first executable remediation slice from the Loadify Market full-platform audit.

It is intentionally limited to release/database governance. It makes **no Workspace/Super Admin visual changes**, does not activate Supplier Commerce, does not enable Avasam Orders/PII, and does not mutate the hosted Supabase schema or data.

## Canonical phase correction

The current canonical Supplier Commerce contract records:

- Gate B: **PASS**;
- Phases C–N: **complete**;
- current execution phase: **Phase O — Controlled Pilot**.

Avasam commercial/transactional capability gaps remain real, but they are Phase O provider/pilot blockers. They are not evidence that the global Gate B contract is still blocked.

## Audited repository base

P0 branch base:

`0602ddfb8970eae956a4644f7b1da1d1794cf03d`

This is current `main` after merge of PR #622.

GitHub branch state at audit time:

- `main` protected: **false**;
- required status checks enforcement: **off**;
- repository rulesets: none observed in the preceding audit;
- branch-protection write capability is not exposed by the connected GitHub tool, so this checkpoint does not falsely claim that repository settings were changed.

## Confirmed migration source-of-truth split

README/tombstone contract says `supabase/migrations/` is the supported migration source.

Hosted Supabase project migration history was queried read-only through `supabase_migrations.schema_migrations`.

Fresh 2026-08-30 counts:

- hosted ledger migrations: **158**;
- repository files in `supabase/migrations/` before this P0 repair: **9**;
- exact `(version, name)` matches before this P0 repair: **8**;
- repository canonical entries without exact hosted identity: **1**;
- hosted ledger entries without an exact repository file before the repair: **150**.

The one repository identity mismatch was:

- repository: `20260828123500_marketplace_seller_direct_publish.sql`;
- hosted ledger: `20260828123840 marketplace_seller_direct_publish`.

The SQL semantics were compared with the hosted applied statement. The repository copy contains the same executable migration plus an explanatory comment. This P0 branch therefore renames the repository file to the hosted version `20260828123840` without executing anything against Supabase.

After the rename:

- repository canonical files: **9**;
- exact hosted `(version, name)` matches: **9**;
- hosted ledger entries still not represented exactly in the repository: **149**.

This is still material debt. The rename fixes one proven identity defect; it does not pretend to solve the historical ledger gap.

## Empty-database replay verdict

**BLOCKED / NOT PROVEN.**

`supabase/migrations/` cannot currently bootstrap an empty database.

Evidence:

1. the first timestamped repository migration (`20260818102000_remove_unused_transport_surfaces_20260818.sql`) mutates/removes pre-existing objects rather than creating the base schema;
2. the next migration (`20260818160500_enforce_product_shipping_product_fk.sql`) operates on `public.product_shipping`, which presupposes the table already exists;
3. the hosted migration ledger itself begins at `20260810120700 reconcile_core_rls_policies_20260810`, already a reconciliation/hardening operation rather than original schema creation.

Therefore two distinct artifacts must eventually exist:

1. a verified historical/base-schema baseline capable of creating the pre-ledger database state;
2. the exact ordered hosted migration ledger after that baseline.

Do not rewrite production migration history merely to make a clean replay test green.

## CI defect closed by this branch

The previous CI job was named `Migration Health` but only:

- checked that `supabase/VERIFY_migration_health.sql` existed;
- inventoried numbered legacy SQL files directly under `supabase/`;
- did not inspect the declared canonical `supabase/migrations/` truth;
- did not execute the verification SQL against a database;
- could therefore be green while canonical/hosted drift existed.

This branch replaces that misleading job with **Migration Governance**.

The new guard:

- inventories `supabase/migrations/` directly;
- requires every canonical migration file to be explicitly classified in `supabase/migration-governance-baseline.json`;
- validates timestamp/name identity against the baseline;
- rejects duplicate versions/names;
- rejects an unhosted migration inserted historically at or before the audited hosted head;
- preserves the `00_consolidated_schema.sql` tombstone contract;
- verifies `VERIFY_migration_health.sql` exists but explicitly states this is not execution evidence;
- prints the known hosted/repository debt instead of hiding it;
- passes only when the audited drift baseline has not worsened.

This is a **drift guard**, not a clean-bootstrap PASS.

## Immediate interaction with open PR #599

PR #599 currently contains these timestamped repository migration files:

- `20260825200500_signup_intent_auth_foundation.sql`;
- `20260825201000_auth_signup_cutover_control.sql`;
- `20260825201500_auth_signup_intent_consumption.sql`;
- `20260826070000_auth_before_user_created_hook.sql`.

The equivalent Auth stages were applied hosted on 2026-08-29 under different hosted versions, including:

- `20260829080642 auth_signup_intent_foundation_676`;
- `20260829080831 auth_signup_cutover_control_676a`;
- `20260829080911 auth_signup_intent_consumption_677_cutover_safe`;
- `20260829080941 auth_before_user_created_hook_678_cutover_safe`;
- followed by hosted repair/validation migrations.

This means #599 must not be merged with those repository migration identities unreviewed. A future Supabase CLI migration run could treat their older versions as unapplied historical migrations.

Required before #599 merge:

1. determine which #599 SQL files are true baseline/replay artifacts versus exact hosted migrations;
2. compare their effective SQL contract with the applied hosted sequence, including the later hosted repair migrations;
3. reconcile filename/version strategy without rewriting production history;
4. rebase #599 onto the migration-governance guard and require the guard to pass.

This is independent of #599's separate remaining Auth hook configuration gate.

## Branch protection P0

`main` remains unprotected at this checkpoint because the available GitHub connector exposes branch-protection reads but no safe branch-protection write action.

Required repository settings once applied through an authorized surface:

- require pull request before merge;
- block force pushes;
- block branch deletion;
- require conversation resolution;
- require current CI checks only after their runtime availability is confirmed;
- include `Lint`, `Type Check`, `Unit Tests`, `Migration Governance`, `Critical Smoke Tests`, and `Production Build` as required checks when GitHub Actions is actually assigning runners reliably;
- do not require a check that cannot execute because of billing/runner infrastructure.

## P0 continuation order

1. **Merge-safe migration governance** — this branch.
2. **Reconcile #599 historical Auth migration identities** before #599 can be merge-safe from a DB-ledger perspective.
3. **Recover hosted ledger evidence** into a durable repository artifact without blindly replaying 149 historical entries.
4. **Define and verify the pre-2026-08-10 base-schema baseline**.
5. **Create clean replay harness**: base baseline -> hosted ordered deltas -> deterministic seed -> verification SQL.
6. **Add RLS/privilege test matrix** for anon, Buyer A/B, Seller A/B, suspended Seller, Admin and server-only paths.
7. **Add browser E2E** after database/auth truth is stable.
8. **Continue Phase O Avasam controlled-pilot readiness** only against the reconciled database/release foundation.

## Explicit non-PASS items

The following remain **NOT PASSED**:

- empty-database Supabase replay;
- complete repository representation of the 158 hosted migration ledger entries;
- automated execution of `VERIFY_migration_health.sql` against a reconstructed database;
- comprehensive RLS role-isolation harness;
- browser E2E suite;
- GitHub `main` branch protection;
- Avasam transactional capability readiness for shipping/order submission/acknowledgement/tracking/cancellation/returns/reimbursement.

## Safety state

- no hosted Supabase DDL write;
- no hosted data write;
- no migration-history rewrite;
- no Supplier Commerce control activation;
- no Avasam Orders/PII activation;
- no Workspace/Super Admin/footer visual changes;
- no PR #359 visual import.
