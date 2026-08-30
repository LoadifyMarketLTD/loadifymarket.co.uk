# PR #618 — CI / Netlify billing blocker — 2026-08-30

Owner-confirmed infrastructure fact:

- GitHub CI / Netlify validation is currently unavailable because the relevant paid credits / payment capacity are exhausted.
- Current CI/Netlify failures must therefore **not** be treated as evidence that PR #618 source code is broken.
- Do not spend time rerunning CI or Netlify while billing/credits remain unavailable.

Validation strategy while external paid infrastructure is unavailable:

1. preserve PR #618 as OPEN / DRAFT / NOT MERGED;
2. validate source statically in-repo;
3. use the owner's local Windows checkout for executable gates when available;
4. run local `npm ci`, typecheck, lint, tests and production build;
5. restore the real ignored Firebase config without printing or committing it;
6. build the signed Capacitor Android update candidate with package `co.uk.loadifymarket.app`, `versionCode 2`, `versionName 1.0.1`;
7. compare signing identity against the historical installed/release lineage;
8. use `adb install -r` only after all prior gates pass; never uninstall to force installation;
9. complete startup/Firebase and application smoke tests before any merge/release decision.

This note supplements `docs/checkpoints/LOADIFY_ANDROID_LEGACY_APP_RECOVERY_CHECKPOINT_2026-08-30.md` and does not change the canonical rule that the historical installed Android app — not Mobile Web packaged into Capacitor — is the Android product baseline.
