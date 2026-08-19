# PRIVACY, RETENTION AND DATA MINIMISATION CONTRACT

Status: PREPARATION ONLY. Final legal/privacy rules require current authoritative verification before implementation.

## Purpose

Prevent Supplier Commerce from creating uncontrolled copies of customer, supplier, provider or operational data while preserving the evidence required for orders, finance, disputes, compliance and incident recovery.

## Core rule

COLLECT ONLY WHAT A CANONICAL RESPONSIBILITY REQUIRES
→ CLASSIFY
→ AUTHORISE
→ MINIMISE
→ RETAIN FOR A DEFINED PURPOSE/PERIOD
→ DELETE/ANONYMISE WHEN THE PURPOSE ENDS, subject to legal/financial evidence obligations.

## Data classes

At design time classify at minimum:
- buyer identity/contact;
- shipping/billing address;
- supplier identity/business details;
- supplier credentials/secrets;
- product/catalog facts;
- provenance/compliance evidence;
- order/payment/financial records;
- fulfilment/tracking records;
- returns/refunds/recovery evidence;
- support/incidents;
- provider raw payloads;
- AI inputs/outputs;
- logs/metrics/traces;
- operator/admin audit actions.

## Minimisation principles

1. Discovery should not ingest buyer PII.
2. Supplier adapters receive only buyer/order fields required for fulfilment under the chosen commercial model.
3. Provider raw payloads are not retained indefinitely by default.
4. Credentials are never copied into business tables, analytics or logs.
5. AI merchandising does not require customer PII.
6. Analytics should prefer aggregated/pseudonymised data where full identity is unnecessary.
7. Debugging data must not become a permanent shadow database.

## Buyer address forwarding

Supplier-Fulfilled direct delivery may require forwarding delivery data to a supplier/fulfilment provider.

Gate B/privacy design must define:
- lawful/contractual purpose;
- exact fields needed;
- provider role/responsibility;
- transfer geography;
- retention expectation;
- onward-transfer restrictions;
- buyer-facing transparency;
- incident responsibility.

No supplier receives unrestricted buyer profile access merely because it fulfils one order.

## Secrets and credentials

Supplier/provider credentials:
- server-side only;
- encrypted/managed by approved secret storage;
- least-privilege scope;
- masked in admin;
- never written to logs;
- rotation metadata separated from secret value;
- revocation/kill-switch supported.

## Raw provider evidence

Raw payload retention may be useful for:
- dispute evidence;
- reconciliation;
- incident analysis;
- provider contract debugging.

But retention must be deliberate. Prefer storing:
- normalized canonical fact/event;
- provider reference;
- hash/evidence pointer;
- minimal required raw excerpt or encrypted evidence object;
rather than uncontrolled full payload duplication.

## Financial/commercial history

Privacy deletion must not corrupt mandatory commercial/financial/audit history.

Where legal retention applies, consider:
- restricting access;
- separating identity from transaction evidence;
- pseudonymisation after operational need ends;
- preserving immutable financial amounts/events;
- documented retention reason.

## AI and imported content

Before sending source data to any AI service:
- classify data;
- remove unnecessary PII/secrets;
- confirm rights/contractual permission;
- record model/provider/version where audit requires;
- apply AI Facts Lock;
- avoid sending payment credentials or sensitive supplier secrets.

## Logs, traces and incidents

Observability must use structured redaction.

Never log:
- secret keys;
- access tokens;
- full payment card data;
- passwords;
- unnecessary full addresses;
- unrestricted provider payloads.

Correlation IDs should permit debugging without exposing sensitive content.

## Subject rights / deletion workflow preparation

Future implementation must map user/privacy requests across:
- users/profiles;
- orders;
- messages/support;
- supplier commerce entities;
- logs/analytics;
- external processors/providers;
- backups where applicable.

Deletion cannot simply cascade through financial/order evidence.

## Retention registry

Every Supplier Commerce data family should eventually have:
- purpose;
- data owner;
- sensitivity class;
- source;
- processors/recipients;
- retention rule;
- deletion/anonymisation method;
- legal hold override if applicable;
- backup handling;
- incident classification.

## Cross-border/provider review

Before enabling a provider, verify current privacy terms and data locations from authoritative provider documentation. Do not assume a provider's historical region/retention policy remains current.

## Backup interaction

Deletion/retention policy must define what happens in backups and recovery snapshots. Restoring a backup must not silently resurrect operationally deleted state without reconciliation.

## PASS criteria

Supplier Commerce privacy is not PASS until:
- data inventory exists;
- purpose/ownership is defined;
- unnecessary PII is excluded;
- provider sharing is scoped;
- secrets are isolated;
- retention/deletion rules exist;
- logs are redacted;
- legal/financial history remains intact;
- backup/recovery interaction is documented;
- current authoritative privacy requirements have been verified before rollout.
