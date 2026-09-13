# LOADIFY MARKET — ANDROID 5 (1.0) RELEASE AUDIT HANDOFF — 2026-09-13

CONTINUE THIS LOADIFY MARKET WORKSTREAM FROM THIS CHECKPOINT. DO NOT RESTART FROM ZERO. DO NOT MIX XDRIVE LOGISTICS INTO THIS AUDIT.

## 1. Purpose of this checkpoint

The previous ChatGPT conversation hit the maximum chat length while auditing whether the current Loadify Market Android release `5 (1.0)` is genuinely ready for broader Closed testing Alpha rollout and eventual release progression. The next agent must continue the evidence audit, not produce a fresh high-level plan.

The immediate task is to turn the release-readiness checklist into a strict **PASS / PARTIAL / FAIL** matrix with exact evidence for each item: exact file(s), exact API/endpoint where relevant, exact runtime/build/test evidence, and exact missing proof. Do not estimate the number of errors. Do not call a capability PASS merely because code exists.

## 2. Canonical repository / product

- GitHub repo: `LoadifyMarketLTD/loadifymarket.co.uk`
- Product: **Loadify Market**
- Production: `https://loadifymarket.co.uk`
- Android package: `co.uk.loadifymarket.app`
- Local Windows repo used during this work: `D:\LoadifyMarket-Release-v4`
- Canonical audit framework: `docs/audit/MASTER_FRAMEWORK.md`
- Canonical coverage matrix: `docs/audit/COVERAGE_MATRIX.md`
- Current web blueprint used in the latest work: `docs/blueprints/LOADIFY_MARKET_WEB_MASTER_BLUEPRINT_2026-09-11.md`

IMPORTANT: this handoff branch is documentation only. Before changing runtime code, inspect the laptop working tree and current branch. Do not assume the local branch is clean or that the latest local branch exists remotely.

## 3. Exact Google Play / Android release state already established

The following was already verified in the previous workstream and should not be rediscovered from scratch unless contradictory evidence appears:

- Google Play track: **Closed testing — Alpha**
- Track state: **Active**
- Current release label/version shown by Play: **`5 (1.0)`**
- Release was shown as available to the selected testers.
- Release timestamp previously verified: **12 Sep 2026 23:29**.
- `5 (1.0)` is a **Play Console release/version label, not a filename on the computer**.
- The Android App Bundle that was uploaded/accepted by Play is:
  `D:\LoadifyMarket-Release-v4\android\app\build\outputs\bundle\release\app-release.aab`
- Previously recorded SHA256 of that accepted AAB:
  `E63266D9EDBE7C5864164AA1CBE47DFEBE350053AB74C0C3FA420ECE74E2DFF1`
- Correct Firebase configuration was downloaded/copied for package `co.uk.loadifymarket.app`.
- Play App Signing certificate and local upload key are distinct; do not confuse them.

The Play Console action **Start full rollout** is a Console action for the current testing release. It is not a file. Do not click it solely because the button is available. It must remain gated by the evidence matrix and device validation.

## 4. Device validation state

- A locally built versionCode 5 / versionName 1.0 build was previously installed/validated on the Pixel during development.
- Because the Pixel may already have the same versionCode from a local install, Play can show **Open** instead of a clean update/install path; that does not prove Play-signed update behavior.
- Preferred final Play-distribution validation is another tester device / Samsung using the actual Play closed-testing release.
- Do not uninstall a tester device app unless the user explicitly approves it.
- When validating package metadata with ADB, expected values are `versionCode=5` and `versionName=1.0`.

## 5. Repository facts already known from the latest release work

Recent web/order work already merged before this audit included:

- PR #780 — seller fulfilment/shipment safe flow.
- PR #782 — seller order operational details.
- PR #783 — Message buyer: get/create conversation and navigate; production Netlify deploy for that commit was verified ready.
- PR #785 — restored mobile delivery address contracts; this is on current `main` as of the handoff branch base.

Do not rebuild those features from scratch. Verify the local laptop checkout contains the intended merged state before applying any further fix.

Previous source-reconciliation notes from the laptop workstream:

- A 21-file staged backup patch was already audited; all files were accounted for. **Do not apply that whole patch blindly.**
- Old root hotfix files were older than the current source and must not overwrite newer code.
- Encoding fixes and MobileOrders performance work existed locally in the reconciliation workstream.
- Before any commit/push, inspect exact `git status --short` and exact `git diff`; preserve unrelated work.

## 6. Audit finding visible at the end of the expired chat

The previous conversation had reached a release-readiness table. At the moment the chat expired, these areas were explicitly still not green:

- **Stripe readiness — PARTIAL / needs complete audit.** Code presence is insufficient; financial path, readiness, webhook/idempotency/failure behavior and release-specific runtime proof still need evidence.
- **Offline / draft persistence / retry — PARTIAL / insufficient release proof.** Must demonstrate behavior, not only implementation intent.
- **TalkBack / text scaling / accessibility — PARTIAL / audit incomplete.** Must test the release build/device behavior.
- **Crash / error recovery on Android/Web/iOS — PARTIAL / needs smoke/E2E evidence, especially on the Play build for Android.**

Do not silently convert these to PASS.

## 7. Important correction: returns/disputes are NOT absent

The expired chat explicitly corrected an earlier assumption: **returns/disputes do not need to be rebuilt from zero.**

Repository evidence already showed implementation for Buyer Disputes, Admin Disputes and associated state. Notification infrastructure also includes event types such as `return`, `dispute`, `message` and push helper logic.

Therefore the task is to audit end-to-end behavior and authorization/money boundaries, not to invent a brand-new returns/disputes subsystem.

For release evidence, use the canonical coverage requirement for returns/refunds/disputes: eligibility rules, money boundary, audit trail, authorization, and buyer/seller state consistency.

## 8. Required audit method — no vague green checks

For each release-critical item, produce one row containing at minimum:

| Field | Required content |
|---|---|
| Area | exact feature/control name |
| Status | PASS / PARTIAL / FAIL |
| Repository evidence | exact path(s), component/function/migration/test |
| API / data boundary | exact endpoint/RPC/table/policy if applicable |
| Runtime evidence | exact browser/device/Play/Stripe observation |
| Failure-path evidence | what happens when auth/network/provider/input fails |
| Missing proof | explicit unknown, if any |
| Test needed | exact next test command/action |
| Release blocker | YES / NO with reason |

The repository `docs/audit/COVERAGE_MATRIX.md` is a map, not proof. It explicitly requires current SHA/release evidence and separates L0 build proof from L1–L5 runtime/security/external/canonical evidence. Follow that model.

## 9. Release domains that must be reconciled against the matrix

Use the canonical coverage matrix as authority for critical domains. In particular, do not skip:

- signup/login/verification/reset;
- Buyer/Seller capability coexistence and role isolation;
- product create/edit/publish and marketplace visibility;
- cart/checkout/payment including Stripe failure recovery and webhook/idempotency;
- orders;
- shipping/tracking/proof;
- returns/refunds/disputes;
- messaging;
- reviews/UGC/report/block/moderation;
- Seller Stripe Connect/balance/payout boundaries;
- account deletion/privacy;
- push notifications;
- Android release package/version/signing/permissions/Data Safety/store assets/AAB/device smoke;
- admin governance / privilege boundaries;
- tax/VAT/customs where checkout depends on it;
- recovery/rollback for sensitive changes.

If the old chat's “14 points” list differs from the broader coverage matrix, recover the exact 14-point source first and preserve its wording. Do **not** invent missing rows merely to reach 14.

## 10. Google Play release gate

Do not press **Start full rollout** until all of the following are true for the exact release being promoted:

1. exact artifact/version/package/signing state is known;
2. no unresolved P0 security/payment/order/shipping/data-integrity blocker exists;
3. real Play-distributed build has been smoke-tested on a tester device;
4. buyer and seller scenarios have been demonstrated on the release candidate, not inferred from web-only code;
5. failure paths are tested for network/provider/auth errors where release-critical;
6. accessibility and Android permission behavior have at least a documented device pass;
7. Privacy/Data Safety/account deletion/UGC requirements match actual app behavior;
8. audit matrix records all unknowns as unknowns rather than “probably OK”.

## 11. First action in the next chat — laptop truth before edits

The preferred workflow is local Windows PowerShell. Desktop Commander may be tested once at the start of the new chat; if it is unavailable, continue with user-run PowerShell.

Rule: give **one PowerShell block at a time**, then wait for the result. Do not dump a multi-step script and do not include `exit`.

First laptop check should be non-destructive and capture the current truth:

```powershell
Set-Location 'D:\LoadifyMarket-Release-v4'
git status --short
git branch --show-current
git log -1 --oneline
```

After that, verify the accepted AAB still exists and hash it before rebuilding anything:

```powershell
Get-Item 'D:\LoadifyMarket-Release-v4\android\app\build\outputs\bundle\release\app-release.aab'
Get-FileHash 'D:\LoadifyMarket-Release-v4\android\app\build\outputs\bundle\release\app-release.aab' -Algorithm SHA256
```

Do not run both blocks in the same user step unless the user explicitly asks for batch execution.

## 12. Git / laptop safety rules

These rules are mandatory for the next agent:

- no `git reset --hard`;
- no `git clean`;
- no destructive checkout/revert of unrelated local files;
- never overwrite local WIP before inspecting `git status` and `git diff`;
- do not apply old backup/hotfix files wholesale;
- do not make the user repeat command output already supplied;
- if PowerShell shows the continuation prompt `>>`, tell the user to press `Ctrl+C` before anything else;
- PowerShell .NET file APIs need absolute paths or `(Resolve-Path ...)`;
- when writing source files from PowerShell, use UTF-8 without BOM;
- prefer surgical edits over broad regex replacement;
- do not merge or deploy merely because build/typecheck succeeds.

## 13. CI/build policy for this continuation

Do not depend on GitHub Actions credits for this continuation. Prefer local validation on the laptop:

- lint/typecheck/tests according to `package.json`;
- migration verification when relevant;
- production build where appropriate;
- Capacitor/Gradle Android build locally;
- ADB/device smoke;
- Play-distributed tester build for final release evidence.

A successful local build is L0 evidence only; it does not replace device/Play/payment/runtime evidence.

## 14. What NOT to do

- Do not mix XDrive Logistics code, screenshots, APKs or PRs into Loadify Market.
- Do not redesign Loadify's brand/UI as part of this release audit.
- Do not introduce Play Billing for the current physical-goods marketplace merely because this is Android.
- Do not perform live Stripe payout/refund/transfer tests unless the user explicitly authorizes them.
- Do not change production DB/RLS/migrations merely to make an audit row green without evidence of a real defect.
- Do not declare “ready for full rollout” before the exact release candidate has the required evidence.

## 15. The next concrete deliverable

The next agent should produce a **release evidence ledger** for Android `5 (1.0)` with PASS/PARTIAL/FAIL rows and exact proof, then reduce the remaining blockers one by one.

The first goal is not to change code. The first goal is to establish exact current laptop SHA/working tree/artifact truth and locate the exact 14-point checklist source used in the expired conversation. Then continue the audit from the first unresolved row.

## 16. Truth rule

Never claim completion from repository inspection alone. Use exact release-specific evidence. If a fact is stale, ambiguous or not provable from current sources/device state, mark it UNKNOWN/PARTIAL and continue collecting proof.
