# Leaf Design UK — Supplier Playbook

Last reviewed: 2026-09-30
Gmail thread: `1a0ca7d944c80a14`
Key supplier messages: `1a0cac5cada4d25b`, `1a0cad609dac58e1`
Current classification: **CONDITIONAL / STANDARD DROPSHIP ROUTE AVAILABLE**

## What Leaf Design confirmed

1. Their standard dropship route permits dropship members to use Leaf product data on their own websites and suitable online marketplaces.
2. They provide an hourly-updated CSV containing stock, pricing and product information.
3. Products have EANs; catalogue data includes descriptions, specifications, dimensions and imagery.
4. Dropship members may use Leaf product photography, descriptions and specifications for marketing/reselling, provided products are represented accurately and props/accessories are not misrepresented as included.
5. There is no live catalogue/order API or automated marketplace connector at present.
6. Orders must currently be placed through the Leaf dropship site and paid individually.
7. Tracking is supplied after dispatch but is not automatically written back to third-party marketplaces.
8. Damaged/faulty/incorrect goods must be reported promptly; transit damage must be reported within 24 hours. Change-of-mind returns remain the retailer's responsibility under their standard terms.
9. New accounts pay per order; no credit terms at account opening. Commercial terms may be reviewed after meaningful consistent volume/payment history.
10. Current stated membership: GBP 15 + VAT monthly or GBP 49 + VAT yearly; no minimum dropship order quantity or minimum monthly spend.
11. Crucially, under the standard programme the dropship account holder must purchase each customer order from Leaf and act as retailer/reseller to the end customer. Leaf does not remain seller of record to the consumer.

## Why this supplier is newly relevant

The old Loadify supplier model was too rigid for this arrangement. Universal Commercial Compatibility now lets us represent a supplier relationship where Loadify/XDrive is retailer/reseller, purchases each order from Leaf and Leaf fulfils directly to the customer.

This does **not** make the model automatically legally/tax/payment ready. It only means the platform can represent it without a supplier-specific code fork.

## Product opportunity

Leaf can potentially provide a large structured artificial-plants/trees/flowers catalogue via hourly CSV, with product rights and stock/price freshness far stronger than manual-only suppliers.

## Next actions

1. Re-open this supplier only under the exact model Leaf confirmed: Loadify/XDrive purchases each order and acts as retailer/reseller for the customer transaction.
2. Before paying for membership or publishing products, complete legal/tax/accounting/consumer-rights review for Loadify acting as retailer/reseller in this flow.
3. Confirm how buyer payment -> Loadify funds -> Leaf per-order purchase should be represented operationally and in Stripe/payment records.
4. Register/review the free trade range first if useful; do not buy a subscription merely to inspect products if the free trade route provides pricing visibility.
5. If the model is approved internally, open the dropship membership and obtain the hourly CSV feed location/credentials.
6. Map CSV fields into Supplier Commerce: identity, EAN, descriptions, dimensions, images, price and stock.
7. Build manual order-release controls because order submission is through their dropship site, not API.
8. Build/manual tracking ingestion and the 24-hour transit-damage escalation rule.
9. Stage a small subset first and validate true margin including Leaf price, membership allocation, shipping, payment processing, returns reserve and Loadify margin.

## Do not do

- Do not represent Leaf as seller of record under their standard dropship programme.
- Do not assume API/order automation exists.
- Do not purchase the membership until the retailer/reseller legal and economics model is approved.
- Do not ignore the 24-hour transit-damage notification window.