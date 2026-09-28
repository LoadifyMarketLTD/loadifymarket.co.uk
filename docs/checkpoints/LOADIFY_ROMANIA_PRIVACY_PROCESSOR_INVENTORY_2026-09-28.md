# Loadify Market Romania — Privacy Processor / Recipient Inventory
Date: 2026-09-28
Status: PRE-LAUNCH evidence inventory

This inventory records providers that are evidenced by the current repository. It does not invent contractual roles, processing locations, retention periods, transfer mechanisms, or DPA terms that have not yet been verified from the controlling provider account/contract.

| Provider / recipient | Evidenced purpose | Repository evidence | Romania status |
| --- | --- | --- | --- |
| Stripe | Card payments and Stripe Connect seller payment infrastructure | `netlify/functions/create-checkout.ts`, `netlify/functions/stripe-webhook.ts` | ACTIVE IN ARCHITECTURE; provider privacy/DPA/transfer evidence still to reconcile |
| Supabase | Authentication, database, storage and backend services | `src/lib/supabase.ts`, Netlify functions using Supabase | ACTIVE IN ARCHITECTURE; hosting region/DPA/transfer evidence still to reconcile |
| Netlify | Hosting, application delivery and server-side functions | `netlify.toml`, `netlify/functions/*` | ACTIVE IN ARCHITECTURE; DPA/processing-location evidence still to reconcile |
| Resend | Transactional and operational email | `netlify/functions/send-email.ts`, `request-order-withdrawal.ts` | ACTIVE IN ARCHITECTURE; DPA/transfer evidence still to reconcile |
| Firebase Cloud Messaging | Native push-notification delivery where enabled | `netlify/functions/_shared/pushNotifications.ts`, `src/hooks/usePushTokenRegistration.ts` | CONDITIONAL; exact Android production configuration/Data Safety parity still to verify |
| Google Analytics 4 | Web analytics where configured and consented | `index.html`, `src/components/CookieConsent.tsx`, `.env.example` | CONDITIONAL; verify production measurement ID and consent behavior |
| Independent sellers / fulfilment suppliers | Order fulfilment, delivery, returns and buyer/seller transaction communications | order, shipping and supplier-commerce workflows | INDEPENDENT/CONTEXT-DEPENDENT ROLE; exact controller/processor allocation requires contract-by-contract evidence |
| Legal/public authorities | Compliance with legal obligations and lawful requests | Privacy policy/legal workflows | EVENT-DRIVEN; disclose only where legally required/authorised |

## Open evidence required before Romania launch
1. Exact processing/storage regions for each production provider.
2. Current DPA/subprocessor terms for each processor.
3. Chapter V GDPR transfer mechanism for each EEA-to-third-country transfer.
4. Data-category mapping per provider.
5. Retention/deletion behavior per provider and per Loadify table/system.
6. Whether Google Analytics is enabled in the Romania production build and evidence that Consent Mode remains denied until valid consent.
7. Exact FCM identifiers/data categories in the production Android build.
8. Contractual role of each seller/supplier/fulfilment partner for shared buyer data.

No item above is treated as verified merely because a provider appears in source code.
