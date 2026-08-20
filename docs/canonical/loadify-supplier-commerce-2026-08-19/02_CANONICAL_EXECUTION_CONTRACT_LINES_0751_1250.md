
======================================================================
21. IMPORT PIPELINE
======================================================================

Canonical:

URL / FEED / CATALOG
→ EXTRACT
→ IDENTIFY SUPPLIER
→ NORMALIZE
→ MAP PRODUCT
→ MAP VARIANTS
→ CATEGORY
→ PROVENANCE
→ COMPLIANCE
→ AI ENRICHMENT
→ LANDED COST
→ MARGIN
→ REVIEW
→ PUBLISH.

NU:

URL → PUBLISH.

Pipeline-ul trebuie să fie:

auditable
resumable
idempotent.

Retry ≠ duplicate product.

======================================================================
22. AI FACTS LOCK
======================================================================

AI poate:

- improve title;
- improve description;
- SEO;
- organise facts;
- suggest category;
- produce marketing copy from verified facts.

AI NU poate inventa:

- certification;
- materials;
- dimensions;
- origin;
- compatibility;
- warranty;
- medical claims;
- health claims;
- safety claims;
- technical specifications;
- regulated properties.

VERIFIED FACT
→ AI COPY.

Nu invers.

======================================================================
23. TRUE LANDED COST ENGINE
======================================================================

TRUE LANDED COST poate include:

supplier product cost
+ shipping
+ applicable VAT
+ customs/duty
+ FX
+ payment fees
+ provider fees
+ returns allowance
+ operational allowance
+ supplier failure allowance
+ other real costs.

Nu folosi doar supplier price.

SELL PRICE
− REAL COSTS
= EXPECTED CONTRIBUTION.

======================================================================
24. VERSIONED TAX / VAT / CUSTOMS ENGINE
======================================================================

Nu hardcode tax rules în checkout.

Rules trebuie să poată avea:

- jurisdiction;
- territory;
- transaction model;
- thresholds;
- effective_from;
- effective_until;
- version;
- evidence/source;
- behaviour.

O comandă trebuie să poată fi legată de rule version aplicabilă.

Regulile actuale:

verificate din surse oficiale.

======================================================================
25. FINANCIAL LEDGER / ACCOUNTING TRUTH
======================================================================

Construiește:

COMMERCE FINANCIAL LEDGER.

O singură sursă financiară canonică.

Nu permite ca Admin, Analytics, Orders și Stripe
să calculeze diferit aceleași finanțe.

Financial history:

APPEND-SAFE.

Corecțiile prin:

- adjustment;
- reversal;
- refund;
- recovery;
- chargeback;
- write-off;
- settlement correction.

Ledger poate urmări:

- customer gross;
- customer net;
- VAT;
- processor fee;
- Loadify commission;
- Loadify revenue;
- supplier payable;
- supplier cost;
- supplier shipping;
- customs;
- FX;
- operational costs;
- refund;
- supplier recovery;
- chargeback;
- chargeback fee;
- unrecovered loss;
- final contribution.

Entry fields pot include:

- immutable ID;
- order ID;
- fulfilment leg;
- event type;
- currency;
- amount;
- direction;
- source;
- external reference;
- effective timestamp;
- idempotency reference;
- reconciliation state;
- tax/rule version;
- audit metadata.

Dashboard-urile CONSUMĂ ledger.

Nu reconstruiesc finanțele separat.

======================================================================
26. STOCK ENGINE
======================================================================

SUPPLIER STOCK ≠ LOADIFY SELLABLE STOCK.

Track:

- supplier raw stock;
- confidence;
- safety buffer;
- reserved;
- stale;
- sellable;
- sync timestamp;
- unknown state.

Stale peste policy:

FAIL CLOSED.

Nu vinde stock nedemonstrat.

======================================================================
27. PRICE SYNC ENGINE
======================================================================

Safe price movement:
→ automatic.

Abnormal movement:
→ review.

Margin breach:
→ pause/review.

Supplier price unavailable:
→ fail closed conform policy.

Nu lăsa price spike să transforme comenzile în pierdere.

======================================================================
28. ORDER ORCHESTRATOR
======================================================================

Nu crea order system paralel.

Buyer vede:

ONE CUSTOMER ORDER.

Intern:

FULFILMENT LEG A
FULFILMENT LEG B
FULFILMENT LEG C.

Un order poate combina:

Marketplace Seller
Loadify Direct
Supplier A
Supplier B.

Fiecare leg poate avea:

- fulfiller;
- products;
- quantity;
- cost;
- status;
- shipment;
- tracking;
- exceptions;
- refund/recovery.

======================================================================
29. COMMERCE RISK / FRAUD / ABUSE
======================================================================

Compliance ≠ Risk.

Construiește:

COMMERCE RISK LAYER.

Supplier risks:

- impersonation;
- fake supplier;
- fake stock;
- price manipulation;
- fake tracking;
- unusual cancellations;
- account compromise.

Buyer risks:

- payment fraud;
- account takeover;
- refund abuse;
- return abuse;
- chargeback abuse;
- coupon abuse.

Platform risks:

- duplicate payment;
- duplicate order;
- duplicate refund;
- duplicate supplier submission;
- unusual margin loss;
- reconciliation mismatch.

Risk actions:

ALLOW
REVIEW
HOLD
RESTRICT
BLOCK.

Nu aplica ban automat fără policy.

======================================================================
30. PAYMENT → SUPPLIER HANDSHAKE
======================================================================

PAYMENT SUCCESS
≠
SUPPLIER ORDER SUCCESS.

Flow:

customer order validation
→ reservation
→ payment evidence
→ supplier stock recheck
→ supplier price check if required
→ supplier submission
→ acknowledgement
→ external supplier order ID
→ reconciliation.

Mandatory:

- idempotency;
- duplicate prevention;
- timeout handling;
- lost response recovery;
- acknowledgement recovery.

======================================================================
31. EXCEPTION ENGINE
======================================================================

Trebuie acoperite:

- supplier timeout;
- accepted but response lost;
- duplicate submit;
- duplicate acknowledgement;
- stock disappeared;
- price changed;
- API unavailable;
- partial fulfilment;
- partial shipment;
- delayed dispatch;
- no tracking;
- lost shipment;
- supplier cancellation;
- buyer cancellation;
- return;
- refund;
- partial refund;
- chargeback;
- reimbursement failure;
- supplier suspended mid-order.

Fiecare exception:

state
owner
next action
audit
customer impact
financial impact
resolution.

======================================================================
32. TRACKING NORMALISATION
======================================================================

Supplier/carrier statuses sunt mapate la Loadify.

SUPPLIER
→ CARRIER EVENT
→ LOADIFY SHIPMENT
→ BUYER EXPERIENCE.

Canonical statuses pot include:

pending
accepted
dispatched
in_transit
exception
out_for_delivery
delivered
failed_delivery
returned.

Buyer rămâne în Loadify.

======================================================================
33. RETURNS / REFUNDS / SUPPLIER RECOVERY
======================================================================

Separă:

CUSTOMER REFUND

de:

SUPPLIER RECOVERY.

Loadify refunded customer
≠
Loadify recovered money from supplier.

Track separat:

- buyer refund;
- Stripe refund;
- return;
- returned inventory;
- supplier return;
- supplier reimbursement;
- shipping recovery;
- unrecovered loss;
- final contribution.

======================================================================
34. FINANCIAL RECONCILIATION
======================================================================

Order `completed`
≠
financially reconciled.

Compare:

CUSTOMER PAYMENT
↔ LEDGER
↔ PROCESSOR
↔ SUPPLIER PAYABLE
↔ SUPPLIER PAYMENT
↔ REFUNDS
↔ RECOVERIES
↔ CHARGEBACKS.

States:

RECONCILED
PARTIALLY RECONCILED
EXCEPTION
UNRECOVERED.

Admin trebuie să vadă exceptions.

======================================================================
35. SUPPLIER CONTROL CENTRE
======================================================================

Admin/Super Admin se extind vertical împreună cu fiecare capability.

Trebuie să poată arăta factual:

- supplier registry;
- qualification;
- compliance;
- supplier health;
- SLA;
- catalog sync;
- stock failures;
- price failures;
- margin alerts;
- order submission failures;
- acknowledgement failures;
- tracking exceptions;
- refunds;
- returns;
- recovery;
- risk alerts;
- financial reconciliation;
- incidents;
- performance.

Mandatory:

SUPPLIER KILL SWITCH.

Kill switch:

NU șterge istoricul.

Oprește operațiunile noi conform contractului.

======================================================================
36. SUPPLIER SECURITY / COMMERCIAL PRIVACY
======================================================================

Supplier credentials:

SERVER SIDE ONLY.

Nu ajung în:
