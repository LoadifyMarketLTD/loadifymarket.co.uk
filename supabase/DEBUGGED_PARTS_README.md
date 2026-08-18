# Supabase SQL Run Guide — Loadify Market

## Source of truth

The **only supported executable database source** is:

```text
supabase/migrations/
```

Apply migrations in version order. Do not bootstrap or repair a Loadify Market
project by running historical standalone SQL snapshots from the `supabase/`
root directory.

## Deprecated bootstrap files

`00_consolidated_schema.sql` is intentionally non-executable and must not be
used to create or repair a database. It remains only as a tombstone so older
instructions fail safe instead of recreating stale schema.

The current modular fulfilment/RFQ reference is:

```text
06_fulfilment_rfq.sql
```

It contains only generic Loadify order fulfilment, shipment events and RFQ
schema. Production changes still belong in `supabase/migrations/`, not in the
modular reference files.

## Fresh environments

Create the database by applying the ordered migration set. Do **not** run
`00_reset.sql` followed by a consolidated bootstrap snapshot.

## Existing environments

For upgrades or repairs:

1. inspect the current migration history;
2. add an idempotent migration under `supabase/migrations/`;
3. review RLS, grants, functions and triggers affected by the change;
4. apply the migration;
5. verify the resulting schema and run security/performance advisors.

Do not copy old SQL fragments from previous setup attempts into the SQL Editor.
This prevents schema drift and prevents retired cross-project database surfaces
from being recreated accidentally.
