browser
mobile
buyer response
seller response
client logs.

Buyer/Seller nu văd:

- supplier API credentials;
- supplier cost;
- internal margin;
- purchasing details;
- internal risk;
- private operational notes.

Enforcement:

SERVER BOUNDARY.

Nu UI-only.

======================================================================
37. DATA RETENTION / UK GDPR / PRIVACY LIFECYCLE
======================================================================

Security ≠ Privacy.

Trebuie definite:

- data minimisation;
- purpose;
- access;
- retention;
- deletion;
- anonymisation;
- pseudonymisation;
- audit.

Categorii:

- buyer PII;
- seller PII;
- supplier PII;
- addresses;
- phones;
- emails;
- devices;
- push tokens;
- payment references;
- tracking/location;
- support;
- audit;
- commercial history.

Right to erasure
NU înseamnă automat:

DELETE COMMERCIAL HISTORY.

Reconcile legal retention vs privacy rights.

Nu inventa retention periods.

Verifică surse oficiale actuale.

======================================================================
38. OBSERVABILITY
======================================================================

Audit logs singure nu sunt suficiente.

Construiește:

METRICS
STRUCTURED LOGS
CORRELATION IDs
ALERTS.

Monitorizează:

- supplier API errors;
- adapter errors;
- catalog sync;
- stock age;
- price age;
- stock mismatch;
- price mismatch;
- payment reconciliation failure;
- acknowledgement latency;
- supplier timeout;
- tracking lag;
- shipment exceptions;
- refund failures;
- recovery backlog;
- ledger mismatch;
- notification failures;
- auth anomalies.

======================================================================
39. INCIDENT MANAGEMENT
======================================================================

Definește severity:

P0
P1
P2
P3

sau canonical equivalent.

Incident trebuie să poată avea:

- ID;
- severity;
- subsystem;
- affected scope;
- detected_at;
- owner;
- containment;
- remediation;
- resolution;
- post-incident record.

P0 fără owner/remediation path
≠ incident management.

======================================================================
40. FEATURE FLAGS / CONTROLLED RELEASE
======================================================================

Supplier Commerce nu se activează monolitic.

Support control:

- per supplier;
- per model;
- per category;
- per territory;
- per feature;
- per integration;
- optionally per cohort.

Server enforced.

Nu doar UI hidden.

Order lifecycle trebuie să rămână deterministic.

O comandă nu trebuie să schimbe contractul în mijlocul lifecycle-ului
din cauza unui rollout.

======================================================================
41. ROLLBACK
======================================================================

Pentru release important:

ROLLFORWARD PLAN
ROLLBACK PLAN
DATA COMPATIBILITY PLAN.

Rollback nu șterge commercial history.

Rollback-ul trebuie demonstrat,
nu doar documentat.

======================================================================
42. BACKUP / DISASTER RECOVERY
======================================================================

Definește și validează:

- backup coverage;
- frequency;
- RPO;
- RTO;
- restore procedure;
- restore test;
- event replay;
- webhook replay;
- failed job replay;
- sync reprocessing;
- reconciliation reprocessing;
- rebuilding derived state.

BACKUP EXISTS
≠
RESTORE PASS.

======================================================================
43. SUPPLIER SIMULATOR
======================================================================

Înainte de supplier production:

simulator/test adapter.

Trebuie să simuleze:

- stock available;
- stock zero;
- price change;
- timeout;
- provider 500;
- duplicate acknowledgement;
- lost response after supplier accepted;
- partial fulfilment;
- tracking;
- dispatch;
- delivery;
- lost shipment;
- cancellation;
- return;
- refund;
- reimbursement.

Production supplier nu este test environment.

======================================================================
44. PILOT
======================================================================

Nu începe cu mii de produse.

Pilot controlat.

Recommended baseline dacă business contract nu îl schimbă:

Territory:
Great Britain.

Supplier:
1.

Products:
aprox. 5–10 low-risk.

Verifică real:

- import;
- provenance;
- compliance;
- pricing;
- stock;
- checkout;
- payment;
- supplier submission;
- acknowledgement;
- tracking;
- delivery;
- buyer communication;
- return;
- refund;
- recovery;
- reconciliation.

Pilot PASS
→ scale gradual.

======================================================================
45. SUPPLIER PERFORMANCE SCORE
======================================================================

După suficiente date reale:

score based on:

- stock accuracy;
- price accuracy;
- acknowledgement;
- acceptance;
- dispatch;
- delivery;
- tracking;
- defects;
- cancellations;
- returns;
- recovery;
- complaints;
- margin;
- exceptions;
- SLA compliance.

Scorul trebuie să fie explicabil.

Nu aplica auto-ban pe scor opac.

======================================================================
46. MOBILE RULE
======================================================================

Mobile nu este produs separat.

WEB BUSINESS CONTRACT
=
MOBILE BUSINESS CONTRACT.

Nu accepta:

web lifecycle A / mobile lifecycle B
web privacy A / mobile privacy B
web order A / mobile order B
web stock A / mobile stock B.

Dacă sunt două contracte:

identify canonical
→ migrate consumer
→ retire bypass
→ E2E.

======================================================================
47. RETRY / IDEMPOTENCY / CONCURRENCY
======================================================================

Analizează:

- double click;
- retry;
- reconnect;
- timeout;
- webhook replay;
- duplicate provider response;
- duplicate acknowledgement;
- parallel worker;
- stale client;
- race condition.

În special:

checkout
payment
inventory reservation
supplier submit
refund
return
stock sync
price sync
tracking
webhooks.

UI button disable nu este data-integrity control.

======================================================================
48. SOURCE OF TRUTH ORDER
======================================================================

1. CANONICAL EXECUTION CONTRACT
2. CURRENT BUSINESS CONTRACT
3. EFFECTIVE RUNTIME
4. CANONICAL SERVER BOUNDARY
5. EFFECTIVE DB CONTRACT
6. RLS / SECURITY
7. WEB / MOBILE CONSUMERS
8. TESTS
9. LEGACY DOCUMENTATION.

Test stale nu controlează runtime-ul.

Legacy page nu controlează business contractul.

Provider API nu controlează Loadify internal architecture.

======================================================================
49. ROOT CAUSE RULE
======================================================================

SYMPTOM
→ E2E TRACE
→ SOURCE OF TRUTH
→ ROOT CAUSE
→ CANONICAL FIX
→ ALL CONSUMERS
→ BRANCH GUARD
→ PASS.

Nu face 5 patches dacă există o singură cauză.

======================================================================
50. TEST RULE
======================================================================

TESTS = GATES.

Nu obiectiv.

STALE TEST
→ fix test.

WRONG RUNTIME
→ fix runtime.

STALE DOC
→ fix doc.

BLOCKED
≠ PASS.

NOT RUN
≠ VERIFIED.

UNIT PASS
≠ E2E PASS.

======================================================================
51. CURRENT EXTERNAL RULE VALIDATION
======================================================================

Pentru:

- Stripe;
- Stripe Connect;
- UK VAT;
- customs;
- product regulations;
- UK GDPR;
- supplier APIs;
- carrier APIs;
- provider policies;

folosește documentație oficială actuală.

Nu implementa reguli volatile din memorie.

======================================================================
52. GITHUB EXECUTION RULE
======================================================================

Înainte de write:

REFETCH HEAD.

După write:

REFETCH COMMIT
→ EXACT DIFF
→ FILE COUNT
→ ADDITIONS
→ DELETIONS
→ COLLATERAL
→ NEW HEAD.

Dacă HEAD changed:

STOP
→ REFETCH
→ RECONCILE
→ REAPPLY.

NU:

git reset --hard
git clean
git add . fără control
force push fără motiv verificat.

======================================================================
53. PRODUCTION SAFETY
======================================================================

CODE ≠ PRODUCTION DEPLOYMENT.

Nu modifica automat:

- production DB;
- production Stripe;
- production auth;
- production secrets;
- supplier credentials;
- production storage;
- live orders;
- live payments.

Ordine:

CODE
→ BRANCH GUARD
→ SAFE VALIDATION
→ E2E
→ RECONCILIATION
→ CONTROLLED DEPLOYMENT.

======================================================================
54. NU FOLOSI PROPRIETARUL CA TESTER
======================================================================

Dacă poți verifica:

VERIFICĂ TU.

Nu trimite proprietarului test după test.

Îi ceri acțiune numai dacă:

- nu ai acces;
- este necesar;
- nu există alternativă;
- este sigur;
