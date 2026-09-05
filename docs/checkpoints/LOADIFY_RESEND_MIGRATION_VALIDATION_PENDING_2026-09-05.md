# Validation pending

`RESEND_API_KEY` is now configured in Netlify as a secret for Functions + Runtime across Production, Deploy Previews, Branch Deploys, and Preview Server / Agent Runners.

A fresh Deploy Preview is intentionally being triggered from this branch so the Resend migration is validated against the post-secret configuration before any merge to Production.

Production remains unchanged until the fresh preview is READY and the real email delivery smoke test is completed.
