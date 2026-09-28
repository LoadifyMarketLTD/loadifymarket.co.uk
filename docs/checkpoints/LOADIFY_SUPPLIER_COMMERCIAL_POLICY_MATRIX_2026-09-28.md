# Loadify Supplier Commercial Policy Matrix

**Date:** 28 September 2026  
**Status:** IMPLEMENTATION FOUNDATION — FAIL CLOSED  
**Scope:** universal per-supplier commercial configuration. This document does not activate supplier checkout or settlement.

## Objective

Loadify must not be remodelled in code for every new supplier contract. Supplier differences are represented as reviewed, versioned data while the marketplace core remains stable.

The policy matrix supports:

- supplier-fixed retail price;
- supplier RRP;
- supplier minimum/floor price;
- jointly agreed retail price;
- Loadify-managed retail price within supplier constraints;
- trade, wholesale, net-supplier or retail price basis;
- percentage, fixed or zero platform commission;
- independent allocation of processor, Stripe Connect and payout costs;
- Stripe Connect supplier settlement, disclosed platform collection as agent where separately validated, and manual supplier settlement;
- configurable settlement triggers and minimums;
- supplier payable formulas;
- change-of-mind, faulty, wrong-item and fulfilment-damage return postage allocation;
- pre/post-dispatch cancellation cost allocation;
- evidence-attributed, supplier, Loadify or shared chargeback models;
- manual or electronic ordering;
- tracking and returns requirements.

## Non-negotiable marketplace invariants

For Approved Supplier Marketplace commerce:

1. Loadify is the marketplace/platform intermediary.
2. The approved independent supplier is seller of record for its goods.
3. Loadify does not own, warehouse, pre-purchase, finance or take title to supplier inventory.
4. A supplier commercial profile cannot enable checkout or settlement by itself.
5. Market-level commercial readiness, legal/payment evidence and supplier readiness remain separate fail-closed gates.
6. Verified profiles are immutable historical contract evidence; commercial changes create a new version.
7. Zero Loadify commission does not imply that Loadify absorbs processor, Connect, payout, return, cancellation or chargeback costs. Those costs follow the reviewed profile and attributable evidence.
8. Platform errors remain Loadify's responsibility.
9. No supplier-specific code fork is permitted for a commercial term that can be represented by this matrix.
10. A genuinely new commercial model must be reviewed as a reusable capability before it is added to the matrix.

## Activation rule

A supplier can move toward live marketplace commerce only when all relevant gates independently pass:

`approved supplier identity + verified commercial profile + market commercial readiness + payment/settlement evidence + catalogue/compliance/stock/pricing/fulfilment readiness`.

The matrix is deliberately additive and does not change historical orders or turn on production supplier checkout.
