# Netlify Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Prisma Schema Not Found" Error

**Symptoms:**
```
Error: Could not find Prisma Schema that is required for this command.
Command failed with exit code 1: npx prisma generate && npm run build
```

**Root Cause:**
The Netlify UI dashboard has a build command configured that overrides the correct `netlify.toml` configuration. This project **does not use Prisma** - it uses **Supabase** for the database.

**Solution:**
1. Go to your Netlify dashboard
2. Navigate to: **Site settings → Build & deploy → Continuous Deployment → Build settings**
3. Find the "Build command" field
4. **Clear/delete** the build command field (leave it empty)
5. Click "Save"
6. Trigger a new deploy

**Why this happens:**
- Netlify UI settings override `netlify.toml` configuration
- Someone may have mistakenly added `npx prisma generate && npm run build` to the UI
- The `netlify.toml` file already has the correct command: `npm run build`

**Verification:**
After clearing the UI setting, the build logs should show:
```
build.command from netlify.toml
────────────────────────────────────────────────────────────────
$ npm run build
```

---

### Issue: Build Command Not Using netlify.toml

**Symptoms:**
Build logs show `commandOrigin: ui` instead of `commandOrigin: config`

**Solution:**
1. Check Netlify UI: Site settings → Build & deploy → Build settings
2. Ensure build command field is **empty**
3. Ensure publish directory is set to `dist`
4. Let `netlify.toml` control the build configuration

---

### Issue: Environment Variables Not Working

**Symptoms:**
- Supabase connection fails
- Stripe integration not working
- SendGrid emails not sending

**Solution:**
1. Go to: Site settings → Environment variables
2. Verify all required variables are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `SENDGRID_API_KEY`
3. After adding/updating variables, trigger a new deploy

---

### Issue: Functions Not Working

**Symptoms:**
- Stripe checkout fails
- Webhooks not processing
- Invoice generation fails

**Solution:**
1. Check function logs: Site → Functions → Select function → Logs
2. Verify environment variables are set correctly
3. Check function timeout settings (default: 10s, can increase to 26s)
4. Verify function paths in `netlify.toml` match actual files

---

### Issue: 404 on Page Refresh

**Symptoms:**
- Homepage works
- Navigation works
- Direct URL or refresh shows 404

**Solution:**
- This is already handled in `netlify.toml` with SPA redirect
- If still occurring, verify the redirects section exists:
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
- Clear browser cache
- Verify deploy succeeded without errors

---

## Correct Netlify Configuration

### netlify.toml (Already Configured)
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
```

### Netlify UI Settings (Should Be Empty)
- **Build command:** (empty - uses netlify.toml)
- **Publish directory:** `dist`
- **Base directory:** (empty)

### Required Environment Variables
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete list.

---

## Build Process

### Expected Build Output
```
1. Dependencies installation (npm install)
2. TypeScript compilation (tsc -b)
3. Vite build (vite build)
4. Output to dist/ directory
```

### Build Time
- Normal: 1-3 minutes
- If longer, check for:
  - Large dependencies
  - TypeScript errors
  - Network issues

---

## Quick Deployment Checklist

Before deploying:
- [ ] All environment variables set in Netlify
- [ ] Build command field in UI is **empty**
- [ ] Publish directory is set to `dist`
- [ ] `netlify.toml` is in repository root
- [ ] Node version is 20+ (set in netlify.toml)

After successful deploy:
- [ ] Test homepage loads
- [ ] Test navigation works
- [ ] Test direct URLs work (no 404)
- [ ] Test user registration
- [ ] Test product listing
- [ ] Test checkout flow
- [ ] Check function logs for errors

---

## Getting Help

### Check Logs
1. **Deploy logs:** Deploys → Select deploy → View logs
2. **Function logs:** Functions → Select function → View logs
3. **Analytics:** Analytics → Performance metrics

### Common Log Locations
- Build errors: Deploy logs
- Runtime errors: Browser console (F12)
- Function errors: Function logs
- API errors: Supabase Dashboard → Logs

### Support Resources
- **Email:** loadifymarket.co.uk@gmail.com
- **Documentation:** See all MD files in repository
- **Netlify Docs:** https://docs.netlify.com
- **Supabase Docs:** https://supabase.com/docs

---

**Last Updated:** January 3, 2026  
**Version:** 1.0.0
