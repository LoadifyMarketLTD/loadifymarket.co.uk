# Hosted RFQ flag drift — 2026-09-04

Read-only hosted verification on project `fwdfpmfvgygvqciecesx` shows `platform_settings.feature_flags.rfqSystem=true` while current repository defaults/canonical fixed-price launch posture set `rfqSystem=false`.

The historical audit migration `20260902145500_restore_fixed_price_launch_rfq_flag.sql` is **not present in hosted migration history** and remains a valid recovery intent. It must not be applied blindly from the historical branch. Prepare/reconcile a current-main migration through the repository's normal migration-governance path, validate it, and only then consider hosted application as a production-sensitive step.

Classification: VALID RECOVERY DELTA / HOSTED CONFIG DRIFT CONFIRMED.
