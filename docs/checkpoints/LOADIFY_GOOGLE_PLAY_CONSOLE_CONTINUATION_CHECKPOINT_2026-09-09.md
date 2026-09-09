# Loadify Market — Google Play Console Continuation Checkpoint

**Checkpoint date:** 2026-09-09  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Baseline `main` observed immediately before this checkpoint:** `85f8c948d0a76d8b7e70f5e33283f7a6845adb06`  
**Purpose:** canonical handoff for the next chat so Google Play work resumes from the current state without re-asking Daniel to reconstruct the whole history.

---

## 1. FIRST INSTRUCTION FOR THE NEXT CHAT

Before answering any new Google Play question, read this checkpoint from the repository and continue from the first unfinished item below.

Do **not** restart the audit from zero. Do **not** make Daniel repeat prior answers. For every Play Console declaration, ground the answer in:

1. the current Play Console screen Daniel provides;
2. current repo/runtime truth for Loadify Market;
3. current official Google Play / IARC documentation when wording is ambiguous or policy-dependent.

When a declaration is legal/policy-sensitive, explain exactly what will be declared before saving it.

---

## 2. NON-NEGOTIABLE BOUNDARIES

### Loadify-only scope
- Work only on **Loadify Market**.
- Do **not** inspect, modify or reuse anything from the XDrive application.
- The authorized Windows machine may happen to be named `XDriveLogistics`; that machine name is not permission to touch the XDrive app.

### Stripe is READ-ONLY
Daniel explicitly instructed that Stripe is already functional and must not be changed.

Therefore:
- do not change Stripe account settings;
- do not change Connect configuration;
- do not change payouts/transfers;
- do not change PaymentIntents / Checkout architecture;
- do not rotate or alter keys;
- do not change MoR behaviour;
- Stripe access, if used at all, is verification/read-only only.

### Google Play release boundary
- Internal Testing work is allowed.
- Do **not** send a Production rollout or press final **Send for review** without explicit owner confirmation immediately before the action.
- Do not silently save a new legal declaration when the answer is uncertain. State the exact declaration first.

---

## 3. APP / PLAY IDENTITY

- Product: **Loadify Market**
- Production site: `https://loadifymarket.co.uk`
- Android package: `co.uk.loadifymarket.app`
- Google Play developer account: **XDrive Logistics**
- Google Play app: **Loadify Market**
- Play Console app id: `4975949324475349938`
- Firebase project: `loadify-market`
- Category conclusion: **Shopping**
- Android scope for Google Play: multi-vendor marketplace for **physical goods only**.
- One account can buy and sell; there are not separate buyer/seller auth accounts.

---

## 4. VERIFIED SOURCE CHANGES ALREADY MERGED

### Physical-goods-only + UGC safety
PR #774 was merged at:
`8d1cb9205635301d1bedffbb6d268cdc91ffa4cd`

This closed the two original Play blockers:
- Android v1 no longer permits creating/updating/checking out service/digital listings;
- user/review/seller/chat reporting and user blocking exist;
- production database guard rejects `listingContext='service'`;
- moderation/report tables and admin report queue exist.

Validation at merge time:
- TypeScript PASS;
- production build PASS;
- 168/168 test files PASS;
- 1136/1136 tests PASS;
- migration/security checks PASS.

### Android versionCode 2
PR #775 was merged at:
`90de9591833d02bd38d08f7e9f08dd0ea3ba3daf`

It bumped Android `versionCode` to **2** for the Google Play compliance build.

Important: verify in Play Console whether the new AAB versionCode 2 has actually been uploaded to Internal Testing. Do not assume upload status from the repo commit alone.

### Public Google Play account-deletion page
PR #776 was merged at:
`85f8c948d0a76d8b7e70f5e33283f7a6845adb06`

The public route now exists:
`https://loadifymarket.co.uk/delete-account`

Repo source:
- `src/AppRoutes.tsx` includes `/delete-account`;
- `src/pages/pixel-perfect/DeleteAccount.tsx` explains how to request account deletion, what is deleted/anonymised, legal retention, timeframe, and contact email;
- the existing backend `netlify/functions/delete-account.ts` performs account deletion/anonymisation logic.

Do **not** invent or use `https://loadifymarket.co.uk/delete-data` unless a real dedicated partial-data deletion flow is implemented later. A repo search at checkpoint time found no `/delete-data` route/page.

---

## 5. CONTENT RATINGS — SAVED STATE

The IARC / Content ratings questionnaire was corrected and then saved.

The intended final answers are:

### Downloaded app
- Ratings-relevant content downloaded in package: **No**

### User content sharing
- Native interaction / exchange with other users: **Yes**
- UGC is primary source of app content: **No**
- Public sharing of nudity permitted: **No**
- Public sharing of real-world graphic violence permitted: **No**
- Ability to block users or UGC: **Yes**
- Ability to report users or UGC: **Yes**
- Chat moderation: **No**
- Interactions limited to invited friends only: **No**

Important correction: `Chat moderation` was initially set to Yes by mistake, then changed to **No** before the saved final questionnaire. Reporting/blocking plus an admin report queue is not the same thing as proactive/moderated chat content.

### Online content
- App features/promotes content not in initial download: **Yes**
  - marketplace product listings are online content.

### Catalogue/content categories
- Violence: **No**
- Sexuality/nudity: **No**
- Potentially offensive language: **No**
- Illegal/recreational drugs: **No**
- Focus on age-restricted products/activities: **No**

### Miscellaneous
- Shares user's current precise physical location with other users: **No**
- Allows purchase of digital goods: **No**
- Cash rewards / gift cards / play-to-earn / convertible crypto / NFTs: **No**
- Web browser or search engine: **No**
- Primarily news or educational: **No**

Result shown by Play/IARC after these answers was low-age rating such as PEGI 3 / Everyone with interactive element `Users interact`. That result is not itself inconsistent with an 18+ target audience declaration.

---

## 6. TARGET AUDIENCE

Daniel selected **18 and over** as the sole target age group.

At checkpoint time, the Play flow showed the optional checkbox:
`Restrict users that Google has determined to be minors from my app (optional)`.

Do not assume this optional restriction is required. Current official policy makes mandatory minor blocking especially relevant to specific age-restricted core categories such as real-money gambling, dating/matchmaking, random chat, or anonymous chat. Loadify is a contextual buyer/seller marketplace chat, not a random/anonymous chat app.

Before changing/saving Target audience again, verify whether the 18+ selection has already been saved on the dashboard.

---

## 7. DATA SAFETY — CURRENT HANDOFF STATE

This is the active unfinished section. Continue here.

### Step 2 — Data collection and security
Current intended answers/evidence:

- `Does your app collect or share any of the required user data types?` → **Yes**
- `Is all user data collected by your app encrypted in transit?` → **Yes**
- Account creation methods → **Username and password** + **OAuth**
  - Loadify supports email/password and Google sign-in.
- Account deletion URL → `https://loadifymarket.co.uk/delete-account`

### Optional question: delete some/all data without deleting the account
This caused confusion and must be handled carefully.

The question is specifically about a **partial data deletion request that does not require deleting the account**.

Checkpoint repo truth:
- `/delete-account` is a full account-deletion route;
- no dedicated `/delete-data` route/page was found;
- there is no verified basis for claiming user data is automatically deleted within 90 days while the account remains active.

Therefore, unless new runtime evidence proves otherwise, the defensible answer is:
- **No**

Do not select:
- **Yes** with `/delete-account` as the partial-data URL;
- **No, but user data is automatically deleted within 90 days** unless a real 90-day automatic deletion system is verified.

### Step 3 — Data types
Daniel reached the top of the Data types page and asked about `Location`.

Critical rule:
- `Approximate location` / `Precise location` in Google Data Safety refer to **device/geographic location**, not a postal/shipping address.
- Loadify's Android manifest has no location permission and the app does not use GPS/current-device location for the marketplace flow.
- Therefore leave both Location checkboxes **unchecked**, unless new code/runtime evidence contradicts this.

A shipping/billing address belongs under **Personal info → Address**, not `Location`.

### Data types that still need final repo-grounded verification before selection
Do not blindly copy an old generic marketplace list. Verify each against current Android/runtime/SDK behaviour and Google definitions.

Strong current candidates from repo/product behaviour include:
- Personal info: Name, Email address, User IDs, Address, Phone number;
- Financial info: Purchase history;
- Messages: Other in-app messages;
- Photos and videos: Photos, because sellers/product profiles can upload images;
- App activity / Other UGC as applicable to saved searches, reviews/listings and interaction records;
- App info/performance: Crash logs only if the actual Android/runtime diagnostic stack sends them;
- Device or other IDs: likely due FCM/push tokens / Firebase identifiers, but verify against the exact Android build and Google SDK disclosure rules.

Two major caution points:
1. **Do not equate “we do not store card numbers” with “card/payment data never needs disclosure”.** Google Data Safety covers data collected by SDKs/WebViews too. Inspect the exact Stripe checkout path and official Google exemptions before deciding the card/payment-related boxes.
2. **Do not declare diagnostics, search history or device IDs merely because they sound plausible.** Confirm actual code/SDK behaviour first.

Repo evidence already confirms shipping/billing addresses are stored in buyer profiles and used in checkout/order logic.

---

## 8. PRIVACY POLICY STATUS

Production privacy page:
`https://loadifymarket.co.uk/privacy`

At checkpoint time the current repo still shows:
`Last updated: 19 March 2026`

The user supplied a rewritten Romanian privacy-policy draft during the Play flow, but that draft must not be treated as already deployed or fully reconciled.

Before final Data Safety submission, audit the actual public Privacy Policy against:
- Firebase / FCM;
- Supabase;
- Stripe payment processing;
- account and profile data;
- shipping/billing addresses;
- messages/chat;
- product/profile images and reviews/UGC;
- push tokens/device identifiers;
- diagnostics/crash reporting if used;
- account deletion and lawful retention.

Do not change Stripe while doing this audit.

---

## 9. OTHER PLAY DECLARATIONS STILL TO COMPLETE / VERIFY

Dashboard earlier showed the following still incomplete or needing verification:
- Target audience;
- Data safety;
- Government apps;
- Financial features;
- Health;
- Select app category and contact details;
- Store Listing.

Known likely answers, subject to checking the exact current form:
- Government app: **No**
- Health app/features: **No / none**
- Ads: already completed as **No**
- Category: **Shopping**
- Financial Features: likely certify **none of the listed regulated financial features**, but inspect the current questionnaire before saving; ordinary checkout for physical goods is not automatically a banking/financial-service feature.

Reviewer sign-in details were previously completed and verified. Never expose or repeat the reviewer password.

---

## 10. STORE / ANDROID FACTS TO PRESERVE

- App is for physical goods only in the Google Play build.
- Do not describe digital services/digital goods as purchasable in-app.
- Store description should reflect buyers + sellers under one account.
- Privacy policy URL: `https://loadifymarket.co.uk/privacy`
- Account deletion URL: `https://loadifymarket.co.uk/delete-account`
- Support contact: `contact@loadifymarket.co.uk`
- Android target SDK: 36.
- Old versionCode 1 AAB predated the latest physical-goods/UGC compliance fixes.
- Repo now has versionCode 2 merged; verify the actual Internal Testing artifact and signing before final submission.

---

## 11. REMAINING TECHNICAL/POLICY CHECKS BEFORE FINAL SEND FOR REVIEW

1. Complete Data Safety from Step 3 onward with repo/SDK evidence.
2. Verify the public privacy policy is consistent with the Data Safety answers.
3. Verify UGC Terms acceptance exists before users create/upload UGC.
4. Verify prohibited-items policy/enforcement covers Play-relevant prohibited marketplace items.
5. Verify the actual versionCode 2 AAB is uploaded to Internal Testing and contains the latest source changes.
6. Review Play warnings for native debug symbols / deobfuscation; treat them correctly as warnings unless Play blocks submission.
7. Complete Government / Financial features / Health / category / Store Listing.
8. Review Publishing overview for all pending changes.
9. Immediately before final **Send for review**, tell Daniel exactly what will be submitted and obtain explicit confirmation.

---

## 12. COMMUNICATION STYLE FOR THE NEXT CHAT

Daniel is frustrated by contradictory answers. Avoid speculative checkbox advice.

For each screen:
- read the exact question;
- say **BIFEAZĂ X** or **NU BIFA X**;
- give one short reason tied to Loadify's actual implementation;
- if evidence is incomplete, say what is unverified instead of guessing;
- do not alternate between answers without explicitly explaining what new evidence changed the conclusion.

Preferred language: Romanian.

---

## 13. SHORT RESUME COMMAND

If Daniel opens a new chat, the assistant should first retrieve and read:

`docs/checkpoints/LOADIFY_GOOGLE_PLAY_CONSOLE_CONTINUATION_CHECKPOINT_2026-09-09.md`

from repository:

`LoadifyMarketLTD/loadifymarket.co.uk`

Then continue with the current Google Play screen, beginning with the unfinished **Data Safety** work rather than repeating completed Content ratings.
