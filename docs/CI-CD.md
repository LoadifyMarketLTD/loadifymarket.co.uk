# CI/CD — Loadify Market

This document describes the Continuous Integration and Continuous Deployment strategy for the Loadify Market platform.

---

## 1. Branching strategy

| Branch | Purpose | Deploy |
|---|---|---|
| `main` | Production | Manual approval (Netlify) |
| `develop` | Staging | Auto on push (Netlify preview) |
| `feature/*` | Development | Auto PR preview (Netlify) |
| `copilot/*` | Copilot agents | Auto PR preview (Netlify) |

Rules:
- Direct pushes to `main` are blocked; changes go through a pull request.
- Merging to `main` requires the CI pipeline to pass (all jobs green).

---

## 2. CI pipeline (GitHub Actions)

See `.github/workflows/ci.yml` for the full configuration.

### Jobs (run in order)

```
lint ─┐
      ├──► build (only if all three pass)
typecheck ─┤
      │
test ─┘
```

| Job | Command | Purpose |
|---|---|---|
| `lint` | `npm run lint` | ESLint — catches style and logic issues |
| `typecheck` | `npx tsc -b --noEmit` | TypeScript — catches type errors without producing output |
| `test` | `npm test` | Vitest unit tests |
| `build` | `npm run build` | Production Vite build — confirms the app compiles and bundles cleanly |

The build job uploads `dist/` as a GitHub Actions artefact (retained 7 days) for inspection.

### Triggers

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Security

All jobs use `permissions: contents: read` — the minimum GITHUB_TOKEN permissions required. No job writes to the repository or publishes packages.

### Environment variables in CI

The build job uses stub values for Vite env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`) so the build succeeds without real secrets. Real secrets are managed exclusively in Netlify's environment variable dashboard.

---

## 3. Deployment (Netlify)

### Build configuration (`netlify.toml`)

The build command and output directory are defined in `netlify.toml`. **Do not set a build command in the Netlify UI** — it will override `netlify.toml` and may break the build.

### Environment variables (Netlify dashboard)

| Variable | Required | Used by |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Frontend + Netlify Functions |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Netlify Functions only |
| `STRIPE_SECRET_KEY` | ✅ | Netlify Functions |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Frontend |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `stripe-webhook` function |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | ✅ | `stripe-webhook` function |
| `SENDGRID_API_KEY` | Optional | `send-email` function |
| `VITE_SUPPORT_EMAIL` | Optional | Frontend contact forms |

### Deploy stages

```
Pull request opened
  └── Netlify preview deploy (unique URL per PR)

Push to develop
  └── Netlify staging deploy (stable preview URL)

Merge to main (after CI passes + approval)
  └── Netlify production deploy → https://loadifymarket.co.uk
```

### Rollback

Netlify keeps a full deploy history. To roll back:
1. Go to Netlify dashboard → Site → Deploys.
2. Select the previous successful deploy.
3. Click "Publish deploy".

---

## 4. Database migrations

Database migrations are **not** automated via CI/CD — they are applied manually through the Supabase SQL Editor.

**Convention:**
- Files live in `supabase/` and are named `NNN_description.sql` (e.g. `200_services_marketplace.sql`).
- Apply in ascending numeric order.
- Never modify a migration after it has been applied to production; add a new migration instead.
- Corrective/duplicate-number migrations may exist (for example, multiple fixes for the same RLS area); `VERIFY_migration_health.sql` is the canonical source of expected live state.

**Before applying a migration to production:**
1. Apply and test on the Supabase development project first.
2. Review for destructive operations (`DROP`, `ALTER … TYPE`, etc.).
3. Ensure RLS policies are present for every new table.
4. Run `supabase/VERIFY_migration_health.sql` on the target environment and save the full query output.
5. Treat a failed verification report as a hard release gate (no production deploy until fixed).

**Production release gate (mandatory):**
- Execute `/home/runner/work/loadifymarket.co.uk/loadifymarket.co.uk/supabase/VERIFY_migration_health.sql` in the live Supabase SQL editor.
- Archive the result output in release evidence (ticket/PR/deploy notes) so reviewers can confirm admin account, RLS/triggers, and rate-limit table health.
- If any check reports drift/failure, apply corrective migration(s) first, then re-run verification before release approval.

---

## 5. Running the full pipeline locally

```bash
# Install dependencies
npm install

# Lint
npm run lint

# Type check
npx tsc -b --noEmit

# Unit tests
npm test

# Production build (requires real env vars or stubs)
VITE_SUPABASE_URL=https://x.supabase.co \
VITE_SUPABASE_ANON_KEY=placeholder \
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder \
npm run build
```
