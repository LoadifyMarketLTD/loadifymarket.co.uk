# Romania Marketplace Seller tax-contract evidence — 26 September 2026

Status: **TECHNICAL / LEGAL-SOURCE EVIDENCE — NOT LEGAL APPROVAL**

This checkpoint records the authoritative-source facts used to design a fail-closed Romanian Marketplace Seller tax contract. It deliberately does not assert that a particular seller, product or route is tax-ready.

## Authoritative facts used by the contract

### 1. A seller's tax status cannot be inferred from account type alone

European Commission VAT guidance defines a taxable person by independent economic activity. Private individuals are generally non-taxable persons, but exceptions and Member-State choices exist.

Implementation consequence:
- an `individual` marketplace account must not be automatically treated as either VAT-taxable or VAT-exempt;
- the contract uses an explicit reviewed seller-tax classification;
- private sellers remain valid platform participants without forcing company/VAT fields, while RO checkout remains fail-closed until their route-specific tax treatment is reviewed.

Source:
- https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/taxable-persons-under-eu-vat-rules_en

### 2. Electronic interfaces can become deemed suppliers for VAT in defined cases

European Commission OSS guidance states that an electronic interface can be treated as the supplier for VAT purposes in defined marketplace scenarios.

Relevant current-rule examples include:
- goods supplied within the EU to a non-taxable person where the underlying supplier is established outside the EU;
- distance sales of imported goods from a third country/territory in consignments not exceeding EUR 150 via an electronic interface.

Implementation consequence:
- Loadify's commercial statement that the independent seller owns the goods does not, by itself, determine the VAT role;
- the tax contract records `interface_vat_role` separately from commercial ownership;
- Loadify is never labelled deemed supplier by code unless a reviewed tax-rule evidence row explicitly says so.

Sources:
- https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en
- https://europa.eu/youreurope/business/finance-and-tax/vat/one-stop-shop/index_en.htm
- https://eur-lex.europa.eu/eli/dir/2006/112/2022-07-01/eng

### 3. IOSS applies to defined low-value imported-goods scenarios

European Commission guidance describes the Import One Stop Shop for distance sales of imported goods in consignments not exceeding EUR 150, subject to the scheme conditions.

Implementation consequence:
- the contract distinguishes `lte_150_eur` from `gt_150_eur`;
- no code assumes IOSS merely because the buyer is in Romania;
- the route evidence must state the VAT scheme explicitly.

Sources:
- https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en
- https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en
- https://www.anaf.ro/anaf/internet/ANAF/servicii_online/one_stop_shop

### 4. Romania's current VAT rates are not a universal single rate

ANAF material states that from 1 August 2025:
- standard VAT rate: 21%;
- reduced VAT rate: 11% for qualifying supplies.

Implementation consequence:
- the contract permits evidence-backed rate classes of 21%, 11%, or a reviewed outside-scope/no-VAT result;
- no product is automatically assigned 21%;
- product classification must be reviewed independently.

Source:
- https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf

### 5. Customs and VAT must remain separate decisions

European Commission guidance published 16 June 2026 states that from 1 July 2026 the former customs-duty exemption threshold of EUR 150 was abolished and a temporary EUR 3 fixed customs duty per item applies to qualifying distance-sale imports not exceeding EUR 150.

Implementation consequence:
- the EUR 150 value class is retained where relevant to the VAT/IOSS rule, but the system must not interpret it as "no customs duty";
- landed-cost/customs readiness remains a separate route concern.

Source:
- https://vat-one-stop-shop.ec.europa.eu/eur-3-customs-duty-vat-guidelines-2026-06-16_en

### 6. Legal rules are versioned because a 2027 change is already enacted

Council Directive (EU) 2025/516 contains amendments to the VAT Directive with effect from 1 January 2027, including changes to Article 14a.

Implementation consequence:
- every reviewed tax rule has `legal_basis_version`, `legal_effective_from`, and optional `legal_effective_to`;
- a rule reviewed for the 2026 legal framework cannot silently remain authoritative after its effective window;
- launch/review procedures must revisit the rule set before 1 January 2027.

Source:
- https://eur-lex.europa.eu/legal-content/en/TXT/?uri=CELEX:32025L0516

## Contract implemented

Migration:
- `supabase/migrations/20260926103000_romania_marketplace_seller_tax_contract.sql`

Runtime evidence validator:
- `netlify/functions/_shared/marketplaceRoTax.ts`

Regression coverage:
- `src/__tests__/romania-marketplace-seller-tax-contract.test.ts`

The database contract stores route dimensions independently:
- origin scope;
- seller tax status;
- buyer tax status;
- supply class;
- consignment-value class;
- product VAT class;
- interface VAT role;
- VAT scheme;
- VAT rate;
- price tax mode;
- legal basis/effective dates;
- authoritative source references;
- evidence hash;
- review identity/time and validity window.

## Fail-closed properties

The migration:
- creates no verified tax rule;
- seeds no Romanian seller/product tax conclusion;
- exposes only a service-role RPC;
- requires a valid reviewed row before `eligible=true`;
- cannot infer VAT status from an individual/business UI role;
- does not activate RO checkout or payment;
- does not modify the current GB tax resolver.

## Review boundary

This technical implementation is not a substitute for tax/legal review.

Before any rule becomes `verified`, the reviewer must resolve the actual transaction class, including:
- seller taxable-person status;
- origin/dispatch location;
- destination;
- whether the transaction is domestic, intra-EU distance sale or import distance sale;
- whether Loadify is a deemed supplier for VAT for that scenario;
- applicable OSS/IOSS/domestic/import treatment;
- product VAT classification/rate;
- price tax treatment;
- effective legal period.

Until then, Romania Marketplace Seller checkout remains fail-closed.
