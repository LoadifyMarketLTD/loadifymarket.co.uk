# Loadify Market — Internal Support & SLA Guidance

> **Internal operational guidance.** This document is not a customer-facing guarantee.  
> **Operator:** XDrive Logistics Ltd  
> **Current-truth rule:** runtime code, current platform policy and verified production evidence win if any volatile operational detail below drifts.

---

## 1. Contact channel

Primary user-facing support channel:

- **Email:** `contact@loadifymarket.co.uk`

Transactional email is sent through the current server-side email boundary. At the time of this update, `netlify/functions/send-email.ts` uses **Resend** with the verified `loadifymarket.co.uk` domain. Do not describe SendGrid as the current transactional provider unless the runtime changes again and this document is updated with it.

Password-reset and other Supabase Auth-managed emails may use the Supabase Auth mail configuration rather than the general transactional dispatcher.

---

## 2. Internal response targets

These are operational targets, not automatic customer-facing promises or legal guarantees.

| Priority | Example | Internal target |
|---|---|---|
| **P1 — Critical** | payment/order inconsistency, security incident, platform-wide commerce blocker | triage as soon as operationally possible |
| **P2 — High** | active dispute, delivery/return problem, seller/account issue blocking commerce | priority business-hours review |
| **P3 — Standard** | account, onboarding, product-listing or marketplace-support query | normal support queue |
| **P4 — Low** | general feedback or non-urgent request | lower-priority queue |

Do not publish a fixed response-time guarantee from this internal document unless the business has explicitly adopted and operationally staffed that SLA.

---

## 3. Priority case boundaries

### Payments and financial state

Support may investigate reports such as:

- buyer charged but expected order state is missing or inconsistent;
- checkout/payment state appears inconsistent with the canonical order state;
- seller payout/balance status needs investigation;
- refund/dispute/chargeback state requires escalation.

Support must not invent financial truth or manually change money-related records ad hoc. Use the authorised platform/admin/server boundary and preserve auditability.

### Orders, shipping, returns and disputes

Support may investigate:

- order not received or tracking problem;
- shipment/proof-of-delivery inconsistency;
- return/refund request;
- buyer/seller dispute;
- reported listing, review or user-safety concern.

### Account and seller readiness

Support may investigate:

- sign-in/email-verification problems;
- account suspension/inactive-state questions;
- seller onboarding/readiness problems;
- Stripe Connect setup status where relevant.

---

## 4. What support may do

Subject to the current authorised admin/server controls, support or authorised operations staff may:

- review customer, order, shipment and support context required to resolve a case;
- review marketplace reports/disputes through the applicable governance surface;
- help users complete account or seller setup;
- escalate payment, payout, tax, security or compliance anomalies;
- use authorised platform actions for refunds, dispute handling, seller/account moderation or other supported workflows;
- communicate case outcomes to the affected user.

Actual authority is determined by current permissions and server/database controls, not by this document.

---

## 5. What support must not do

- Do not access or request user passwords.
- Do not perform unaudited direct database mutations as a shortcut around authorised workflows.
- Do not alter Stripe charges, transfers, payouts or refunds outside the authorised platform/Stripe operational boundary.
- Do not bypass RLS, account suspension, seller readiness, tax evidence or other fail-closed controls.
- Do not provide unsupported legal or tax advice.
- Do not promise a refund, payout, delivery outcome or seller activation before the relevant facts and authority are established.
- Do not disclose private account/order information without appropriate identity/ownership checks.

---

## 6. Escalation model

```text
User contacts Loadify
        │
        ▼
Support / authorised operations review
        │
        ├─ account / marketplace issue ─► appropriate admin/governance path
        ├─ payment / payout / chargeback ─► authorised finance/Stripe path
        ├─ security / privacy ─► security/privacy escalation
        ├─ product safety / prohibited item ─► compliance/governance escalation
        └─ legal / regulatory ─► appropriate legal/regulatory handling
```

Escalation ownership and permissions must follow the current platform authority model.

---

## 7. Dispute and case handling principles

1. Identify the account/order/listing/shipment involved using the minimum necessary data.
2. Verify requester identity/ownership before exposing private information.
3. Review canonical order, payment, shipment and communication evidence as relevant.
4. Gather information from affected parties where needed.
5. Use the authorised resolution path; do not patch records manually to force an outcome.
6. Preserve the audit trail for money, moderation and safety decisions.
7. Notify affected users of the outcome and next available action.

Exact return/refund/dispute eligibility comes from current platform policy, transaction facts and applicable law—not from old hard-coded time windows in historical documentation.

---

## 8. Transactional email policy

`netlify/functions/send-email.ts` is the current general transactional email dispatcher and is explicitly **not** a marketing/bulk-email system.

Current principles:

- transactional email is tied to platform/customer actions or operational events;
- public contact-enquiry sending is separately validated and abuse-protected;
- internal transactional templates require the applicable trusted server boundary;
- the verified `loadifymarket.co.uk` sending identity must be used according to runtime configuration;
- do not introduce Gmail or arbitrary fallback senders;
- marketing/newsletter capability, if introduced, must have a separate lawful consent and delivery design rather than reusing transactional templates by assumption.

At the time of this update, the dispatcher uses `RESEND_API_KEY` and the Resend API. Runtime configuration remains the authority for provider-specific details.

---

## 9. SMS policy

Do not assume SMS is active merely because historical templates, stubs or future-plan references exist.

Before enabling SMS, verify all of the following:

- an approved provider and credentials exist;
- the exact transactional/marketing use cases are defined;
- user consent and applicable PECR/privacy requirements are satisfied;
- rate limiting, abuse controls and opt-out requirements are implemented where applicable;
- Data Safety/privacy disclosures are updated if mobile/user data handling changes.

---

## 10. Source-of-truth rule

This file intentionally avoids historical claims such as fixed weekly payouts, manual escrow release, service-completion workflows or fixed dispute-response guarantees that are no longer safe to state as current platform truth.

For a live case, verify in this order:

1. current authorised runtime/admin behavior;
2. current repository/server/database controls;
3. current transaction/order evidence;
4. controlling business/legal policy;
5. this operational guidance.

*Reconciled with current repository state: 2026-09-10.*
