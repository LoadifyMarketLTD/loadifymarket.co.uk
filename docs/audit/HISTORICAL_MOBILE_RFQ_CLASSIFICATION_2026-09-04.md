# Historical mobile + RFQ classification — 2026-09-04

## Mobile smoke
`audit/full-platform-e2e-20260903` adds `e2e/mobile-smoke.spec.ts` plus a Pixel 5 Playwright project. Current main has only the desktop Chromium project and no equivalent horizontal-overflow/mobile guest-auth smoke file. Classification: **VALID RECOVERY DELTA**, but recover in the later global/mobile certification domain rather than merging the historical branch.

## RFQ launch flag
Current repository canonical posture is `rfqSystem=false` (including `supabase/596_disable_rfq_for_fixed_price_launch.sql` and Admin defaults), but read-only hosted verification shows the live `platform_settings.feature_flags.rfqSystem` is currently `true`. The historical `20260902145500_restore_fixed_price_launch_rfq_flag.sql` is not in hosted migration history. Classification: **VALID RECOVERY INTENT / HOSTED CONFIG DRIFT CONFIRMED**. Production mutation is intentionally not executed from the historical branch; reconcile through current-main migration governance first.
