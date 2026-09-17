# Loadify Market — Full Platform E2E Current-Main Truth Matrix

Date: 2026-09-04
Repository: LoadifyMarketLTD/loadifymarket.co.uk
Audit base: current `main` after P0 escrow-boundary recovery

## Governing rule

`main` is the platform truth. Historical branches are evidence/recovery sources only. No historical branch may be merged wholesale merely because it is ahead. For each domain: audit current `main`, classify runtime/source truth, compare relevant branches, then recover only still-valid deltas onto a fresh branch from current `main`.

Classification vocabulary:
- PASS VERIFIED — runtime/build/test evidence exists for the claimed boundary.
- SOURCE-ONLY — source contract looks correct but runtime proof is absent.
- PARTIAL — substantial implementation exists but one or more required boundaries remain open.
- DEFECT — current-main behavior contradicts the intended contract.
- BLOCKED — evidence/action requires an external credential, hosted state, device, or other dependency not safely inferable.
- NOT EXECUTED — no valid runtime certification yet.

## 1. P0 Financial lifecycle

Current-main repair merged via PR #733. Buyer delivery confirmation no longer releases seller funds. `confirm-delivery` may move `shipped -> delivered`, while escrow remains held. Scheduled `escrow-release` remains the canonical Stripe Transfer boundary after the protection window and final dispute/refund/eligibility checks.

Production Netlify now serves exact commit `43f456b103d0465bb58895b0367cd07f3b3b93e8` with state `ready`; the deployed function bundle contains the repaired `confirm-delivery` boundary.

Verdict: PRODUCTION DEPLOY VERIFIED. Financial behavior still requires the later Stripe TEST-mode vertical transaction gate before platform-wide financial E2E PASS.

## 2. P1-01 Auth

Current-main contains the strict role-first Auth runtime, server-owned registration intent, provider-bound Google registration verification, retired legacy password-receiving registration endpoint, strict overlap-off migration history, and Auth contract coverage.

Historical P1-01 evidence already proves strict cutover mechanics and hosted hook/ACL behavior. Netlify production configuration has now been rechecked directly: both the browser Google client identifier and server Google client identifier are present in the production context and match. Their actual value is intentionally not recorded in this audit document.

Remaining canonical blocker is fresh post-cutover role-bound interactive Google Buyer + Seller certification. Existing observed Google identities predate the final strict cutover and must not be relabelled as fresh evidence.

Verdict: PARTIAL / BLOCKED ONLY ON FRESH INTERACTIVE GOOGLE BUYER + SELLER EVIDENCE. Do not fabricate or request duplicate accounts until existing historical evidence and accessible runtime sources are exhausted.

## 3. P1-02 Credentialed E2E

Historical PR #729 is superseded and closed without merge. Replacement PR #735 rebuilds the same six-file gate from the current post-P0 main baseline. Its Deploy Preview is successful. It is preparation-only and remains draft until P1-01 closes. The gate is fail-closed when activated and requires Buyer, Seller, Admin, target SHA and foreign-order isolation fixture.

Verdict: PREPARED / NOT CANONICALLY ACTIVE.

## 4. Buyer/Seller core commerce

Audit required on current main for: catalog visibility, product detail, cart, single-seller invariant, stock/reservation, Buyer Orders, Seller Orders, order transition ownership, profile capability isolation, seller lifecycle availability, offer/RFQ intersections and immutable commercial history.

Initial branch comparison result: `seller-order-status.ts` is byte-identical between current main and the historical `audit/full-platform-e2e-20260903` branch, so that historical copy is not a recovery delta.

Verdict: IN PROGRESS.

## 5. Checkout / payment / order lifecycle

Current source validates authenticated active buyer, authoritative DB product price/stock/listing state, single-seller checkout, seller active/Connect state, and DB-resolved shipping cost. Webhook materialises paid orders through the server-owned atomic RPC and uses idempotency storage. Stripe TEST-mode full vertical runtime certification is still required before PASS.

Verdict: SOURCE-ONLY / RUNTIME E2E NOT YET CERTIFIED.

## 6. Shipping / tracking

Current main policy is Royal Mail primary + Evri single alternative for new shipment writes. Known current-main inconsistencies to resolve during this domain:
- Seller Shipments create dialog still offers free-text carrier and examples such as DPD/UPS while backend rejects unsupported carriers.
- existing shipment-boundary test fixture still uses generic `Carrier` and is incompatible with the new server policy.
- checkout shipping validation currently validates active product shipping method/rate, but the carrier policy must also be verified server-side for new checkout so legacy carrier rows cannot bypass the Royal Mail/Evri policy.
- public tracking is internal/event-driven, not proven live carrier-API polling; wording must not imply real-time carrier API tracking without evidence.

Verdict: PARTIAL / CLEANUP REQUIRED.

## 7. Returns / disputes / messaging

Current source includes admin refund flow, Stripe refund/transfer-reversal reconciliation, dispute hold behavior, order messaging and notification surfaces. A concrete current-main inconsistency is already confirmed: the server-side return eligibility contract permits `delivered` and `completed` orders, while Buyer Orders only enables the return action at `completed`. This can unnecessarily defer the buyer return path until after escrow completion and must be reconciled during the Returns domain.

Full cross-role runtime and race/idempotency certification remains required.

Verdict: PARTIAL / UI-SERVER CONTRACT DRIFT CONFIRMED.

## 8. Admin

Admin operational surfaces exist. Known current-main UI/config drift remains in Admin Settings: explicit dark-theme typography conflicts with current light workspace, and the fallback commission value must be reconciled with the canonical 7% post-promotion server contract before any settings mutation.

Verdict: PARTIAL / TARGETED CLEANUP REQUIRED.

## 9. Supplier Commerce

Main already contains substantial supplier functions, control-centre/runtime boundaries and direct-supplier preparation. Historical publication-binding, postcode-contract and Phase O branches must be compared file-by-file against current main before any recovery. No provider write capability may be inferred from generic adapter code or docs.

Verdict: PARTIAL / BRANCH RECOVERY AUDIT REQUIRED.

## 10. Super Admin

PR #700 remains preview-only. Current Admin authority is not equivalent to a dedicated Platform Owner authority. Do not merge or wire production mutation authority until the owner model is explicitly designed and security-reviewed.

Verdict: PREVIEW ONLY / DO NOT MERGE.

## 11. Android

PR #618 is historical recovery material only. Public-web deltas are stale/superseded. Only Android/Capacitor-specific unique work may be extracted onto current main after audit; in-place update, Firebase, signing parity, build/device/logcat and functional smoke remain required.

Verdict: RECOVERY SOURCE / DO NOT MERGE AS-IS.

## 12. Global release / security / legal / performance

Required final evidence includes hosted migration/RLS parity, credentialed role isolation, Stripe TEST-mode vertical slice, recovery/rollback proof, mobile certification, accessibility/SEO/legal review and production smoke. Successful builds or isolated previews do not equal platform-wide PASS.

Security note from live configuration audit: secret-class environment variables must be reviewed for correct Netlify secret metadata without changing their values or runtime scopes. No secret value is to be copied into repository documentation or user-facing reports.

Verdict: OPEN.

## 13. Repo hygiene

Branch deletion is evidence-driven, not age-driven. Per-domain branches are classified as:
- ALREADY IN MAIN
- SUPERSEDED BY MAIN
- VALID RECOVERY DELTA
- EVIDENCE / CHECKPOINT ONLY
- ROLLBACK / ARCHIVE
- STALE DELETE CANDIDATE

A branch becomes a delete candidate only after unique work is proven absent or safely recovered.

Completed hygiene during this audit:
- PR #734 diagnostic Auth probe: CLOSED / NOT MERGED after evidence capture.
- PR #729 historical P1-02 preparation: CLOSED / NOT MERGED / SUPERSEDED BY #735.

## Active execution order

P0 Financial -> P1-01 Auth -> P1-02 Credentialed E2E -> Buyer/Seller core commerce -> checkout/payment/order lifecycle -> shipping/tracking -> returns/disputes/messaging -> Admin -> Supplier Commerce -> Super Admin -> Android -> global release/security/legal/performance -> repo cleanup final.

When a gate is externally blocked, continue read-only/source audit of later domains without falsely promoting the blocked gate to PASS.