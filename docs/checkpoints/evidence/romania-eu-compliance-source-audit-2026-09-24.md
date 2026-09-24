# Loadify Romania / EU compliance source audit — 2026-09-24

## Purpose

Engineering/compliance readiness evidence for the Romania market expansion. This document is not legal advice and does not itself authorise launch. Final market activation remains subject to legal/tax review and verified evidence in the platform gates.

## Authoritative sources reviewed

### Digital Services Act — European Commission
Source: European Commission, “Combatting Illegal products on online platforms”, last updated 2 July 2026.

Engineering implications recorded for the Romania/EU marketplace boundary:
- marketplace seller/trader information must be available to consumers;
- marketplace processes must support illegal-product handling and consumer notification;
- product-safety/compliance checks require an auditable evidence path;
- moderation/complaint handling and anti-dark-pattern requirements remain part of the EU-facing platform audit.

### General Product Safety Regulation — European Commission / Safety Gate
Source: European Commission GPSR Q&A and official GPSR text.

Engineering implications:
- online product offers need manufacturer information;
- where the manufacturer is outside the EU, the relevant EU responsible-person information must also be available where required;
- marketplace listing data must be able to surface the required product-safety identity fields;
- recall/cooperation workflows require traceable product, trader and buyer relationships.

### VAT e-Commerce / OSS — European Commission
Sources: European Commission VAT One Stop Shop guidance, Romania OSS page and VAT e-Commerce guidance.

Engineering implications:
- VAT treatment is destination-sensitive for relevant EU consumer sales;
- OSS/IOSS/deemed-supplier treatment depends on the actual transaction model and must not be guessed in code;
- marketplace VAT record-keeping must be evidence-backed;
- Romania launch must not rely on simply relabelling GBP values as RON;
- tax-rule versions must identify the authoritative rule/evidence used for the transaction.

### Romanian distance-contract consumer rights
Source: Romania Legislative Portal, OUG 34/2014, current consolidated text.

Engineering implications:
- a consumer generally has a 14-day withdrawal period for distance contracts, subject to statutory exceptions;
- refund timing and return-cost disclosures must be represented in policy/workflow evidence;
- the platform must preserve the applicable exception/reason rather than applying a blanket return rule;
- the withdrawal and refund workflow must be testable before Romania launch.

## Technical launch evidence required for RO

The Romania compliance gate requires verified evidence for these domains:

1. trader_traceability
2. product_safety_listing
3. responsible_person_identity
4. consumer_distance_contract
5. withdrawal_returns
6. vat_ecommerce
7. legal_disclosures
8. product_category_restrictions
9. complaints_moderation
10. recall_cooperation

Each evidence record must:
- identify market RO;
- identify the evidence domain;
- reference an authoritative source or reviewed legal/tax memo;
- include a content/evidence hash;
- carry reviewer identity and review timestamp;
- have an explicit status and validity period.

## Fail-closed rule

Romania remains PRELAUNCH unless all required evidence domains are current and verified.

No individual evidence record:
- activates Romanian checkout;
- activates a supplier;
- changes VAT treatment;
- creates a legal conclusion;
- overrides product, shipping, payment or tax readiness gates.

## Sources checked

- European Commission — Combatting Illegal products on online platforms.
- European Commission — General Product Safety Regulation Q&A / official GPSR text.
- European Commission — VAT e-Commerce / One Stop Shop guidance and Romania OSS page.
- Romania Legislative Portal — OUG 34/2014 on distance/off-premises contracts.
- Your Europe — consumer online-shopping/withdrawal guidance.

## Next engineering boundary

Create a private, versioned market-compliance evidence ledger plus a service-role-only readiness decision for GB/RO. Romania must fail closed until all RO evidence domains are verified and current.
