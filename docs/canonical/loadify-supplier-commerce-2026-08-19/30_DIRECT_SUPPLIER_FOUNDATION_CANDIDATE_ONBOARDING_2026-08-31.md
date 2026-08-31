# 30 — Direct Supplier Foundation Candidate Onboarding — 2026-08-31

## Status

**CLOSED / PASS — implementation merged, no real supplier onboarded**

Implementation PR: **#670 — Add admin-only Direct Supplier Foundation candidate onboarding**

Validated implementation head:

- `8c7d2e0a34b07195593a3a77e97aebac7ee9a893`

Merge commit on `main`:

- `42ce4b110fbc7ee622b64e73b474a9be5c36e327`

Netlify Deploy Preview on the exact validated head: **SUCCESS**.

## Purpose

This gate adds the narrowest legitimate transition from an authentic Direct Supplier onboarding manifest into the existing provider-neutral Supplier Foundation.

It does not approve, activate, qualify or commercially enable a supplier. It only allows an active admin to create or update the Supplier Foundation identity candidate through the existing `server_admin_supplier_foundation_v1` surface with action `upsert_supplier`.

No new database migration or parallel supplier model was introduced.

## Runtime manifest boundary

Externally supplied onboarding JSON is parsed with a strict runtime parser before it can reach Supplier Foundation or feed-admission logic.

The parser:

- rejects unknown top-level manifest fields;
- rejects unknown warehouse fields;
- allowlists the Direct Supplier feed transports `json_api`, `json_feed`, `csv`, `xml`, and `sftp`;
- allowlists the canonical `SupplierAdapterCapability` values;
- requires `commercialApproval=false`;
- requires `hostedActivation='off'`;
- rejects malformed countries, duplicate territories, duplicate capabilities and duplicate warehouse references;
- enforces bounded manifest/body and collection sizes;
- prevents credential-like or arbitrary extra fields from being silently accepted by TypeScript-only structural typing.

Secrets, API keys, bank details and customer PII are not part of `DirectSupplierOnboardingManifestV1` and are not persisted by this path.

## Authorization and write boundary

The Netlify endpoint is POST/OPTIONS only and uses the existing active-account authorization model with role `admin`.

The server-side service-role client may call only:

`public.server_admin_supplier_foundation_v1(actor_id, 'upsert_supplier', payload)`

The candidate-onboarding helper does not expose or call:

- `set_lifecycle`;
- `set_qualification`;
- SLA activation;
- compliance approval;
- adapter registration or activation;
- capability verification/promotion.

Hosted ACL verification before implementation confirmed:

- `service_role` EXECUTE on `server_admin_supplier_foundation_v1`: true;
- `anon` EXECUTE: false;
- `authenticated` EXECUTE: false.

## Foundation payload

Only the identity fields supported by the existing Supplier Foundation upsert are sent:

- `supplierKey`;
- display/legal name;
- business/registration country;
- origin country derived from declared warehouse origin when the manifest contract permits it;
- sanitized warehouse declarations/references.

The following manifest information remains evidence or onboarding intent and is deliberately not promoted by this path:

- registration number;
- VAT number;
- requested adapter capabilities;
- feed capability verification;
- commercial approval;
- hosted activation.

## Post-write verification

After a successful candidate upsert, the implementation reads back through the existing Supplier Foundation decision/binding surface and requires the returned supplier identity to match the manifest.

A newly created supplier remains fail-closed in the Supplier Foundation lifecycle. Candidate onboarding is not equivalent to qualification, approval, readiness or commercial activation.

## Explicit non-scope

This gate performs none of the following:

- supplier lifecycle approval;
- qualification verification;
- SLA approval/activation;
- compliance approval;
- adapter registration/activation;
- capability promotion;
- Phase E catalog mutation;
- canonical product creation;
- Supplier Import batch creation;
- stock/price activation;
- marketplace listing;
- supplier order submission;
- acknowledgement/tracking/cancellation/returns/reimbursement;
- Orders/PII processing;
- checkout or Stripe changes;
- Auth redesign;
- UI redesign;
- GitHub Actions changes.

## Hosted truth after implementation merge

No synthetic or fixture supplier was inserted into hosted Supabase by implementation or validation.

At the gate boundary, Supplier Foundation remained empty until an authentic admin-reviewed supplier manifest is supplied and deliberately submitted through the new endpoint.

Direct Supplier therefore remains:

- `codeState = scaffolded_unverified`;
- verified capabilities = `[]`;
- runtime capabilities = `[]`;
- hosted commercial activation = OFF;
- no real supplier approved;
- no real supplier feed onboarded;
- no Phase E identity mutation performed;
- no marketplace listing generated.

## Next gate

**PHASE O — CONTROLLED PILOT remains OPEN.**

For Direct Supplier, the next real transition is external-evidence-bound: obtain an authentic supplier onboarding manifest, review it as an admin, create the Supplier Foundation candidate, and then collect/verify the canonical qualification, SLA, compliance and adapter evidence required by the existing Supplier Foundation lifecycle.

Do not fabricate a supplier, reuse synthetic test fixture `uk-maker-001` as a commercial identity, or infer approval/capabilities from the existence of the candidate-onboarding route.