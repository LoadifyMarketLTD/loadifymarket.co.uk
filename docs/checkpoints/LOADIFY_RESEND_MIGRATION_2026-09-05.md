# Loadify Resend migration checkpoint — 2026-09-05

- Base main: `7500b309ff11c2dc835b293d367b5cb7524504c5`
- Branch: `fix/email-provider-resend-20260905`
- `loadifymarket.co.uk` verified in Resend, region `eu-west-1`, sending enabled, receiving disabled.
- Transactional `send-email` migrated from SendGrid SDK to Resend HTTP API.
- Existing internal-secret gate, anti-spam validation, rate limiting, templates, and admin fail-closed behavior preserved.
- Provider success is only reported after Resend returns a 2xx response with an email id.
- Sender remains `contact@loadifymarket.co.uk` (via `RESEND_FROM_EMAIL`, existing `SENDGRID_FROM_EMAIL`, or canonical fallback).
- `RESEND_API_KEY` must exist in Netlify runtime before merge to Production.
- No Stripe, visual, or Production database schema/migration changes.
- Do not merge until Deploy Preview passes and Resend runtime configuration is confirmed.
