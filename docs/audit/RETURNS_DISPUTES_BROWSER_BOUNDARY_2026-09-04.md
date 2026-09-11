# Returns / disputes browser-boundary audit — 2026-09-04

Buyer Orders currently inserts return and dispute requests directly through the authenticated Supabase browser client rather than a Netlify mutation endpoint. This is not automatically unsafe: current hosted/repository RLS hardening includes buyer/order/seller ownership checks, system-field protection triggers, return eligibility state checks, duplicate-return protection, and seller/admin decision boundaries.

Classification: **SOURCE-GUARDED / RUNTIME E2E STILL REQUIRED**. Do not replace this path merely because it is client-originated. During the returns/disputes domain, verify hosted RLS parity and cross-role negative cases before deciding whether a server boundary adds material protection or only duplicate logic.
