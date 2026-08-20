# LOADIFY SUPPLIER COMMERCE
# CANONICAL EXECUTION CONTRACT — FINAL VERSION

ACEST DOCUMENT ÎNLOCUIEȘTE TOATE INSTRUCȚIUNILE ANTERIOARE PRIVIND
HARDENING-UL LOADIFY MARKET ȘI IMPLEMENTAREA SUPPLIER COMMERCE.

NU ESTE UN DOCUMENT DE IDEI.

ESTE CONTRACTUL TĂU DE EXECUȚIE.

DIN ACEST MOMENT:

NU MAI EXTINZI PLANUL LA NESFÂRȘIT.

Dacă descoperi ulterior un risc real arhitectural, juridic, financiar,
operațional sau de securitate care ar face produsul incorect,
îl documentezi și îl integrezi.

În rest:

EXECUȚI.

======================================================================
1. ROLUL TĂU PERMANENT
======================================================================

Ai permanent două roluri simultane:

LOADIFY SUPPLIER COMMERCE CREATOR / ENGINEER

+

LOADIFY SUPPLIER COMMERCE BRANCH GUARD.

Nu alegi unul dintre ele.

FIECARE schimbare trece prin ambele.

======================================================================
2. LOADIFY SUPPLIER COMMERCE CREATOR / ENGINEER
======================================================================

Ești inginerul responsabil să duci Loadify Market
la nivelul unui produs comercial profesionist.

Nu ești consultant.

Nu ești doar auditor.

Nu îmi spui doar ce trebuie făcut.

Nu transformi proprietarul în testerul tău.

Tu:

- investighezi;
- înțelegi arhitectura;
- identifici source of truth;
- identifici root cause;
- proiectezi;
- implementezi;
- repari;
- integrezi;
- consolidezi;
- elimini bypass-uri;
- elimini contracte paralele;
- protejezi istoricul comercial;
- verifici E2E;
- finalizezi;
- continui autonom.

Nu mă întrebi pentru micro-decizii tehnice.

Dacă decizia rezultă din:

CANONICAL EXECUTION CONTRACT
+
business contract
+
runtime actual
+
schema efectivă
+
security contract

iei singur decizia.

Mă implici numai dacă există o DECIZIE REALĂ DE BUSINESS
pe care contractul nu o definește.

======================================================================
3. LOADIFY SUPPLIER COMMERCE BRANCH GUARD
======================================================================

După FIECARE schimbare:

CREATOR
→ IMPLEMENTARE
→ BRANCH GUARD
→ inspect exact diff
→ verifică business contract
→ verifică impact E2E
→ verifică website
→ verifică mobile
→ verifică DB
→ verifică API
→ verifică auth
→ verifică RLS
→ verifică Admin/Super Admin
→ verifică finanțe
→ verifică privacy/security
→ verifică collateral damage

Dacă apare FAIL:

STOP
→ root cause
→ repair/revert
→ recheck exact diff
→ recheck E2E
→ numai după PASS continui.

Branch Guard trebuie să verifice dacă schimbarea:

- a stricat alt dashboard;
- a stricat Buyer;
- a stricat Seller;
- a stricat Supplier;
- a stricat Admin;
- a stricat Super Admin;
- a stricat Mobile;
- a modificat auth;
- a modificat ownership;
- a modificat permissions;
- a slăbit RLS;
- a introdus service-role inutil;
- a modificat product lifecycle;
- a modificat order lifecycle;
- a modificat fulfilment;
- a modificat Stripe;
- a afectat refunds/returns;
- a introdus două source of truth;
- a introdus API paralel;
- a reactivat cod legacy;
- a introdus destructive deletion;
- a expus supplier cost;
- a expus internal margin;
- a expus credentials;
- a stricat commercial history;
- a introdus hardcoding specific unui provider;
- a stricat web ↔ mobile consistency;
- a introdus date false;
- a transformat unavailable în 0.

NU continui peste FAIL.

======================================================================
4. REGULA DE PRELUARE A PROIECTULUI
======================================================================

Înainte de ORICE write:

RECUPEREAZĂ STAREA REALĂ.

Verifică factual:

- repository corect;
- `main`;
- HEAD;
- branch-uri;
- PR-uri deschise;
- PR #508;
- PR #504;
- orice PR paralel relevant;
- migration head;
- schema actuală;
- canonical APIs;
- Auth;
- Mobile sessions;
- Stripe;
- storage;
- notifications;
- seller;
- buyer;
- product;
- order;
- fulfilment;
- Admin;
- Super Admin.

NU presupune că un agent anterior s-a oprit.

Dacă nu ai o comandă explicită pentru stop/cancel agent:

NU PRETINDE CĂ L-AI OPRIT.

În schimb:

REFETCH HEAD ÎNAINTE DE FIECARE WRITE.

Dacă HEAD s-a schimbat:

STOP WRITE
→ REFETCH
→ READ NEW STATE
→ RECONCILE
→ REAPPLY ONLY REQUIRED CHANGE.

Nu suprascrie munca paralelă.

======================================================================
5. PRINCIPIUL STRATEGIC
======================================================================

NU terminăm inutil arhitectura veche înainte de Supplier Commerce.

Strategia este:

CRITICAL FOUNDATION
→ CHECKPOINT A
→ FOUNDATION FREEZE
→ HARD STOP OLD EXTENSIVE HARDENING
→ BUSINESS CONTRACT GATE B
→ SUPPLIER COMMERCE
→ SIMULATOR
→ PILOT
→ CONTROLLED SCALE
→ FINAL FULL-PRODUCT HARDENING.

======================================================================
6. PR #508 — CANONICAL SELLER LISTING DELETION
======================================================================

PR #508 trebuie închis complet.

Principiu:

COMMERCIAL HISTORY MUST NOT BE DESTRUCTIVELY DELETED.

Dacă un product/listing a participat la:

- order;
- invoice;
- payment;
- refund;
- return;
- dispute;
- stock history;
- supplier transaction;
- analytics;
- audit history;

nu îl ștergi destructiv.

Verifică:

- actual HEAD #508;
- actual blocker ProductFormPage;
- canonical deletion endpoint;
- seller ownership;
- seller isolation;
- no-history listing;
- listing with history;
- archive/deactivate/retire semantics;
- browse/search exclusion;
- product detail;
- existing order references;
- invoice references;
- refund references;
- return references;
- FK;
- audit;
- Admin;
- Super Admin;
- Mobile.

PR #508 DONE:

ROOT CAUSE FIXED
E2E PASS
BRANCH GUARD PASS
INTEGRATED/CLOSED.

======================================================================
7. PR #504 — PUSH TOKEN PRIVACY / MOBILE SESSIONS
======================================================================

PR #504 trebuie închis înainte de Supplier Commerce notifications.

Verifică:

- push token ownership;
- token isolation;
- login;
- logout;
- account switch;
- token replacement;
- duplicate token;
- stale token;
- revoked session;
- expired session;
- device ownership;
- device reassignment;
- RLS;
- server boundary;
- User A cannot receive User B notification;
- real device E2E.

DONE:

PUSH PRIVACY PASS
MOBILE SESSION ISOLATION PASS
DEVICE E2E PASS
BRANCH GUARD PASS
PR CLOSED.

======================================================================
8. CHECKPOINT A — FOUNDATION GATE
======================================================================

Înainte de Supplier Commerce:

AUTH                         PASS
PR #508                      PASS / CLOSED
PR #504                      PASS / CLOSED
PUSH TOKEN PRIVACY           PASS
MOBILE SESSION ISOLATION     PASS
SELLER OWNERSHIP             PASS
USER ISOLATION               PASS
CRITICAL RLS                 PASS
COMMERCIAL HISTORY SAFETY    PASS
CRITICAL MIGRATIONS          PASS
TYPE SAFETY                  PASS
BUILD                        PASS
NO FOUNDATION P0             PASS
NO RELEVANT FOUNDATION P1    PASS.

Checkpoint A NU înseamnă:

„vechiul marketplace este perfect”.

Înseamnă:

„fundația Supplier Commerce este sigură”.

======================================================================
9. SUPPLIER COMMERCE BASELINE FREEZE
======================================================================

După Checkpoint A:

creezi snapshot factual:

- `main` SHA;
- migration head;
- schema contract;
- canonical APIs;
- auth contract;
- mobile session contract;
- listing deletion contract;
- open PRs;
- known risks;
- intentionally deferred legacy work.

Acesta este:

SUPPLIER COMMERCE BASELINE.

Schimbările viitoare pe `main` se reconciliază cu baseline-ul.

Nu sunt absorbite automat.

======================================================================
10. HARD STOP OLD EXTENSIVE HARDENING
======================================================================

După Checkpoint A:

STOP dezvoltării extensive a vechiului:

- Product UI;
- Order UI;
- Fulfilment UI;

dacă urmează să fie extinse/restructurate.

Nu consuma timp pe:

- cosmetic polish;
- refactor fără valoare business;
- teste exhaustive pe flow-uri care vor fi schimbate;
- duplicate abstractions;
- temporary components;
- legacy cleanup fără risc real.

EXCEPȚIE:

P0/P1 privind:

security
privacy
payments
auth
data integrity
RLS
commercial history
mobile sessions
production safety

se repară imediat.

======================================================================
11. GATE B — BUSINESS CONTRACT
======================================================================

NU faci prima Supplier Commerce migration
înainte de Gate B PASS.

Definește separat:

1. MARKETPLACE SELLER
2. LOADIFY DIRECT
3. LOADIFY SUPPLIER-FULFILLED.

Pentru fiecare:

- seller of record;
- merchant of record unde este relevant;
- supplier;
- fulfilment provider;
- invoice issuer;
- payment flow;
- platform fee;
- supplier payable;
- VAT responsibility;
- refund responsibility;
- return responsibility;
- chargeback responsibility;
- product liability responsibility;
- support responsibility;
- stock ownership;
- fulfilment ownership.

Orice regulă juridică/fiscală volatilă:

VERIFICĂ SURSE OFICIALE ACTUALE.

Nu implementa din memorie.

======================================================================
12. SUPPLIER ADAPTER ARCHITECTURE
======================================================================

Loadify nu devine dependent structural de:

AliExpress
PagePilot
DSers
AutoDS
sau alt provider.

Definim:

SUPPLIER ADAPTER INTERFACE.

Provider:
→ adapter
→ canonical Loadify contract.

Capabilities pot include:

- supplier identity;
- catalog;
- variants;
- stock;
- price;
- shipping;
- order submission;
- acknowledgement;
- tracking;
- cancellation;
- returns;
- reimbursement.

Commerce engine-ul nu cunoaște provider-specific implementation.

======================================================================
13. API / ADAPTER VERSIONING
======================================================================

Adapterele și contractele interne importante sunt versionate.

Exemplu:

SupplierAdapter V1
SupplierAdapter V2.

Definește:

- request contract;
- response contract;
- errors;
- capabilities;
- idempotency;
- acknowledgements;
- deprecation;
- backward compatibility;
- migration path;
- removal criteria.

Nu rupe commerce engine-ul când un provider se schimbă.

======================================================================
14. SUPPLIER QUALIFICATION
======================================================================

Canonical lifecycle:

CANDIDATE
→ VERIFICATION
→ APPROVED
→ RESTRICTED
→ SUSPENDED
→ BANNED.

Verifică unde este relevant:

- identity;
- business identity;
- warehouse/origin;
- UK shipping;
- API/feed capability;
- SKU quality;
- variants;
- stock reliability;
- price reliability;
- tracking;
- returns;
- documentation;
- compliance;
- image/content rights;
- costs;
- performance.

Supplier approval ≠ Product approval.

======================================================================
15. SUPPLIER SLA / COMMERCIAL CONTRACT ENGINE
======================================================================

Qualification răspunde:

„putem lucra cu supplierul?”

SLA răspunde:

„în ce condiții?”

SLA poate include:

- acknowledgement deadline;
- dispatch deadline;
- stock freshness;
- price freshness;
- tracking deadline;
- cancellation terms;
- return window;
- refund response;
- reimbursement deadline;
- defect tolerance;
- stock accuracy target;
- cancellation threshold;
- escalation;
- suspension threshold;
- kill-switch threshold.

SLA:

VERSIONED
EFFECTIVE-DATED
AUDITABLE.

Supplier Performance Score se măsoară și față de SLA,
nu numai față de averages.

======================================================================
16. PRODUCT COMPLIANCE ENGINE
======================================================================

Classification:

GREEN
→ streamlined candidate

AMBER
→ manual review

RED
→ prohibited.

Poate utiliza:

- category;
- product type;
- claims;
- materials;
- age restriction;
- regulated characteristics;
- required evidence;
- territory.

Nu trata toate produsele la fel.

======================================================================
17. IMAGE / COPYRIGHT / CONTENT PROVENANCE
======================================================================

Fiecare imported asset trebuie să poată avea:

- source;
- supplier;
- original reference;
- imported_at;
- rights status;
- transformation status;
- review status.

Nu:

„imaginea există pe internet → o publicăm”.

======================================================================
18. CANONICAL SUPPLIER DATA MODEL
======================================================================

Nu transforma `products` într-un dumping ground
pentru supplier metadata.

Nu folosi:

`type=dropshipping`

ca arhitectură.

Merchant model și fulfilment model sunt separate.

Modele conceptuale pot include:

- supplier;
- supplier account;
- supplier product;
- supplier variant;
- supplier offer;
- supplier cost;
- supplier stock;
- supplier shipping;
- supplier mapping;
- canonical product;
- fulfilment source;
- sync state;
- provenance;
- compliance;
- performance.

NU inventa numele finale ale tabelelor înainte de schema audit.

Business contract
→ schema design
→ migration.

======================================================================
19. CATALOG IDENTITY / CANONICALISATION
======================================================================

Principiu:

ONE CANONICAL PRODUCT
→ MULTIPLE SUPPLIER OFFERS

când produsul este factual același.

Identity signals:

- GTIN;
- EAN;
- UPC;
- ISBN;
- MPN;
- brand;
- manufacturer;
- model;
- variants;
- dimensions;
- pack size;
- verified attributes.

Nu deduplica după titlu AI.

Classification:

CONFIDENT MATCH
POSSIBLE MATCH
DISTINCT
MANUAL REVIEW.

Nu uni destructiv produse dacă match-ul este incert.

======================================================================
20. PRODUCT DISCOVERY / OPPORTUNITY INTELLIGENCE
======================================================================

Discovery este RECOMMENDATION ONLY.

Signals pot include:

- demand;
- trend;
- competition;
- supplier reliability;
- cost;
- landed cost;
- margin;
- delivery;
- return risk;
- compliance risk;
- stock stability;
- price stability;
- seasonality;
- conversion data.

Rezultat:

LOADIFY OPPORTUNITY SCORE.

Trebuie să fie explicabil.

NU auto-publish.

IMPORTANT:

DISCOVERY IS NOT A HARD DEPENDENCY.

Commerce engine-ul trebuie să funcționeze și cu:

- manual product;
- supplier catalog;
- supplier feed;
- approved import.

Discovery evoluează în paralel.
