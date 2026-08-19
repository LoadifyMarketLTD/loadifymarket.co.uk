# SUPPLIER QUALIFICATION, SLA AND RISK CONTRACT

Status: PREPARATION ONLY. Defines canonical responsibilities, evidence and governance expectations; it does not define provider-specific onboarding or final schema names.

## 1. Core principle

A supplier is not commerce-ready merely because an API, feed, catalogue or account exists.

SUPPLIER DISCOVERED
→ IDENTITY VERIFIED
→ CAPABILITIES KNOWN
→ COMMERCIAL/COMPLIANCE EVIDENCE REVIEWED
→ SLA/RISK PROFILE ESTABLISHED
→ APPROVED FOR SPECIFIC SCOPE
→ CONTINUOUS PERFORMANCE GOVERNANCE.

Qualification is scoped and revocable.

## 2. Supplier identity

The platform should be able to establish and preserve sufficient evidence for:

- legal/business identity;
- trading identity;
- primary contacts;
- operating territories;
- integration/provider references;
- relationship/contract status;
- tax/commercial identifiers where required;
- fulfilment locations/capabilities where relevant;
- escalation contacts.

Do not infer supplier identity from a marketplace seller page alone.

## 3. Capability profile

Supplier capabilities may include:

- catalogue/API/feed access;
- stock lookup;
- price lookup;
- reservation;
- order submission;
- acknowledgement;
- cancellation;
- tracking;
- fulfilment events;
- return authorization;
- reimbursement/recovery;
- document/compliance support;
- webhooks/events;
- idempotency support;
- sandbox/test environment.

Capability must be factual, not assumed from provider brand.

## 4. Scope of approval

Supplier approval may be limited by:

- territory;
- category;
- product/brand;
- value/risk band;
- fulfilment method;
- integration method;
- pilot cohort;
- compliance evidence;
- performance state.

Therefore `supplier active` must not automatically mean every offer is sellable everywhere.

## 5. SLA dimensions

Possible SLA dimensions include:

- stock freshness;
- price freshness;
- order acknowledgement time;
- dispatch time;
- delivery performance;
- tracking-event timeliness;
- cancellation response;
- return authorization response;
- reimbursement/recovery time;
- support/escalation response;
- incident reporting.

Final targets must be contract/provider-specific and may vary by category/territory.

## 6. Evidence and measurement

Performance should be based on observable events where possible, not only supplier self-report.

Examples:

- submission timestamp;
- acknowledgement timestamp;
- dispatch timestamp;
- carrier/tracking events;
- delivery timestamp;
- return/reimbursement timestamps;
- exception/error rates;
- stale stock/price incidents;
- duplicate/rejected order events.

## 7. Risk profile

Supplier risk may consider:

- identity/compliance confidence;
- financial/commercial exposure;
- stock accuracy;
- price stability;
- order rejection rate;
- dispatch reliability;
- delivery success;
- return/refund rate;
- recovery success;
- dispute/chargeback exposure;
- incident history;
- integration reliability;
- data quality;
- customer impact.

Risk model must be explainable and evidence-based.

## 8. Risk outcomes

Potential policy actions:

ALLOW
LIMIT
REVIEW
HOLD
PAUSE
SUSPEND
BLOCK

Final state names are not mandated.

The model must not create opaque automatic permanent bans without traceable evidence/policy.

## 9. Qualification renewal

Supplier qualification is not necessarily permanent.

The system should support review on:

- evidence expiry;
- contract expiry/change;
- new territory/category;
- material performance degradation;
- compliance incident;
- provider/API capability change;
- prolonged inactivity;
- manual/admin review.

## 10. Offer-level risk

Supplier-level qualification and offer-level eligibility are separate.

A good supplier may have one risky/stale/non-compliant offer.

An offer can be blocked without deleting or globally suspending the supplier unless policy requires it.

## 11. Incident escalation

Material supplier incidents should be linked to:

- affected offers/products;
- affected orders;
- customer impact;
- financial exposure;
- required kill-switch scope;
- supplier escalation;
- recovery actions;
- root cause;
- closure evidence.

## 12. Supplier suspension

Suspension must define deterministic handling for:

- new sellability;
- new supplier submissions;
- pending acknowledgements;
- already accepted supplier orders;
- dispatched shipments;
- returns/refunds/recovery;
- data sync;
- existing customer communication.

Suspension must not erase historical evidence.

## 13. Performance score

A future supplier performance score should be:

- explainable;
- derived from named metrics;
- time-windowed/versioned;
- robust to low sample sizes;
- separable from compliance hard gates;
- visible to authorized operators with underlying evidence.

A score is not a substitute for hard compliance or contract gates.

## 14. Controlled scale

Supplier volume exposure should increase only after evidence supports it.

Potential controls:

- order count/value caps;
- category caps;
- product count;
- geographic scope;
- manual review thresholds;
- enhanced monitoring.

## 15. Provider dependency risk

Supplier operation may depend on an external marketplace/API/provider.

The platform must distinguish supplier risk from provider risk.

Provider outage should not automatically label the supplier fraudulent/unqualified.

## 16. Data minimisation/security

Supplier credentials/secrets must remain server-side and least-privileged.

Do not expose:

- API secrets;
- private supplier pricing;
- contract metadata;
- restricted compliance documents;

to buyer/client surfaces unless explicitly required and authorized.

## 17. E2E acceptance

Future E2E must prove:

1. unqualified supplier cannot become sellable through an imported offer;
2. supplier approval does not bypass offer-level compliance/freshness;
3. SLA breach produces observable state/action;
4. suspension stops new submissions while preserving existing order recovery;
5. provider outage is classified separately from supplier misconduct;
6. low-sample performance does not create misleading confidence;
7. expired qualification evidence triggers deterministic review/hold;
8. risk/score decision is explainable to operator;
9. supplier credentials never reach client runtime;
10. controlled scale limits exposure during early supplier rollout.

## 18. Gate rule

Final commercial SLA targets, contractual consequences, liability allocation and supplier approval authority depend on Gate B and actual supplier agreements.

This preparation contract only fixes the architecture principle:

SUPPLIER COMMERCE REQUIRES CONTINUOUS, EVIDENCE-BASED QUALIFICATION AND GOVERNANCE — NOT A ONE-TIME `APPROVED` FLAG.