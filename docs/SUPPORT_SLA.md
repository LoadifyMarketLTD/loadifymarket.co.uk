# Loadify Market — Internal Support & SLA Documentation

> **Internal use only.** This document is not exposed in the UI or to end users.  
> Owner: Support team / XDrive Logistics Ltd

---

## 1. Contact Channel

All user-facing support is handled via:

- **Email:** contact@loadifymarket.co.uk
- **Reply-To on all transactional emails:** contact@loadifymarket.co.uk

---

## 2. Response Time Targets (SLA)

| Priority | Scenario | Target Response |
|----------|----------|-----------------|
| **P1 — Critical** | Payment held in escrow, funds not released, Stripe error blocking a transaction | **4 hours** |
| **P2 — High** | Dispute opened (buyer or seller), order not received, service not delivered | **24 hours** |
| **P3 — Standard** | Account queries, onboarding help, product listing questions | **48 hours** |
| **P4 — Low** | General feedback, feature requests, non-urgent questions | **5 business days** |

Business hours: Monday–Friday, 09:00–17:00 UK time.  
Critical (P1) issues are handled outside business hours when possible.

---

## 3. Priority Cases

### Payments & Escrow (P1)
- Buyer charged but order not created
- Escrow funds not released after service confirmation
- Stripe webhook failure preventing order status update
- Payout not received by seller after escrow release window

### Disputes (P2)
- Buyer opens dispute within 30 days of order
- Seller claims item was delivered but buyer denies receipt
- Service marked complete but buyer refuses to confirm

### Account Access (P2–P3)
- Seller account suspended incorrectly
- Buyer cannot log in / email not verified
- Password reset not received

---

## 4. What Support Does

- Investigates order status via Supabase admin panel
- Mediates buyer–seller disputes and makes resolution decisions
- Manually triggers escrow release for stuck orders (via Supabase or admin function)
- Resends verification emails via `/admin` panel
- Suspends or reactivates seller accounts via `admin-sellers` function
- Provides VAT invoice copies on request

---

## 5. What Support Does NOT Do

- Does NOT modify Stripe charges or issue refunds directly in Stripe (refunds go through the platform's `create-refund` function only)
- Does NOT access user passwords (passwords are hashed and not recoverable)
- Does NOT make DNS or SendGrid dashboard changes (infrastructure team only)
- Does NOT modify database records directly without a migration or admin function
- Does NOT provide legal or tax advice

---

## 6. Escalation Path

```
User contacts contact@loadifymarket.co.uk
         │
         ▼
  Support Agent (48h SLA)
         │
  Unable to resolve?
         │
         ▼
  Platform Admin (Supabase / Netlify access)
         │
  Involves Stripe payment dispute / chargeback?
         │
         ▼
  Stripe Dispute Resolution (via Stripe Dashboard)
         │
  Legal or regulatory matter?
         │
         ▼
  Legal counsel / HMRC / ICO as appropriate
```

---

## 7. Dispute Resolution Process

1. Buyer or seller emails contact@loadifymarket.co.uk with order number and description.
2. Support agent reviews the order in the admin panel.
3. Both parties are contacted for their account of events.
4. Support makes a binding resolution decision within the SLA window.
5. If funds are to be released or refunded, admin triggers the appropriate platform action.
6. Both parties are notified of the outcome by email.

---

## 8. Transactional Email Policy

All emails sent by the platform are **strictly transactional** — triggered by user actions such as registration, order placement, dispute creation, or service completion.

- These emails MUST NOT be repurposed for marketing, promotions, or newsletters.
- No unsubscribe or opt-out flow exists because none is needed for transactional email under PECR/GDPR.
- If a marketing capability is added in the future, it must use a separate sending domain, separate SendGrid sub-user, and a compliant opt-in list.

---

## 9. SMS Policy

SMS is currently **not active**. The codebase contains SMS template stubs (`_shared/smsTemplates.ts`, `_shared/sms.ts`) that log messages without sending them. No SMS provider credentials are configured and no costs are incurred.

To activate SMS:
1. Choose a provider (e.g. Twilio).
2. Add credentials to Netlify environment variables.
3. Implement the `sendSms` function in `_shared/sms.ts`.
4. Review PECR compliance for any non-purely-transactional message type before enabling.

---

*Last updated: 2026-04-25*  
*Maintained by: XDrive Logistics Ltd support team*
