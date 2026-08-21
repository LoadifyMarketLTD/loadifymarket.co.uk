# LOADIFY SUPPLIER COMMERCE — GATE B BUSINESS CONTRACT

**Date:** 20 August 2026  
**Status:** CANONICAL GATE B CONTRACT  
**Scope:** business/legal/commercial responsibility contract only. No schema, migration, provider activation or runtime implementation is authorised by this file itself.

This file resolves Gate B for the current Loadify direction and must be read with the canonical contract, the Foundation Baseline Freeze and the execution progress ledger. Where a future law, regulator rule, payment-network rule or provider term changes, the volatile rule must be reverified and versioned without rewriting historical transaction truth.

## 1. Canonical operating modes

Loadify has three distinct commercial modes. The mode is an immutable order-time fact.

### 1.1 Marketplace Seller

A third-party marketplace seller offers goods to the buyer through Loadify.

Canonical responsibilities:

- **legal seller to buyer:** the marketplace seller;
- **merchant of record:** the marketplace seller;
- **customer payment recipient/settlement merchant:** the marketplace seller, with Loadify facilitating collection under a payment configuration that preserves the seller as MoR;
- **customer invoice/receipt issuer:** the marketplace seller for seller supplies; Loadify may issue a platform receipt/confirmation but must not present its own VAT number as though Loadify made the seller's supply;
- **Loadify revenue:** commission/platform fee;
- **seller payable:** gross seller entitlement less platform fees, processor allocations, authorised adjustments/refunds/recoveries;
- **physical stock owner:** seller or seller-appointed fulfilment party;
- **fulfilment responsibility:** seller, even if a carrier/fulfilment provider performs logistics;
- **customer-facing support:** Loadify may provide first-line platform support, but the seller remains the contractual seller for goods, statutory remedies and seller obligations;
- **refund/return liability:** seller-facing commercial liability, administered through the canonical Loadify return/refund workflow;
- **chargeback/payment dispute:** allocated according to the seller-MoR payment configuration and contract, while Loadify may operate the dispute workflow;
- **product safety/compliance:** seller must supply compliant goods and evidence; Loadify retains platform-level governance, suspension, traceability and recall cooperation duties;
- **supplier failure risk:** seller's commercial responsibility unless Loadify contractually assumes a specific remedy;
- **buyer disclosure:** seller legal identity must be clear before purchase and retained in the order snapshot. Fulfilment/dispatch/return information must be shown where material.

**Payment configuration rule:** a marketplace payment implementation must not silently make Loadify the MoR while UI/terms describe the third-party seller as the contractual seller. Stripe Connect documentation states that direct charges make the connected account the MoR; indirect charges with `on_behalf_of` can also make the connected account the MoR, while indirect charges without `on_behalf_of` make the platform the MoR. Phase C/G must reconcile the current runtime to this contract before the mode is production-ready.

## 1.2 Loadify Supplier-Fulfilled

Loadify sources and sells the customer-facing offer. An approved supplier/fulfilment provider holds or sources stock and dispatches directly to the customer. Loadify does not need to own or operate a warehouse.

Canonical responsibilities:

- **legal seller to buyer:** XDrive Logistics Ltd trading as Loadify Market;
- **merchant of record:** Loadify;
- **customer payment recipient:** Loadify;
- **customer invoice/receipt issuer:** Loadify;
- **Loadify revenue:** retail margin, not marketplace commission;
- **supplier payable:** contractual procurement/fulfilment amount owed by Loadify to the supplier, separate from customer revenue;
- **physical stock owner before sale:** normally supplier unless a specific procurement contract transfers title earlier;
- **fulfilment provider:** approved supplier or separate approved fulfilment provider;
- **customer relationship/support:** Loadify;
- **customer refund/return responsibility:** Loadify to the buyer; supplier reimbursement/recovery is a separate commercial event and never a condition for the buyer remedy when Loadify owes that remedy;
- **chargeback responsibility:** Loadify;
- **supplier failure/non-acknowledgement/stock mismatch:** Loadify bears the buyer-facing consequence and must use canonical fallback, cancellation, refund or remedy handling;
- **product safety/compliance:** Loadify must not publish or continue selling without required evidence. Supplier/manufacturer/importer obligations remain attributable to the factual economic operator, but Loadify owns the platform decision to list, suspend, withdraw, recall and notify affected buyers;
- **buyer disclosure:** buyer must clearly see Loadify as seller. Dispatch origin, fulfiller and return destination are disclosed where legally/materially required, but the supplier is not presented as the contractual seller merely because it ships the parcel.

Absolute rule:

**CUSTOMER PAYMENT SUCCESS ≠ SUPPLIER ORDER SUCCESS.**

Supplier ordering, acknowledgement, fulfilment and supplier recovery are downstream obligations and events; they cannot rewrite the customer payment/order truth.

## 1.3 Loadify Direct

`Loadify Direct` is reserved for a Loadify-sale mode in which Loadify owns or has already acquired the inventory/title before the customer commitment, whether stock is physically held by Loadify, a 3PL, supplier warehouse or another approved custodian.

Canonical responsibilities are the same buyer-facing legal/MoR/refund/chargeback/invoice responsibilities as Loadify Supplier-Fulfilled. The distinguishing fact is **inventory/title ownership and procurement timing**, not warehouse location.

Loadify Direct is optional and not required for the first Supplier Commerce release. No separate customer-order/payment system may be created for it.

## 2. One customer/order/payment truth

All modes use one canonical customer order and financial truth.

Required immutable order-time facts include:

- commercial mode;
- legal seller identity;
- MoR identity;
- invoice issuer;
- payment recipient/settlement merchant;
- canonical product and exact variant;
- selected supplier offer/fulfilment route where applicable;
- committed buyer price and components;
- tax decision/rule version/evidence;
- shipping promise and customer shipping charge;
- seller/supplier/fulfiller evidence needed for historical truth;
- return/support responsibility;
- relevant dispatch-origin/customs promise.

Historical facts are never reconstructed from current mutable product, seller, supplier or provider state.

## 3. Supplier role and offer contract

A supplier is not automatically the customer-facing seller.

Each supplier offer must retain versioned evidence for:

- supplier identity and role;
- supplier SKU/reference;
- exact canonical product/variant mapping;
- cost and currency;
- supplier shipping cost;
- stock quantity/availability semantics;
- stock freshness/source timestamp;
- ship-from location;
- supported destination territories;
- dispatch SLA;
- return capability/address;
- cancellation capability;
- acknowledgement semantics;
- compliance/provenance evidence;
- media/content rights evidence where used;
- minimum-order constraints;
- offer validity/effective timestamps;
- provider/account health and kill-switch state.

**SUPPLIER RAW STOCK ≠ LOADIFY SELLABLE STOCK.** Sellability additionally requires freshness, route eligibility, compliance, margin/price guard, regional delivery support, exact variant availability and provider health.

## 4. Supplier selection and fallback

Before customer commitment, Loadify may route among eligible supplier offers using landed cost, stock, SLA, geography, compliance, risk, margin and returns capability.

After customer commitment, fallback is permitted only where the replacement still satisfies the factual customer promise, including exact canonical product, exact variant, compliance equivalence, committed buyer price, acceptable delivery tolerance, return/support capability and relevant origin/customs constraints.

No silent substitution of a merely similar product.

If no eligible fallback exists, use canonical exception/cancellation/refund/customer-remedy handling.

## 5. Payment and supplier-order sequence

Canonical sequence for Loadify Supplier-Fulfilled:

`SELLABLE OFFER → CUSTOMER CHECKOUT → TAX/PRICE EVIDENCE → PAYMENT AUTHORISATION/CAPTURE → CANONICAL PAID ORDER → SUPPLIER ORDER ATTEMPT → ACKNOWLEDGEMENT → FULFILMENT → TRACKING → DELIVERY → RETURN/REFUND/RECOVERY → RECONCILIATION`

Rules:

- supplier-order submission must be idempotent;
- lost provider responses require reconciliation before retry;
- stock/price must be rechecked against the accepted tolerance before supplier submission;
- supplier non-acknowledgement/timeout moves to explicit exception state;
- customer remedy is not blocked by supplier reimbursement;
- payment success cannot be rolled back by mutating history; use refunds/reversals/adjustments;
- order completion does not mean financial reconciliation is complete.

## 6. Financial truth

The canonical financial model must represent, as applicable:

- customer merchandise amount;
- mandatory fees;
- customer shipping charge;
- tax/VAT;
- gross customer payment;
- processor fee;
- platform commission for Marketplace Seller mode;
- Loadify retail margin for Loadify-sale modes;
- supplier product cost;
- supplier fulfilment/shipping cost;
- carrier cost;
- customs/duty/import VAT;
- FX;
- seller/supplier payable;
- payout/settlement;
- customer refund;
- supplier recovery;
- chargeback;
- unrecovered loss;
- final contribution.

Corrections are explicit ledger events. Do not rewrite historical commercial snapshots.

## 7. Shipping and fulfilment economics

Keep separate:

- customer shipping charge;
- supplier fulfilment shipping cost;
- carrier cost;
- operational tracking;
- fulfilment leg;
- consignment;
- later recovery/adjustment.

Fulfilment-time data cannot silently change the price already committed to the buyer.

A customer order may have multiple fulfilment legs/consignments. Future schema must evolve the current one-shipment-per-order seam rather than create a parallel order system.

## 8. Returns, refunds and supplier recovery

**CUSTOMER REFUND ≠ SUPPLIER RECOVERY.**

Marketplace Seller mode:

- seller is the contractual seller and bears seller remedy liability;
- Loadify provides the canonical workflow, evidence, payment action and audit path.

Loadify-sale modes:

- Loadify is responsible to the buyer;
- supplier reimbursement/return acceptance is separate and may remain outstanding after the customer has been refunded.

For ordinary UK distance sales, the contract must support the statutory cancellation/return framework where applicable: consumers generally have 14 days after delivery to cancel, then 14 days to return, and refund timing obligations apply. Product/category exceptions must be represented explicitly rather than by a blanket rule.

Safety recall/withdrawal may require a separate mandatory remedy path independent of ordinary change-of-mind rules.

## 9. Price transparency

Buyer-facing prices must comply with the current UK price-transparency contract:

- total unavoidable price must be shown up front when it can be calculated;
- unavoidable fees, taxes and charges cannot be hidden until late checkout;
- shipping must be displayed/calculated transparently at the appropriate point;
- genuinely optional extras require affirmative consent;
- all buyer surfaces consume the same canonical pricing truth.

No drip-pricing architecture.

## 10. VAT, tax and customs responsibility

Tax is evidence-driven and rule-versioned. Price alone never determines VAT treatment.

### 10.1 Marketplace Seller — UK-established seller / UK stock

The seller remains responsible for its normal VAT obligations on its supply, subject to specific online-marketplace statutory deemed-supplier rules where they apply. Loadify must retain evidence needed to determine whether Loadify itself becomes VAT-liable under online-marketplace rules.

### 10.2 Marketplace Seller — overseas seller / overseas or UK stock

The platform must evaluate current HMRC online-marketplace rules. Current HMRC guidance states, among other cases, that:

- for goods outside the UK sold through an online marketplace to GB customers in consignments of £135 or less, the online marketplace is liable for VAT at point of sale;
- the £135 threshold applies to the total consignment intrinsic value, not each item;
- for goods located in the UK at point of sale and sold by an overseas business through an online marketplace, the online marketplace can be liable for VAT;
- B2B treatment requires valid evidence and differs from B2C treatment.

Therefore seller establishment, stock location, destination, consignment composition/value, customer status and VAT evidence are mandatory tax inputs.

### 10.3 Loadify Supplier-Fulfilled / Loadify Direct

Loadify is the customer-facing seller, so customer-sale VAT/customs treatment belongs to Loadify's sale. Supplier procurement/import liability is a separate upstream event.

For goods outside the UK at point of sale and imported in consignments not exceeding £135, current HMRC guidance requires point-of-sale UK VAT in applicable direct-sale cases; consignments above £135 generally move to normal import VAT/customs treatment. The future engine must model importer-of-record and who pays import VAT/duty rather than assuming the customer will pay.

### 10.4 Northern Ireland

Northern Ireland remains a distinct tax/product-safety territory where Windsor Framework/EU-linked rules can differ. GB logic must never be silently reused for NI. Enable NI only after a separately verified rule/capability set is implementation-ready.

## 11. Digital-platform reporting

Loadify operates a digital platform that allows third-party sellers to sell goods. The platform must treat UK digital-platform reporting as an applicable governance requirement unless a documented statutory exclusion applies to the relevant operator/activity.

Required canonical evidence includes seller identity and verification, reportable/excluded classification, transaction/payment totals, fees/commissions/taxes withheld or charged, transaction counts, payout/bank-account evidence where required, reporting period/status, seller copy and correction/audit history.

Current HMRC guidance requires reporting-platform due diligence, seller information verification, reporting by the applicable deadline, seller copies and record retention. Reporting must derive from canonical commerce/financial truth; no parallel reporting ledger.

Loadify-sale Supplier-Fulfilled suppliers are procurement vendors, not automatically `sellers` under the marketplace reporting model merely because they supply Loadify. Classification must follow the factual platform role.

## 12. Reviews and ratings

- verified Loadify-purchase reviews are a distinct provenance class;
- external/licensed reviews may only be shown if rights permit and source/provenance is clearly retained and presented;
- external review counts/stars must never be converted into Loadify review counts/stars;
- incentivised reviews must be handled/disclosed according to current law/guidance;
- fake reviews, commissioning fake reviews, publishing fake reviews without reasonable preventative measures, suppression/manipulation and misleading aggregate presentation are prohibited;
- moderation/removal decisions require audit history.

## 13. Content, images, video and UGC rights

Public availability does not establish commercial reuse rights.

No externally sourced asset is publishable when required rights evidence is missing.

Evidence must support, as applicable:

- source;
- owner/licensor;
- commercial-use permission;
- modification/derivative permission;
- territory/channel scope;
- attribution;
- expiry/revocation;
- evidence timestamp/version.

AI may transform/present only within verified rights and factual boundaries.

## 14. Product safety, economic-operator responsibility and recall

For every product/category, determine the factual manufacturer/importer/distributor/other economic-operator roles under the law applicable to the territory.

GB baseline:

- consumer products must be safe;
- manufacturers/importers/distributors have role-specific duties;
- importers can carry additional compliance obligations;
- distributors must exercise due care, support traceability and cooperate in corrective action/recalls;
- Loadify must not sell/list a product it knows or should know is unsafe.

If Loadify imports products into GB in its own Loadify-sale supply chain, Loadify may become the importer with corresponding obligations. Supplier-Fulfilled does not remove that possibility; importer status follows the factual supply chain.

Required operational governance:

- compliance evidence before publish;
- manufacturer/importer/economic-operator identity where required;
- markings/instructions/warnings evidence;
- risk/incident record;
- buyer/order/variant traceability;
- product/supplier suspension;
- withdrawal/recall workflow;
- regulator cooperation;
- customer notification/remedy;
- emergency kill switch;
- retained evidence.

NI/EU GPSR duties must be handled by a separate territory rule set before NI activation.

## 15. Customer-facing identity and contract disclosure

Before order commitment, Loadify must clearly identify the contractual seller and material transaction facts.

Marketplace Seller mode must show the marketplace seller as seller/trader. Loadify-sale modes must show Loadify/XDrive Logistics Ltd as seller.

Pre-contract and durable confirmation must support, as applicable:

- trader identity/contact/address;
- product description;
- total price/taxes/charges;
- payment method;
- delivery arrangements/cost/time;
- cancellation/return terms;
- complaints/support path;
- material fulfilment/dispatch/return information;
- payment obligation at final checkout action.

UI labels cannot override the actual contract.

## 16. Operator authority and governance

Only server-authorised operator/admin roles may perform sensitive Supplier Commerce actions.

Required auditable capabilities include:

- source/import candidate;
- approve/reject/hold;
- publish/unpublish;
- suspend product;
- suspend supplier/provider/offer;
- initiate withdrawal/recall;
- activate kill switch;
- review/override documented exceptions;
- access supplier cost/margin/compliance evidence according to least privilege.

No direct owner/operator publish bypass around provenance, rights, compliance, landed cost, tax and margin gates.

## 17. Provider capability rule

No provider is implementation-ready because it has a website or API.

Before provider-specific implementation, maintain a versioned capability record with official-source verification for roles, territory, auth, catalog/media rights, stock/price semantics, order/idempotency, cancellation, tracking, returns, rate limits, restrictions, commercial/legal constraints, adapter version, monitoring owner and kill-switch path.

Provider brand names remain adapters/capabilities, never commerce-core types.

## 18. External sales channels

Any future TikTok Shop/Amazon/other channel integration is:

`LOADIFY CANONICAL COMMERCE ↔ SALES CHANNEL CONNECTOR`

The external channel never becomes Loadify's canonical product/order/payment/financial ledger. Channel-specific seller/MoR/tax responsibilities must be verified before activation.

## 19. AI Product Builder

Absolute invariant:

**VERIFIED FACTS → AI PRESENTATION. NEVER AI INVENTION → PRODUCT FACT.**

AI may create merchandising presentation, SEO, FAQ, comparison, marketing copy and creative briefs only from evidence-backed facts. It cannot invent certification, safety, material, origin, warranty, compatibility, performance, environmental, medical, authenticity or delivery claims.

## 20. Gate B implementation consequences

The following are now fixed inputs for Phase C onward:

1. commercial mode is explicit and immutable per order;
2. Marketplace Seller = third-party seller is legal seller and MoR;
3. Loadify Supplier-Fulfilled = Loadify is legal seller and MoR; supplier is procurement/fulfilment party;
4. Loadify Direct = Loadify sale with Loadify inventory/title ownership; optional mode;
5. one canonical order/payment/financial truth across all modes;
6. customer refund and supplier recovery are separate events;
7. payment success and supplier-order success are separate events;
8. canonical product and supplier offer are separate truths;
9. raw supplier stock is not sellable stock;
10. tax is consignment/territory/evidence/rule-version aware;
11. platform reporting derives from canonical financial truth;
12. review/media rights provenance is mandatory;
13. product safety includes incident/recall governance;
14. provider capability must be officially verified and versioned;
15. no unrelated visual redesign is authorised by Supplier Commerce.

## 21. Current authoritative sources verified for this Gate B contract

Verified 20 August 2026. These sources establish volatile legal/payment constraints that must be rechecked when implementation reaches the relevant slice:

- HMRC — VAT and overseas goods sold using online marketplaces: https://www.gov.uk/guidance/vat-and-overseas-goods-sold-to-customers-in-the-uk-using-online-marketplaces
- HMRC — Charging VAT when goods are sold if you're an online marketplace operator: https://www.gov.uk/guidance/charging-vat-when-goods-are-sold-if-youre-an-online-marketplace-operator
- HMRC — Charging VAT on goods sold direct to customers in the UK: https://www.gov.uk/guidance/charging-vat-on-goods-sold-direct-to-customers-in-the-uk
- HMRC — Check where an online marketplace seller is established: https://www.gov.uk/guidance/check-where-an-online-marketplace-seller-is-established
- HMRC — Check/register/report as a digital platform operator and collect/verify seller information: https://www.gov.uk/government/collections/reporting-sellers-to-hmrc-if-youre-a-digital-platform-operator
- CMA — Price transparency (CMA209): https://www.gov.uk/government/publications/price-transparency-cma209
- CMA — Fake reviews (CMA208): https://www.gov.uk/government/publications/fake-reviews
- GOV.UK — Online and distance selling: https://www.gov.uk/online-and-distance-selling-for-businesses
- GOV.UK — Accepting returns and giving refunds: https://www.gov.uk/accepting-returns-and-giving-refunds
- OPSS — Product safety advice for businesses: https://www.gov.uk/guidance/product-safety-advice-for-businesses
- OPSS — General Product Safety Regulations 2005: Great Britain: https://www.gov.uk/government/publications/general-product-safety-regulations-2005/general-product-safety-regulations-2005-great-britain
- GOV.UK — UKCA/CE economic-operator roles: https://www.gov.uk/guidance/placing-ukca-or-ce-marked-products-on-the-market-in-great-britain
- Stripe — Connect merchant of record: https://docs.stripe.com/connect/merchant-of-record?locale=en-GB
- Stripe — Connect charge types: https://docs.stripe.com/connect/charges?locale=en-GB
- Stripe — Tax with Connect: https://docs.stripe.com/tax/connect

## 22. Gate B PASS declaration

Gate B is sufficiently explicit to permit Phase C schema/data-ownership design without inventing core business responsibility during implementation.

**GATE B BUSINESS CONTRACT = PASS (CONTRACT LEVEL).**

This PASS does **not** mean:

- Supplier Commerce is implemented;
- current marketplace Stripe charge configuration already conforms to the target seller-MoR contract;
- all future provider capabilities are verified;
- NI is enabled;
- production migrations are authorised without Phase C design/Branch Guard;
- legal/tax rules never need revalidation.

Next canonical step after merge and progress-ledger update:

**PHASE C — canonical schema/data ownership/governance design and implementation planning, followed by the Phase C implementation gate defined by the original contract.**