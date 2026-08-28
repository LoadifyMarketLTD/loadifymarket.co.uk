# LOADIFY AUTH PR #599 — RECOVERY CHECKPOINT — 2026-08-28

> Purpose: exact continuation checkpoint for a new ChatGPT/Codex session after the previous conversation reached its length limit.
>
> Do not treat this file as approval to merge or activate hosted Auth. Recover live state first, then continue from the gates below.

## 1. Repository / branch / PR state at checkpoint

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Active Auth branch: `fix/auth-signup-autonomous-20260827`
- Active PR: **#599 — `Repair role-first Auth signup and provider-bound Google registration`**
- PR #599 state before this documentation commit: **OPEN / DRAFT / NOT MERGED / mergeable=true**
- Working-code HEAD before this checkpoint file: `ec7c6a788458f46445c658b95fa3c7910a4fc771`
- Working-code HEAD message: `test(auth): make Google nonce contract formatting-robust`
- PR #599 Deploy Preview on that HEAD: **SUCCESS**
- Preview: `https://deploy-preview-599--loadifymarketcouk.netlify.app`
- `main` at checkpoint: `f830c5bb2f31b10338ade8d0524bb3cf15ab53df`
- `main` message: `Merge PR #598: identity role capability architecture`

Important: after this checkpoint file is committed, the Auth branch HEAD will advance by one documentation-only commit. Use the commit shown above as the last code-only checkpoint, then inspect the new branch HEAD before doing any work.

## 2. PR ordering already completed

### PR #596

- `Refactor public signup to intent-driven Auth flow`
- **CLOSED / NOT MERGED** on 2026-08-28.
- Verdict: **CONSOLIDATE / CLOSE AS SUPERSEDED**.
- Its work is inherited in PR #599; do not reopen #596.

### PR #598

- Identity / role / capability architecture documentation.
- **MERGED** into `main`.
- Merge commit: `f830c5bb2f31b10338ade8d0524bb3cf15ab53df`.
- Documentation-only; no runtime/APK/Supabase behavior changed by #598.

### PR #603

- `TEMP: bisect PR #599 Netlify build failure`
- Diagnostic only.
- **CLOSED / NOT MERGED**.
- Root-cause proof:
  1. intent-driven `Signup.tsx` alone over current `main` -> Netlify **PASS**;
  2. `register-intent` + original `functions-modern` wrapper (`export { handler } ...`) -> Netlify **FAILURE**;
  3. the same `register-intent` with repository-standard `withLambda(handler)` default export -> Netlify **PASS**.
- Root cause: the new Auth functions were not adapted to the repository's modern Netlify runtime wrapper contract.

### PR #604

- `TEMP: validate PR #599 full quality gates`
- Branch: `audit/pr599-quality-gates-20260828`
- **OPEN / DRAFT / DO NOT MERGE** at checkpoint.
- Latest known head: `5b63f0187eb23671832f677fc96596b5fd575565`
- Latest known Netlify status: **SUCCESS**.
- This PR exists only because GitHub Actions jobs were failing before runner assignment (`steps=[]`, previously observed `runner_id=0`).
- Close #604 without merge once the remaining quality-gate diagnosis is finished.

### PR #601 / #602 mobile-web experiments

- Both are **CLOSED / NOT MERGED**.
- Do not reuse or revive their broad visual experiments during this Auth work.
- The downloadable Capacitor/APK experience is protected.

## 3. Exact scope of PR #599

PR #599 is Auth/signup work only. At the checkpoint it changes these files:

1. `netlify.toml`
2. `netlify/functions-modern/register-intent.ts`
3. `netlify/functions-modern/register-social-intent.ts`
4. `netlify/functions/__tests__/auth-before-user-created-hook-contract.test.ts`
5. `netlify/functions/__tests__/auth-signup-intent-contract.test.ts`
6. `netlify/functions/__tests__/buyer-onboarding-alignment.test.ts`
7. `netlify/functions/__tests__/register-intent.test.ts`
8. `netlify/functions/__tests__/register-social-intent-contract.test.ts`
9. `netlify/functions/__tests__/register.test.ts`
10. `netlify/functions/__tests__/signup-native-auth-contract.test.ts`
11. `netlify/functions/__tests__/signup-newsletter-preference-contract.test.ts`
12. `netlify/functions/__tests__/signup-role-first-google-web-contract.test.ts`
13. `netlify/functions/register-intent.ts`
14. `netlify/functions/register-social-intent.ts`
15. `netlify/functions/register.ts`
16. `src/__tests__/netlify-modern-wrapper-guard.test.ts`
17. `src/components/auth/GoogleRoleRegistrationButton.tsx`
18. `src/pages/pixel-perfect/Signup.tsx`
19. `src/pages/pixel-perfect/SignupEntry.tsx`
20. `src/pages/pixel-perfect/TradeAccount.tsx`
21. `src/vite-env.d.ts`
22. `supabase/676_signup_intent_auth_foundation.sql`
23. `supabase/677_auth_signup_intent_consumption.sql`
24. `supabase/678_auth_before_user_created_hook.sql`
25. `supabase/migrations/20260825200500_signup_intent_auth_foundation.sql`
26. `supabase/migrations/20260825201500_auth_signup_intent_consumption.sql`
27. `supabase/migrations/20260826070000_auth_before_user_created_hook.sql`

No Android directory, Capacitor config, mobile Home redesign, Seller Workspace redesign, Admin/Super Admin visual work, tax/checkout/payment logic, or Supplier Commerce activation belongs in this PR.

## 4. Intended Auth architecture in #599

### Email/password registration

1. User chooses public relationship: `buyer` or `seller`.
2. Browser calls `/.netlify/functions/register-intent`.
3. Server validates current Buyer/Seller registration flags and persists a short-lived private signup intent through a service-role-only RPC.
4. **Password never goes to Netlify and is never stored in signup intent.**
5. Browser calls `supabase.auth.signUp()` with password handled directly by Supabase Auth.
6. Only opaque `intent_id` plus non-authority user preferences such as newsletter are supplied as Auth user metadata.
7. Before User Created hook validates the server-owned intent fail-closed.
8. `handle_new_auth_user()` provisions the public identity from the locked intent and consumes the intent atomically.

`TradeAccount.tsx` is moved to the same intent -> native Supabase signup boundary.

### Role/capability contract

- Public signup choices are **Buyer** or **Marketplace Seller** only.
- Admin is never public/self-service.
- Supplier Partner / Fulfilment Provider remain separate commercial relationships and are not public signup roles.
- Seller remains Buyer-capable on the same Loadify identity.
- Seller legal type (`individual`, `sole_trader`, `company`) is profile/readiness data, not a role.

### Google fresh registration

- `SignupEntry.tsx` gives web users Buyer / Marketplace Seller choice first.
- `GoogleRoleRegistrationButton.tsx` is web-only and explicitly excluded in Capacitor/native context.
- Google Identity Services obtains an ID token with a cryptographic nonce.
- Raw nonce is generated with `crypto.getRandomValues`; Google receives SHA-256 nonce.
- Browser sends Google credential + raw nonce + requested role to `register-social-intent`.
- Server verifies Google credential using RS256/JWKS, issuer, audience, `azp` when applicable, expiry/token age, SHA-256 nonce, verified email, and provider subject.
- Server persists a provider-bound social signup intent.
- Browser then calls `supabase.auth.signInWithIdToken({ provider: 'google', ... })`.
- Fresh Google creation is authorized only by provider-bound server intent; role metadata from the client is never authority.

### Facebook

- Existing Facebook login is intended to remain usable for existing identities.
- **Fresh Facebook account creation remains fail-closed** until a separate provider-bound registration boundary is implemented and verified.

## 5. Netlify runtime defect found and fixed

Repository `netlify.toml` publishes `netlify/functions-modern` and the repository standard is:

```ts
import { handler } from '../functions/<name>';
import { withLambda } from '../function-runtime/lambdaCompat';
export default withLambda(handler);
```

The original #599 wrappers incorrectly did only:

```ts
export { handler } from '../functions/<name>';
```

Both are now repaired:

- `netlify/functions-modern/register-intent.ts`
- `netlify/functions-modern/register-social-intent.ts`

`src/__tests__/netlify-modern-wrapper-guard.test.ts` was extended to cover the two new critical handlers so this exact deployment regression cannot silently recur.

## 6. Capacitor/APK protection

Do not redesign or visually modify the downloadable app as part of #599.

Relevant existing native safety:

- `isCapacitorContext()` detects Capacitor WebView reliably.
- `patchCapacitorFetch()` is executed in `src/main.tsx` before React mounts.
- On native, it rewrites relative `/.netlify/functions/*` requests away from `https://localhost` to the configured/live Netlify backend.
- New Google GIS registration UI returns `null` in native context; the APK keeps its existing registration UI/OAuth behavior.

Do not remove these guards during cleanup.

## 7. Hosted Supabase state — last verified in this workstream

Loadify hosted project ref: `fwdfpmfvgygvqciecesx`.

At the last read-only hosted audit before this checkpoint:

- none of the Auth migrations from #599 were applied;
- `private.signup_intents` did not exist;
- `before_user_created_validate_signup_intent` did not exist / was not activated;
- hosted `public.handle_new_auth_user()` was still legacy and could derive role authority from Auth metadata / default fresh social identities to Buyer / swallow failures with a catch-all path.

Therefore:

- **DO NOT assume hosted Auth is repaired because PR #599 builds.**
- **DO NOT merge frontend code first and leave production DB/hook incompatible.**
- Recover the hosted schema again before rollout.

## 8. Validation status at checkpoint

### Confirmed PASS

- PR #599 is mergeable at GitHub metadata level.
- Netlify Deploy Preview for #599 working-code HEAD `ec7c6a7...`: **SUCCESS**.
- Root Netlify wrapper failure was reproduced, isolated, fixed, and proved via #603.
- Lint was isolated through #604 and observed **PASS**.
- TypeScript typecheck was isolated through #604 and observed **PASS**.
- `src/__tests__/netlify-modern-wrapper-guard.test.ts` isolated on #604: **PASS**.
- Latest #599 nonce contract test was changed from brittle exact formatting to a formatting-robust regex in commit `ec7c6a788458f46445c658b95fa3c7910a4fc771`.

### Not yet closed / must be re-run on latest #599 HEAD

- Full Vitest suite had **FAILURE** when run as a Netlify prebuild diagnostic.
- That failure was being isolated; do not claim full suite PASS yet.
- Targeted Auth tests must be re-run on the latest #599 code after `ec7c6a7...`.
- Relevant Auth suite must be re-run on latest #599.
- Full suite must be compared against current `main` if failures remain, to distinguish pre-existing repository failures from #599 regressions.
- Migration canonical/timestamped copy identity must be rechecked on latest HEAD before merge.
- GitHub Actions remains unreliable for this session because jobs were observed failing before any step received a runner; do not call those failures code failures without step/log evidence.

## 9. Google configuration blocker to verify

`VITE_GOOGLE_CLIENT_ID` is now declared in code and GIS CSP allowances are present, but repository search did not reveal a committed client ID (which is correct — it should normally be environment configuration).

Before runtime Google registration is considered PASS:

- confirm Netlify deploy environment has the intended `VITE_GOOGLE_CLIENT_ID`;
- confirm server-side `GOOGLE_CLIENT_ID` or matching fallback is configured for `register-social-intent`;
- confirm Supabase Google provider is configured consistently;
- test the actual role-first Google flow on Deploy Preview / controlled environment after database prerequisites exist.

Do not invent or commit a Google client secret.

## 10. Immediate continuation sequence for the next chat

Start by recovering, not assuming, the current state:

1. Read this checkpoint fully.
2. Fetch `main`, PR #599, branch `fix/auth-signup-autonomous-20260827`, PR #604, and their latest HEAD/statuses.
3. Confirm no unexpected commits landed after this checkpoint.
4. Confirm #599 diff is still Auth-only and APK/mobile visual surfaces remain outside scope.
5. Re-run targeted #599/Auth tests on the latest #599 HEAD. Use a temporary Netlify quality-gate branch if GitHub Actions is still failing before runner assignment.
6. If a test fails, isolate the exact test and repair the contract/code; do not suppress a real security failure.
7. Re-run relevant Auth suite, lint, typecheck, production build, Netlify preview and migration-copy identity.
8. Compare full Vitest behavior against `main` if full suite still fails.
9. Read-only audit hosted Supabase again.
10. Design the rollout order so database objects + Auth hook + deployed functions/frontend never produce an incompatible public-signup window.
11. Only after all code gates are green, decide whether to apply the three hosted migrations and activate the official Supabase Before User Created hook in a controlled sequence.
12. Runtime-verify:
    - Buyer email signup -> Buyer capability only;
    - Seller email signup -> Buyer + Seller capability + Seller draft/onboarding;
    - Google Buyer signup -> Buyer only;
    - Google Seller signup -> Buyer + Seller + Seller draft/onboarding;
    - client role metadata cannot grant authority;
    - fresh Facebook remains rejected;
    - existing Google/Facebook login remains valid;
    - email confirmation projects correctly;
    - replay/expired/mismatched intents fail closed.
13. Only then mark #599 Ready, merge it, and close/delete #604 diagnostic without merge.

Do not merge #599 merely because Netlify build is green.

## 11. Hard guardrails to preserve

- No Supplier Commerce/Avasam activation.
- Marketplace Seller and Supplier Commerce remain separate concepts.
- No broad Workspace/Admin/Super Admin visual changes.
- Do not import visual changes from PR #359.
- Do not revive #601/#602 mobile visual experiments.
- Do not redesign the downloadable APK in this Auth repair.
- Do not touch XDrive repositories/projects.
- No blanket/fabricated VAT logic.
- Catalog publication and checkout/tax/payment readiness remain separate concerns.
- Hosted Auth/DB writes only after code gates and an explicit controlled rollout sequence.

## 12. Paste this into the new chat

Use this exact continuation request:

```text
CONTINUE LOADIFY AUTH PR #599 EXACTLY FROM THE REPOSITORY CHECKPOINT:

docs/checkpoints/LOADIFY_AUTH_PR599_RECOVERY_CHECKPOINT_2026-08-28.md

Repo: LoadifyMarketLTD/loadifymarket.co.uk
Active branch: fix/auth-signup-autonomous-20260827
PR: #599
Last code-only checkpoint before the documentation commit: ec7c6a788458f46445c658b95fa3c7910a4fc771
Main known at checkpoint: f830c5bb2f31b10338ade8d0524bb3cf15ab53df

Read the checkpoint in full first. Then recover the real current state of main, #599, #604 and hosted Supabase before changing anything. Continue the remaining Auth quality gates and controlled rollout exactly from the checkpoint. Do not merge #599 until all required Auth gates and runtime/hosted compatibility checks pass. Do not touch APK visuals, mobile website redesign, Supplier Commerce, Workspace/Admin/Super Admin visuals, XDrive, PR #359 visuals, checkout/tax/payment logic or unrelated areas.
```
