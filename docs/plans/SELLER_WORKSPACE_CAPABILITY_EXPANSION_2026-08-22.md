# Seller Workspace Capability Expansion — Reserved Scope

**Date:** 2026-08-22  
**Status:** RESERVED / DEFERRED IMPLEMENTATION  
**Relationship to current execution:** This document does **not** replace or reorder the canonical Identity → Onboarding → Workspace execution plan. It reserves the agreed Seller Workspace scope so it is not lost while Stage 3 Seller Onboarding V2 is completed. Implementation belongs in the later Seller Workspace alignment stages.

## 1. Purpose

Preserve the agreed future Seller Workspace capability set identified while benchmarking the functional navigation of Avasam against the current Loadify Market Seller Hub.

Avasam is used only as a functional benchmark. Loadify must not copy its information architecture blindly and must preserve Loadify's own account, commerce, security and Supplier Commerce contracts.

## 2. Permanent product boundaries

1. **Marketplace Seller is not a Supplier Partner / Fulfilment Provider.**
2. **Supplier Partners, Avasam integration and Loadify Direct Supplier Commerce are private platform relationships and must not be exposed as a normal Seller Hub navigation area.**
3. **Loadify Direct is a commercial mode, not a public account type.**
4. Seller Workspace changes must not redesign or weaken Admin / Super Admin boundaries.
5. Supplier Commerce controls remain fail-closed until separately authorized real-pilot activation.
6. Existing Seller onboarding, identity, Stripe readiness, product publishing and account-capability contracts remain authoritative.
7. This scope is additive and must be implemented only after the current Stage 3 onboarding contract is closed.

## 3. Current Loadify coverage

The existing Seller Hub already contains the functional foundations for:

- Dashboard
- Products
- Orders
- Shipments
- Returns
- Messages
- Reviews
- Notifications
- Seller Profile
- Seller Settings
- Marketplace return/navigation
- Sign out
- Stripe Connect settings
- Seller balance / payout surface
- Existing invoice generation backend capability
- Marketplace search/catalogue outside Seller Hub

These foundations should be evolved rather than duplicated.

## 4. Reserved target information architecture

### Dashboard

Keep the existing Seller Dashboard as the Seller Hub home.

Target capabilities include:

- revenue overview
- active orders
- listings/products status
- low-stock warnings
- customers
- shipments
- messages/activity
- seller rating
- balance / payout summary
- actionable alerts

### Marketplace

Provide a clear route back to the public marketplace / catalogue and search.

Do **not** add a separate Seller-only product search if the global marketplace search already satisfies the use case.

### Listings

Evolve the current Products area into a professional Listings Manager rather than creating redundant "My Products" and "Listing Manager" modules.

Reserved capabilities:

- All listings
- Drafts
- Pending approval / review
- Active
- Paused
- Out of stock
- Rejected / needs attention
- Archived
- Create listing
- Edit listing
- Duplicate listing
- Inventory view
- Listing health / validation issues
- Bulk selection and bulk actions
- Bulk price update
- Bulk stock update
- CSV import
- CSV export
- future feed/API import capability where justified

Publishing must remain server-governed and must not be weakened for onboarding convenience.

### Orders

Retain the current Orders foundation and align related operational areas:

- All orders
- Order details
- Fulfilment status
- Shipments / tracking
- Returns
- Refund / dispute visibility where seller-facing
- retained commercial history

### Finance

Create a coherent Seller Finance area. Existing balance, payout and invoice capabilities are currently distributed and should be consolidated.

Reserved capabilities:

- Finance Overview
- Transactions
- Payouts
- Payout history
- Invoices
- Invoice download / PDF
- CSV export where appropriate
- Platform fees
- Adjustments
- Refund financial effects
- Stripe account status / dashboard access
- reconciliation-friendly references between orders, invoices and payouts

This is a high-priority future Seller Workspace capability.

### Analytics

Extend the existing Seller Dashboard metrics into a dedicated analytics area.

Reserved capabilities:

- Analytics Overview
- Sales
- Products / listings
- Customers
- Traffic
- Conversion
- Returns / refunds
- Seller performance
- Revenue / payout analytics
- Date filters
- Custom reports
- CSV / PDF export where useful

Future Loadify Intelligence may add:

- conversion anomaly detection
- product opportunity scoring
- demand forecasting
- low-stock prediction
- price competitiveness
- seller health scoring
- fraud / anomaly indicators

These later intelligence functions are not part of the initial Workspace alignment unless separately scoped.

### Communication

Keep and organize:

- Messages
- Reviews
- Notifications

Avoid creating duplicate notification concepts between Dashboard, Analytics and Settings.

### Store / Profile

Keep legal/business seller identity separate from public store identity.

Reserved navigation:

- Store Profile
- Seller / Business Profile

Do not collapse legal seller identity into store branding.

### Help & Support

Create a proper Seller Support area instead of relying only on public FAQ/contact surfaces.

Reserved capabilities:

- Help Centre
- Seller guides
- Contact support
- Raise support ticket
- My support tickets
- Report technical problem
- Send feedback

Suggested support ticket lifecycle:

`open → assigned → waiting_customer → investigating → resolved → closed`

Suggested ticket evidence:

- priority
- category
- message thread
- screenshots/files
- optional order reference
- optional listing/product reference
- created/updated/resolved timestamps
- admin/operator handling history

### Settings

Reorganize the existing Settings functionality without unnecessary duplication.

Reserved sections:

- Account
- Business details
- Store
- Payments & payouts
- Shipping
- Notifications
- Security
- Privacy / data
- Account status

Existing password/security, shipping defaults, Stripe Connect, notifications, pause/resume and account deactivation functionality should be reused and hardened rather than rebuilt.

## 5. Explicitly not required now

### Supplier directory / "Our suppliers"

Do not expose Loadify Supplier Partners or Avasam providers to ordinary Marketplace Sellers merely because the benchmark platform has an "Our suppliers" menu.

Supplier Commerce remains a private Loadify-controlled relationship.

### Subscription

Do not add a Subscription menu solely to mirror Avasam.

Only introduce Seller Plans / Subscription if Loadify later adopts an explicit commercial plan model such as Free / Professional / Business, with an approved pricing, entitlements, billing and migration contract.

## 6. Preferred final Seller Hub navigation

```text
Dashboard

Marketplace
  Search Marketplace

Listings
  All Listings
  Drafts
  Inventory
  Create Listing
  Bulk Import / Export

Orders
  All Orders
  Shipments
  Returns

Finance
  Overview
  Transactions
  Payouts
  Invoices
  Fees & Adjustments

Analytics
  Overview
  Sales
  Products
  Customers
  Custom Reports

Communication
  Messages
  Reviews
  Notifications

Store
  Store Profile
  Seller Profile

Help & Support
  Help Centre
  Raise Ticket
  My Tickets
  Send Feedback

Settings
  Account
  Payments
  Shipping
  Notifications
  Security
  Privacy / Account status

Marketplace
Sign Out
```

The exact presentation may be adjusted during implementation for desktop/mobile usability, but the capability boundaries above should remain intact.

## 7. Implementation order when resumed

This PR intentionally does not implement the modules now.

When the canonical execution reaches Seller Workspace alignment, implement in approximately this order:

1. normalize Seller Hub navigation and route inventory;
2. evolve Products into Listings Manager;
3. consolidate Finance / Invoices / Payouts;
4. add Seller Analytics and reports;
5. add Seller Help & Support / ticketing;
6. reorganize Settings without losing current functionality;
7. desktop/mobile parity;
8. security, route-guard and RLS validation;
9. web + Android validation;
10. documentation and release-gate evidence.

## 8. Acceptance principles

A later implementation PR must prove at minimum:

- no Supplier Partner exposure to ordinary Sellers;
- no Admin/Super Admin privilege leakage;
- no Seller Workspace access before required onboarding/activation gates;
- no client-side ownership of trusted finance or lifecycle state;
- invoice/payout/order references remain traceable;
- listing publication remains server-authorized;
- support ticket access is tenant/user scoped;
- analytics queries do not leak cross-seller data;
- desktop/mobile navigation parity;
- existing Seller functions are preserved or intentionally migrated;
- Supplier Commerce remains fail-closed unless separately authorized.

## 9. Current disposition

**Reserved now; implementation deferred.**

Do not let this PR interrupt Stage 3 Seller Onboarding V2. It exists so the agreed Seller Workspace expansion is preserved in GitHub and can be resumed deliberately during the Workspace alignment stages.