# SUPPLIER CONTROL CENTRE GOVERNANCE CONTRACT

Status: PREPARATION ONLY. This document defines future governance responsibilities; it does not authorise UI/runtime implementation before the canonical gates.

## Purpose

Define the operational/admin control surface required to govern Supplier Commerce without creating a second business engine or bypassing canonical server-side rules.

## Core rule

CONTROL CENTRE = OBSERVE + REVIEW + AUTHORISE + INTERVENE THROUGH CANONICAL SERVER BOUNDARIES.

It is not:
- a parallel database;
- an admin bypass;
- a provider-specific console embedded into Loadify;
- a place where business rules live only in UI.

## Required governance domains

### Supplier registry
Operators/admins need visibility into:
- supplier identity;
- qualification state;
- capabilities;
- territories;
- integration status;
- SLA;
- compliance/provenance state;
- risk state;
- active/paused/suspended/killed state according to canonical lifecycle.

### Offer/catalog health
Visibility into:
- canonical product linkage;
- supplier offers;
- unmatched/duplicate candidates;
- stock freshness;
- price freshness;
- margin floor failures;
- rights/compliance blocks;
- sync failures;
- last successful evidence timestamp.

### Operator import/review
Governed queue for:
- external URL/catalog/source intake;
- extracted facts;
- canonical match confidence;
- supplier/source evidence;
- AI-generated merchandising preview;
- rights/compliance checks;
- landed-cost/margin check;
- approve/reject/request-more-evidence.

No direct URL-to-publish bypass.

### Order/fulfilment control
Visibility into:
- customer order;
- selected supplier offer snapshot;
- fulfilment leg(s);
- submission state;
- acknowledgement;
- unknown outcomes;
- retries/reconciliation;
- dispatch/tracking;
- exceptions;
- buyer impact.

### Returns/refunds/recovery
Must show separately:
- buyer return request;
- customer refund state;
- supplier return/recovery state;
- supplier reimbursement;
- unrecovered loss;
- reconciliation completion.

CUSTOMER REFUND ≠ SUPPLIER RECOVERY.

### Financial/reconciliation view
Explain, not reconstruct independently:
- customer payment;
- tax/VAT snapshot;
- Loadify revenue/margin;
- supplier payable/cost;
- shipping economics;
- refund;
- recovery;
- chargeback;
- unrecovered loss;
- reconciliation status.

The control centre must read canonical financial truth.

### Incidents and exceptions
Every operational exception should expose:
- severity;
- affected supplier/order/product/offer;
- detectedAt;
- owner;
- next action;
- customer impact;
- financial impact;
- retry/recovery status;
- resolution evidence.

## Kill switch

A supplier kill switch must be server-enforced and preserve history.

Possible effects according to policy:
- stop new publication;
- stop new checkout/sellability;
- stop new supplier order submissions;
- pause sync;
- route active exceptions to review.

It must NOT erase historical products/orders/finance/evidence.

## Role/permission model

Final permissions depend on the frozen auth foundation and Gate B.

Preparation requirements:
- least privilege;
- no stale-JWT privilege assumptions;
- sensitive operations server-side;
- no generic admin write access to arbitrary canonical tables;
- protected high-risk actions;
- audit actor/reason/result;
- self-protection rules where relevant.

## High-risk admin actions

Actions such as:
- suspend/kill supplier;
- publish high-risk product;
- override sellability block;
- force supplier order recovery;
- issue refund;
- mark recovery reconciled;
- alter compliance state
must have explicit server-side authorization and audit evidence.

Where override is permitted, require a reason and preserve the original blocked condition.

## Data freshness

Control Centre must distinguish:
- fresh;
- stale;
- unknown;
- failed;
- manually reviewed.

Never display stale provider data as current without warning.

## Provider health

Operational status may include:
- adapter configuration health;
- credential validity;
- rate-limit pressure;
- API latency/errors;
- webhook health;
- sync lag;
- unknown-order outcomes;
- tracking lag;
- return/recovery backlog.

Provider health is observability, not provider-specific lifecycle leakage into core.

## Supplier performance

Performance views should be evidence-based and explainable, potentially including:
- stock accuracy/freshness;
- price stability;
- order acceptance;
- acknowledgement time;
- dispatch timeliness;
- delivery success;
- tracking completeness;
- cancellation/failure rate;
- return rate;
- recovery rate;
- support/incident history.

No opaque score should automatically ban a supplier without policy/governance.

## Audit

Every state-changing Control Centre action must eventually record:
- actor;
- role;
- target;
- previous canonical state/reference;
- requested action;
- reason;
- result;
- timestamp;
- correlation ID;
- evidence/incident link where relevant.

## UI rule

Visual design may evolve later, but functional truth must remain server-authoritative. A disabled button is not a security boundary.

Existing Admin/Super Admin should be extended vertically; do not invent a disconnected admin product unless a later architecture decision explicitly requires it.

## PASS criteria

Control Centre implementation is PASS only when:
- it consumes canonical state rather than maintaining parallel truth;
- high-risk actions use server boundaries;
- permissions are least-privilege and live-account aware;
- all interventions are audited;
- kill switch is fail-safe and history-preserving;
- stale/unknown data is explicit;
- buyer refund and supplier recovery are separate;
- financial/reconciliation views explain canonical truth;
- provider health/incidents are operationally actionable.
