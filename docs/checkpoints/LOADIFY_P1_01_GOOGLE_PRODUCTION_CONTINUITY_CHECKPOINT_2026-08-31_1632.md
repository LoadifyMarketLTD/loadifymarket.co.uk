# LOADIFY MARKET — P1-01 GOOGLE PRODUCTION CONTINUITY CHECKPOINT

**Checkpoint timestamp:** 2026-08-31 16:32 UTC

> **CONTINUE LOADIFY MARKET EXACTLY FROM THIS CHECKPOINT IN THE NEXT CHAT. DO NOT RESTART THE AUTH AUDIT FROM ZERO. DO NOT REPEAT ALREADY-PASSED GOOGLE CONFIGURATION OR STRICT-CUTOVER WORK UNLESS A NEW CONTRADICTION APPEARS.**

## Repository / exact state

Repository:
`LoadifyMarketLTD/loadifymarket.co.uk`

Owner local worktree:
`C:\Users\Danny\Desktop\LoadifyMarket-E2E`

Latest production/main SHA verified by the owner immediately before the final probe:
`c3ee716fb5f70d58b117be05bd9a80ea423d43a4`

Owner diagnostic branch at this point:
`ops/auth-google-production-config-20260831`
tracking `origin/main`

The final probe began with:
- `=== 1. EXACT MAIN ===`
- `MAIN + WORKTREE: PASS`

Therefore the diagnostic was executed from the expected clean main state.

---

# 1. Canonical Release Gate order

Current release order remains:

`P1-01 Auth current runtime / strict cutover`
→ `P1-02 #619 Buyer Profile Completeness`
→ `P1-03 #639 Buyer→Seller upgrade`
→ `P1-04 #666 Tax runtime`
→ `P1-05 #642 Listing activation`
→ `P1-06 #670 Listing scheduler rollback`
→ `P1-07 #672 Checkout matrix rollback`
→ `P1-08 Core Commerce runtime matrix`
→ Final Release Gate.

**Critical continuity rule:** once P1-01 is actually closed, the next canonical lane is **P1-02 #619 Buyer Profile Completeness**. Do not rename P1-02 to “Credentialed E2E”.

---

# 2. Standing guardrails

These remain mandatory:

- NO GitHub Actions.
- Local CLI + Netlify Deploy Preview / production runtime verification only.
- No Web Mobile.
- Do NOT use PR #359 as a visual source.
- Do NOT alter Workspace visuals based on PR #359.
- No Seller Workspace or Super Admin redesign as part of this Auth work.
- No unrelated Checkout / Payments / Supplier Commerce changes inside Auth.
- No RLS/security relaxation.
- No invented credentials or endpoints.
- No secrets in chat or checkpoint files.
- No hosted destructive reset.
- No `supabase migration repair`.
- Forward Supabase migration governance only.
- Do not create a new migration unless the runtime diagnosis proves one is actually required.

---

# 3. P1-01 strict-cutover work already completed — DO NOT REDO

The current-main role-first Auth runtime was reconciled and merged through PR #676.

Strict legacy registration overlap was handled through PR #678 using migration:
`supabase/migrations/20260831123232_auth_signup_disable_legacy_overlap.sql`

The strict-cutover migration was built to:
- lock the singleton cutover row;
- fail if it is missing;
- set `allow_legacy_server_registration = false`;
- require exactly one row update;
- verify the final state is false before COMMIT;
- avoid hook/RLS/ACL/user/intent changes;
- never restore overlap to true.

PR #678 was merged with expected-head guard.

This database/security lane is not the active blocker in the present checkpoint. The remaining P1-01 work is Google production runtime/certification.

---

# 4. Google production configuration already verified — PASS

The owner ran the production configuration gate from exact main.

Verified facts:

### Netlify Google environment contract

All required production values were present and syntactically valid:
- `GOOGLE_CLIENT_ID` in Functions / Production
- `VITE_GOOGLE_CLIENT_ID` in Builds / Production
- `VITE_GOOGLE_CLIENT_ID` in Functions / Production

The three values matched exactly.

Result:
`GOOGLE NETLIFY CONTRACT: PASS`

### Production Vite artifact

The production Signup bundle contained the configured Google client ID.

Result:
`BUNDLE GOOGLE CLIENT ID: PRESENT`

The same production artifact contained the Google Identity Services implementation / GSI client source.

Result:
`BUNDLE GOOGLE GSI CODE: PRESENT`

### Server fail-closed probe

Production request to:
`POST https://loadifymarket.co.uk/.netlify/functions/register-social-intent`

with deliberately invalid Google credential data reached the Google verification path and returned:

HTTP `403`

Payload:
`{"error":"Google registration could not be verified."}`

Result:
`SERVER GOOGLE FAIL-CLOSED: PASS`

This is important evidence that the server-side Google registration path is configured and fails closed rather than falling through to a legacy/open registration path.

---

# 5. Earlier browser diagnostic that must not be misread

An earlier Playwright probe incorrectly expected the registration form immediately after navigation and failed with:

`Error: BUYER: registration form missing`

A later React-aware diagnostic showed the route/application was alive and that the earlier probe timing/assumption was inadequate rather than proving the route was absent.

The deeper diagnostic also observed unrelated runtime console noise, including:
- a 401 resource load;
- `[useLiveCategoryAvailability] Failed to load live category availability`;
- Supabase message `permission denied for function is_seller_checkout_ready`;
- service-worker registration intentionally blocked by Playwright.

It also observed:
`FORM_COUNT=3`

and concluded the register route was still affected by React/Suspense/timing behavior during that diagnostic.

**Do not conflate the unrelated `is_seller_checkout_ready` console error with the Google Auth blocker without causal evidence.**

---

# 6. FINAL / CURRENT PRODUCTION GOOGLE PROBE — ACTIVE BLOCKER

Immediately before this checkpoint the owner ran a newer Google GSI enabled-state production probe.

Setup:

`npm run e2e:setup`

completed successfully:
- packages up to date;
- 650 packages audited;
- `found 0 vulnerabilities`.

Then:

`=== 3. GOOGLE GSI ENABLED-STATE PRODUCTION PROBE ===`

For BUYER the probe produced:

```text
--- BUYER ---
BUYER: DOCUMENT_HTTP=200
BUYER: REACT_FORM=PASS
BUYER: GSI_SCRIPT_SRC=https://accounts.google.com/gsi/client
```

This is the most important correction to the earlier form-missing diagnostic:

**The Buyer registration document returns HTTP 200, the React registration form now mounts successfully in the probe, and the correct Google GSI script is attached.**

The active failure occurs only at the next assertion:

```text
locator.waitFor: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('iframe[src*="accounts.google.com"]').first()
```

Stack position:
`probe (.../.tmp-google-gsi-enabled-production-probe.mjs:99:31)`

The wrapper then stopped with:

`STOP: Google GSI enabled-state production probe failed.`

## Exact current blocker

**P1-01 is NOT blocked by missing Netlify Google configuration, missing baked client ID, missing React form, missing GSI script source, or server fail-open behavior.**

The current unresolved question is narrower:

> Why does the loaded Google Identity Services client on the production Buyer registration page not produce the expected `accounts.google.com` iframe within the 30-second headless Playwright probe?

At this checkpoint we do **not** yet know whether this is:
- an actual production GSI initialization/rendering defect;
- a browser/headless/third-party-context behavior of the diagnostic;
- a renderButton/container/timing issue;
- a Google origin/client authorization condition;
- a CSP/COOP/permissions/network issue;
- a probe assumption that is too strict for the actual GSI implementation.

Do not guess. Determine causality from runtime evidence.

---

# 7. Exact next action in the new chat

Start from the current blocker above. Do **not** restart from Netlify env validation or strict cutover.

The next diagnostic should be read-only and targeted specifically at GSI initialization/rendering. It should capture, without exposing secrets:

1. exact production URL and final URL after navigation;
2. `document.readyState` and React form presence;
3. existence/state of `window.google`, `window.google.accounts`, and `window.google.accounts.id`;
4. the `script#loadify-google-gsi` source and load/error event state;
5. the actual Google button/container DOM before and after initialization;
6. any Google-created elements, not only `iframe[src*="accounts.google.com"]`;
7. page console warnings/errors;
8. failed requests and response status for requests to Google domains;
9. CSP/security-policy console errors if any;
10. whether `google.accounts.id.initialize` and `renderButton` are actually invoked by the production component;
11. whether the probe's expectation of a Google iframe is valid for this exact GSI rendering mode;
12. only after Buyer is understood, repeat the same evidence for Seller.

Prefer instrumentation/observation first. **Do not modify production merely to satisfy the existing test assertion.**

If the browser/headless probe is proven to be the problem, repair the diagnostic rather than production code.

If production code is proven defective, make the smallest Auth-scoped repair on a dedicated branch, add regression coverage, run targeted tests/lint/migration-health as applicable, use Netlify Deploy Preview, then validate production only after safe merge/deploy.

---

# 8. P1-01 closure rule

Do not claim P1-01 CLOSED/PASS merely because the configuration gate passed.

Current evidence supports:
- strict database cutover: completed;
- legacy `/register` endpoint retirement surface: previously verified;
- Google Netlify production contract: PASS;
- Google client ID baked into production Signup artifact: PASS;
- Google GSI client code/source in production artifact: PASS;
- Google server fail-closed behavior: PASS;
- Buyer production document: HTTP 200;
- Buyer React registration form: PASS;
- Buyer correct GSI script source: PASS;
- expected Google iframe in current headless probe: **NOT OBSERVED / TIMEOUT**.

Therefore:

**P1-01 = OPEN, with one narrowed Google production runtime/certification blocker.**

Do not fabricate real interactive OAuth success. Historical DB/provider-bound Google validation is not the same thing as an actual browser Google OAuth credential flow.

If the canonical release gate requires real interactive Buyer + Seller Google certification, keep that as the remaining manual/external evidence after the non-interactive initialization blocker is resolved.

---

# 9. Continuation prompt for the next chat

Use this verbatim or near-verbatim:

**CONTINUE LOADIFY MARKET P1-01 GOOGLE PRODUCTION EXACTLY FROM CHECKPOINT:**
`docs/checkpoints/LOADIFY_P1_01_GOOGLE_PRODUCTION_CONTINUITY_CHECKPOINT_2026-08-31_1632.md`

Repo: `LoadifyMarketLTD/loadifymarket.co.uk`

Expected main at checkpoint: `c3ee716fb5f70d58b117be05bd9a80ea423d43a4`

Read the checkpoint completely and verify current main/HEAD first. Do not restart Auth or strict-cutover audits. Continue exactly from the active blocker: Buyer React form and correct Google GSI script both PASS in production, but the current headless Playwright probe times out waiting for `iframe[src*="accounts.google.com"]`. Determine whether this is a production GSI initialization/rendering defect or a faulty probe assumption using targeted read-only runtime instrumentation. Do not modify production until causality is proven. After P1-01 closes, continue to canonical P1-02 `#619 Buyer Profile Completeness`.

---

# 10. Truth statement at handoff

At handoff, the strongest supported statement is:

> Production Google configuration is present and coherent, the configured client ID is baked into the deployed Signup artifact, the server-side Google intent path fails closed correctly, the Buyer registration React form mounts, and the correct GSI client script is attached. The unresolved blocker is that the current headless browser diagnostic does not observe the expected Google iframe within 30 seconds. This must be diagnosed before P1-01 is declared closed.
