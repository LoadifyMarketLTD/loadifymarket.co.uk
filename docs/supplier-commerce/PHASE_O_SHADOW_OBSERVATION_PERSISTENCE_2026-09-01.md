# Phase O Shadow Observation Persistence — 2026-09-01

Base main: `8589c056799f1f7aa485b275e0158eafdc1572ed`

Supabase project: `fwdfpmfvgygvqciecesx` (`loadify-market`, `ACTIVE_HEALTHY`).

## Hosted pre-state

Read-only inspection confirmed the controlled-pilot schema and readiness RPCs are present, while pilot programs, pilot offers, cohort members, and pilot evidence all contain zero rows. No durable Phase O Shadow-review table existed.

## Boundary

Migration `20260901141607_phase_o_shadow_observation_persistence.sql` adds a private append-only observation ledger plus service-role-only record/read RPCs.

An observation must be tied to the exact pilot, provider, `order_submission` capability, policy version, existing order, pilot cohort, pilot product allowlist, and order-value cap. The system decision is derived on the server from canonical readiness and the provider execution registry; callers cannot provide the system decision.

## Promotion policy

No canonical repository threshold currently defines when Shadow observations are sufficient for promotion. This change does not invent one. The reader aggregates factual metrics but returns `passed: false` and `passPolicyConfigured: false` until a separate promotion policy is defined and validated.

Therefore durable persistence does not authorize Phase O activation.

## Security

The new table is in `private`, has RLS enabled, has direct role grants revoked, and is append-only. New privileged RPCs use an empty search path, require an active admin actor, and are executable only by `service_role`.

The runtime accepts only the operator outcome for `shadow_observe`, reads durable evidence server-side, and fails closed when the reader is absent or evidence does not match the exact pilot/provider/capability/source/policy binding.

No external commerce action is enabled by this work.

## Release gate

Validate exact diff, targeted tests, targeted lint, migration health, TypeScript, production build, instrumented Netlify, hosted schema/ACL/RLS/advisor state, then restore temporary build instrumentation bit-exact and require clean-head Netlify plus zero-behind before merge.

The Supabase CLI binary was unavailable in this environment, so the migration filename timestamp was captured from the current UTC clock. Hosted DDL remains unapplied until the source gate passes.
