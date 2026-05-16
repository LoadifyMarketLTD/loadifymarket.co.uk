# Loadify Market — Full Technical Audit: Onboarding / Auth / Approval Flow

**Generated:** 2026-03-24  
**Scope:** Buyer registration, Seller registration, Login, Role selection, Admin access, Seller approval, Onboarding steps, Redirect logic, Database structure, Route map.

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [User Types / Roles](#2-user-types--roles)
3. [Create Account / Signup Flow](#3-create-account--signup-flow)
4. [Seller Approval Flow](#4-seller-approval-flow)
5. [Buyer Onboarding Flow](#5-buyer-onboarding-flow)
6. [Admin Access / Approval Area](#6-admin-access--approval-area)
7. [Onboarding Flow](#7-onboarding-flow)
8. [Redirect Logic After Login / Signup](#8-redirect-logic-after-login--signup)
9. [Database / Supabase Structure](#9-database--supabase-structure)
10. [Route Map](#10-route-map)
11. [Summary of Gaps and Issues](#11-summary-of-gaps-and-issues)

---

## 1. Authentication Flow

### 1.1 Signup / Registration

| Item | Detail |
|------|--------|
| **File** | `src/pages/pixel-perfect/Signup.tsx` + `netlify/functions/register.ts` |
| **Method** | Email + password only |
| **Social login** | Google and Apple buttons present but display a "Coming soon" toast — **not implemented** |
| **Route** | `/signup` and `/register` (both map to same component — `src/App.tsx` lines 233-234) |
| **Status** | Active and functional |

**How it works:**

1. User fills in: Full Name, Company (optional), Email, Password.
2. On submit, `Signup.tsx` splits the full name into `firstName`/`lastName` and calls `POST /.netlify/functions/register` with:
   ```json
   { "firstName": "...", "lastName": "...", "email": "...", "password": "...", "role": "buyer" }
   ```
3. The `company` field collected in the UI form is **never sent to the API** — it is silently discarded.
4. `role` is **hardcoded to `"buyer"`** in the Signup component (line 42 of Signup.tsx). There is no seller registration path from this page.
5. `register.ts` calls `supabase.auth.admin.createUser({ …, email_confirm: true })` — the Admin API bypasses Supabase's client-side email rate limit.
6. `email_confirm: true` marks the email as verified immediately. **No confirmation email is sent.**
7. After auth user creation, a row is inserted into `public.users` with role `"buyer"`.
8. The DB trigger `trg_new_user_profile` fires and creates a `buyer_profiles` row automatically.
9. On success, the UI shows a toast "Account created! Check your email…" and navigates to `/login`. The toast message is misleading — there is no verification email.

**Critical issue:** Multiple links across the site point to `/register?type=seller` (in `HeroSection.tsx`, `WhySellSection.tsx`, `RequireSeller.tsx`, `SellerGuidelinesPage.tsx`, `App.tsx` redirect alias). However, `Signup.tsx` **does not read the `?type` query parameter**. Navigating to `/register?type=seller` opens the exact same signup form that creates a buyer account. There is no seller-specific registration UI.

---

### 1.2 Login

| Item | Detail |
|------|--------|
| **File** | `src/pages/pixel-perfect/Login.tsx` |
| **Method** | `supabase.auth.signInWithPassword({ email, password })` (client-side) |
| **Social login** | Google and Apple buttons present — "Coming soon" toast only, **not implemented** |
| **Route** | `/login` |
| **Status** | Active and functional |

**How it works:**

1. User enters email and password.
2. Calls `supabase.auth.signInWithPassword()` directly from the browser.
3. On success, fetches `role` from `public.users` table.
4. Redirects based on role:
   - `seller` → `/seller`
   - `admin` → `/admin`
   - all others → `/dashboard`
5. Honours a `?next=<url>` query parameter if present (used by `RequireAuth` guard).

**Note:** There is a `useEffect` in `Login.tsx` that also handles already-logged-in users (reads from `useAuthStore`) and redirects them immediately when the page mounts.

---

### 1.3 Forgot Password

| Item | Detail |
|------|--------|
| **File** | `src/pages/pixel-perfect/ForgotPassword.tsx` |
| **Method** | `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })` |
| **Route** | `/forgot-password` |
| **Status** | Active and functional |

Sends a Supabase password reset email. Redirects to `/reset-password` with a token in the URL hash.

---

### 1.4 Reset Password

| Item | Detail |
|------|--------|
| **File** | `src/pages/pixel-perfect/ResetPassword.tsx` |
| **Method** | `supabase.auth.updateUser({ password })` |
| **Route** | `/reset-password` |
| **Status** | Active and functional |

Listens for the `PASSWORD_RECOVERY` auth event (token in URL hash). Shows a form to set a new password. Redirects to `/login` after 3 seconds on success.

---

### 1.5 Logout

Logout is handled inline in each shell component:

| Shell | File |
|-------|------|
| Seller shell | `src/pages/pixel-perfect/seller/SellerShell.tsx` (line 97) |
| Admin shell | `src/pages/pixel-perfect/admin/AdminShell.tsx` (line 91) |
| Buyer shell | `src/pages/pixel-perfect/buyer/BuyerShell.tsx` (line 87) |

All three call `supabase.auth.signOut()` then `logout()` (clears Zustand store) then navigate to `/login`.

---

### 1.6 Session Persistence

| Item | Detail |
|------|--------|
| **File** | `src/App.tsx` (lines 133–199) |
| **Mechanism** | Supabase SDK persists JWT in localStorage. On app load, `supabase.auth.getSession()` is called. `supabase.auth.onAuthStateChange()` listener keeps the store up to date. |
| **User store** | `src/store/index.ts` — Zustand store (`useAuthStore`). Contains `user`, `isLoading`, `setUser`, `logout`. **Not persisted to localStorage** (no `persist` middleware on auth store). |
| **Fallback** | If `public.users` row is missing, `App.tsx` constructs a minimal User object from `auth.user_metadata` (role defaults to `"buyer"`). |

---

### 1.7 Auth Guards / Route Protection

Three guard components exist:

| Component | File | Protects | Redirect if unauthorized |
|-----------|------|----------|--------------------------|
| `RequireAuth` | `src/components/auth/RequireAuth.tsx` | Any logged-in user | Redirects to `/login?next=<current-path>` |
| `RequireSeller` | `src/components/auth/RequireSeller.tsx` | seller or admin roles + `isApproved=true` | Shows inline error card (not a redirect) |
| `RequireAdmin` | `src/components/auth/RequireAdmin.tsx` | admin role | Shows inline "Access Denied" card (not a redirect) |

All guards nest `RequireAuth` so unauthenticated users always get redirected to `/login`.

---

### 1.8 Resend Verification

| File | `netlify/functions/resend-verification.ts` |
|------|--------------------------------------------|
| Called from | `src/pages/AdminSellerDetailPage.tsx` (admin action only) |
| Status | Exists but limited — since `email_confirm: true` is used during registration, all users are verified immediately. This endpoint exists for admin use but is not surfaced anywhere in the main signup flow. |

---

## 2. User Types / Roles

### 2.1 Roles defined in code

| Role | Where defined | Used for |
|------|--------------|----------|
| `guest` | `users.role` constraint in DB | Not actively used in routing |
| `buyer` | `users.role` constraint in DB | Default role. Access to `/dashboard/*` and `/pp/buyer/*` |
| `seller` | `users.role` constraint in DB | Access to `/seller/*` and `/pp/seller/*` (subject to `isApproved`) |
| `admin` | `users.role` constraint in DB | Access to `/admin/*` and `/pp/admin/*` |
| `owner` | Deprecated legacy value (no longer active) | Removed from active role model; use `admin` |

**Source:** `src/types/index.ts` line 1, `supabase/00_consolidated_schema.sql` lines 95-96.

There is also a `marketplaceRole` column (values: `carrier`, `broker`, `seller`) separate from the user `role`. This is used for seller sub-classification, not for route protection. It appears in seller_profiles and on product listings.

### 2.2 Where roles are stored

- `public.users.role` — the primary role field (TEXT, NOT NULL, DEFAULT `'buyer'`).
- `auth.users.user_metadata.role` — also stored in Supabase auth metadata at registration time (written by `register.ts`). Used as a fallback if the `public.users` row is missing.

### 2.3 How roles are assigned

- At registration via `register.ts`: accepted roles are `'buyer'` or `'seller'` (validated server-side). However, the UI always sends `role: "buyer"` (see Section 1.1).
- Admin can toggle user `isActive` via `AdminUsers.tsx` but **there is no UI to change a user's role**. Role promotion (e.g. buyer → seller, or promoting to admin) requires direct database access.
- Legacy SQL comments may still mention `owner`, but the active runtime role model is `buyer | seller | admin`.

### 2.4 Role access functions

`src/lib/roleUtils.ts`:
- `hasAdminAccess(user)` → `role === 'admin'`
- `hasSellerAccess(user)` → `role === 'seller' || role === 'admin'`

Mirrors RLS helper functions in the database (`is_admin_or_owner()`, `is_seller()`).

---

## 3. Create Account / Signup Flow

### Step-by-step

```
1. User navigates to /signup or /register (both point to Signup.tsx)
2. User fills in: Full Name, Company (ignored), Email, Password
3. User clicks "Create Account"
4. Signup.tsx sends POST to /.netlify/functions/register with:
     { firstName, lastName, email, password, role: "buyer" }
   NOTE: `company` field is NOT sent. `role` is always "buyer".
5. register.ts calls supabase.auth.admin.createUser({ email_confirm: true })
6. Auth user is created. Email is marked verified immediately. No email sent.
7. register.ts inserts row into public.users { id, email, firstName, lastName, role: "buyer", isEmailVerified: true }
8. DB trigger trg_new_user_profile fires → inserts row into buyer_profiles(userId)
9. register.ts returns HTTP 200 { success: true, userId }
10. Signup.tsx shows toast: "Account created! Check your email to verify your account"
    (misleading — no email is sent)
11. Signup.tsx navigates to /login
12. User signs in via Login.tsx → redirected to /dashboard (buyer default)
```

### What happens if role=seller is passed to register.ts

`register.ts` does handle `role: "seller"` (lines 175-193):
1. Users row created with `role: "seller"`
2. DB trigger creates `seller_profiles` and `seller_stores` rows
3. `register.ts` additionally upserts `seller_profiles.fullName` and `seller_profiles.storeName`
4. `isApproved` defaults to `FALSE` in `seller_profiles`

**BUT:** The Signup.tsx page never passes `role: "seller"`. This path is only accessible if calling the register endpoint directly, or if the Signup.tsx was modified.

---

## 4. Seller Approval Flow

### 4.1 Is seller approval implemented?

**Yes** — it is partially implemented. The data model, admin UI, and route guard all exist. However, the seller registration path to create a seller account is missing from the UI.

### 4.2 Seller approval data model

| Table | Column | Type | Values | Purpose |
|-------|--------|------|--------|---------|
| `seller_profiles` | `isApproved` | BOOLEAN | `true` / `false` | Primary approval gate |
| `seller_profiles` | `verificationStatus` | TEXT | `pending` / `verified` / `rejected` / `suspended` | Detailed status |
| `seller_profiles` | `verifiedAt` | TIMESTAMPTZ | nullable | Timestamp of verification |
| `seller_profiles` | `suspensionReason` | TEXT | nullable | Reason for suspension |
| `seller_profiles` | `listingLimit` | INTEGER | default 5 / NULL for verified | Listing cap for unverified sellers |

Default state on seller creation: `isApproved = FALSE`, `verificationStatus = 'pending'`.

DB trigger `handle_seller_verification_upgrade()` (defined in `00_consolidated_schema.sql` lines 219-234):
- When `verificationStatus` changes to `'verified'`: sets `isVerified = TRUE`, `listingLimit = NULL` (unlimited), `verifiedAt = NOW()`
- When `verificationStatus` changes to `'suspended'`: sets `isVerified = FALSE`

### 4.3 Admin approval UI

**File:** `src/pages/pixel-perfect/admin/AdminApprovals.tsx`

Features:
- Lists all users with `role = 'seller'` joined with `seller_profiles`
- Tabbed view: Pending / Approved / Rejected / All
- Search by name, company, email
- Per-row actions: Approve (✓), Reject (✗), View Details (👁)
- Approve action: `UPDATE seller_profiles SET isApproved = true, verificationStatus = 'verified'`
- Reject action: `UPDATE seller_profiles SET isApproved = false, verificationStatus = 'rejected'`
- "View Full Profile" link → `/admin/sellers/:userId` (AdminSellerDetailPage.tsx)

**Partial issue:** The approval action in `AdminApprovals.tsx` sets `verificationStatus = 'verified'` directly via Supabase client. This bypasses the DB trigger `handle_seller_verification_upgrade` which fires on `BEFORE UPDATE` — the trigger would also set `isVerified = TRUE` and `listingLimit = NULL`. The direct client update should be fine as the trigger fires on the update, but it's worth noting the redundancy.

**Missing feature:** There is no email notification sent to the seller when they are approved or rejected. The `send-email` Netlify function exists but is not called from `AdminApprovals.tsx`.

### 4.4 Pending approval state (RequireSeller guard)

**File:** `src/components/auth/RequireSeller.tsx`

When a seller with `isApproved = false` tries to access a protected seller route:
- Guard queries `seller_profiles.isApproved` for the current user
- Shows inline card: "Account Pending Approval — Our team will assess your application and notify you by email once it has been approved — usually within 1–2 business days."
- Links to `/contact` (Contact Support) and `/` (Back to Home)

There is **no dedicated pending approval URL** (e.g. `/seller/pending`). The pending state is shown inline wherever the seller tries to navigate.

### 4.5 Approval notes / rejection notes

**Missing.** The `seller_profiles` table has no `approvalNote` or `rejectionReason` column at the admin-approval level. There is a `suspensionReason` column but it is for suspension, not for approval/rejection notes. The `seller_verifications` table has `rejectionReason` for document review but this is separate from the overall approval flow.

### 4.6 What can a seller do before approval?

- Sign in (if they somehow have `role = 'seller'`)
- Access `/login` and see redirect to `/seller`
- The `RequireSeller` guard blocks all `/seller/*` and `/pp/seller/*` routes and shows the pending message instead
- Cannot list products, view seller dashboard, view orders, etc.

### 4.7 What happens after approval?

- `isApproved = true` is set in `seller_profiles`
- `verificationStatus = 'verified'` is set
- On next visit to any `/seller/*` route: `RequireSeller` fetches `isApproved`, gets `true`, renders the page normally
- Seller gains full access to: dashboard, products, orders, shipments, returns, RFQ, reviews, profile, settings

### 4.8 Admin notification of new seller registration

**Missing.** There is no mechanism to alert admins when a new seller registers. The Admin Dashboard (`AdminDashboard.tsx`) shows a count of `pendingSellers` and a "Recent Seller Applications" table which updates when the page is loaded. There is no push notification, email alert, or badge system.

---

## 5. Buyer Onboarding Flow

### 5.1 Does a buyer need admin approval?

**No.** Buyers are created immediately with `isApproved` not applicable to their flow. There is no approval step for buyers. The `RequireAuth` guard (used for `/dashboard/*`) only checks that the user is logged in.

### 5.2 Buyer signup directly?

Yes. The standard `/signup` flow creates a buyer. After login, buyer is redirected to `/dashboard`.

### 5.3 Buyer profile data collected

At signup: firstName, lastName, email (company field collected in UI but discarded).

After signup in the `buyer_profiles` table:
- `shippingAddress` (JSONB, nullable)
- `billingAddress` (JSONB, nullable)
- `preferences` (JSONB, nullable)

The buyer profile page `src/pages/pixel-perfect/buyer/BuyerProfile.tsx` and addresses page `BuyerAddresses.tsx` allow buyers to fill in address info after registration.

### 5.4 Buyer dashboard

**File:** `src/pages/pixel-perfect/buyer/BuyerDashboard.tsx`  
**Route:** `/pp/buyer` (primary) and `/dashboard` (classic layout)

Shows: Total Orders, Wishlist count, Total Spent, Recent Orders, Wishlist preview. All data fetched live from Supabase.

### 5.5 Onboarding wizard for buyers?

**None.** There is no onboarding wizard, guided setup, or profile completion flow for buyers. After signup, buyers land directly on the dashboard with no guided steps.

### 5.6 Buyer flow separate from seller flow?

Yes — at the routing level:
- Buyers access `/dashboard/*` or `/pp/buyer/*` (guarded by `RequireAuth`)
- Sellers access `/seller/*` or `/pp/seller/*` (guarded by `RequireSeller`)
- The two shells (`BuyerShell`, `SellerShell`) are entirely separate

However, the signup page creates all users as buyers by default — there is no branching in the signup flow.

---

## 6. Admin Access / Approval Area

### 6.1 Where admin logs in

Same `/login` page as all users. After login, `Login.tsx` checks `users.role` and redirects `admin` to `/admin`.

### 6.2 Admin route protection

`RequireAdmin` component (`src/components/auth/RequireAdmin.tsx`):
- Wraps `RequireAuth` (redirects unauthenticated users to `/login`)
- Checks `hasAdminAccess(user)` which returns `true` for `role === 'admin'`
- If authenticated but not admin: shows inline "Access Denied" card (does NOT redirect)

### 6.3 Admin dashboard

**File:** `src/pages/pixel-perfect/admin/AdminDashboard.tsx`  
**Route:** `/pp/admin` (primary) and `/admin` (classic layout via AdminLayout)

Shows live data:
- Total Users count
- Total Products count
- Total Orders count
- Pending Approvals count (sellers with `isApproved = false`)
- Recent Seller Applications table (last 5 sellers by registration date)
- System alerts (pending sellers count, flagged listings count)

### 6.4 Approval queue

**File:** `src/pages/pixel-perfect/admin/AdminApprovals.tsx`  
**Route:** `/pp/admin/approvals` and `/admin/approvals`

Full featured approval queue (see Section 4.3 for details).

### 6.5 Can admin approve/reject users?

Yes — via `AdminApprovals.tsx` (approve/reject seller accounts) and `AdminUsers.tsx` (suspend/unsuspend any user).

### 6.6 Can admin edit onboarding status?

Partially. Admin can:
- Approve/reject seller (`isApproved`, `verificationStatus`) via `AdminApprovals.tsx`
- View/edit seller full profile via `AdminSellerDetailPage.tsx` (at `/admin/sellers/:id`)
- Set commission rate for a seller via `AdminSellerDetailPage.tsx`
- Toggle user `isActive` via `AdminUsers.tsx`

Admin **cannot** (missing features):
- Change a user's role from the UI
- Set individual onboarding step completion
- Add approval notes or rejection reasons

### 6.7 Owner bypass / master admin

The active role model is `buyer | seller | admin`. Legacy `owner` mentions are deprecated and should not be used for new users or policies.

### 6.8 AdminShell navigation items

`src/pages/pixel-perfect/admin/AdminShell.tsx`:
- Dashboard, Users, **Seller Approvals**, Products, Orders, Flagged/Reports, Analytics, Support, Settings

---

## 7. Onboarding Flow

### 7.1 Summary

**There is no multi-step onboarding wizard.** Neither buyers nor sellers have a guided onboarding flow, wizard, checklist, or progress tracker.

### 7.2 What exists for sellers post-approval

After a seller is approved, they can fill in their business details via:

**Seller Profile page** (`src/pages/pixel-perfect/seller/SellerProfile.tsx`):
- Business Name
- Contact Name
- Email, Phone, Website
- Company Number (`companyRegistrationNumber`)
- VAT Number (`vatNumber`)
- Business Address (address, city, postcode)
- Bio / Store description

This data is saved to `seller_profiles` and `seller_stores`. There is no "completion percentage" UI despite `profileCompleteness` existing as a column in `seller_profiles`.

**Seller Settings page** (`src/pages/pixel-perfect/seller/SellerSettings.tsx`):
- Notification preferences (stored in `localStorage` only, not DB)
- Password change
- **Stripe Connect onboarding** (calls `/.netlify/functions/connect-onboard` → redirects to Stripe hosted flow)

### 7.3 Stripe Connect onboarding

**Status: Implemented (backend), but only accessible after approval.**

`netlify/functions/connect-onboard.ts`:
- Creates a Stripe Express account for the seller
- Returns a Stripe AccountLink URL for the hosted Stripe onboarding flow
- After completion, redirects to `/seller?tab=payouts&connect=success`
- Stripe account status stored in `seller_profiles.stripeConnectStatus`: `null` / `'pending'` / `'restricted'` / `'active'`

`netlify/functions/connect-status.ts`:
- Fetches live status from Stripe, updates `seller_profiles.stripeConnectStatus`

There is **no gate** requiring sellers to complete Stripe onboarding before listing products. Products can be created regardless of `stripeConnectStatus`.

### 7.4 Document verification

**Status: Partially implemented (DB schema exists, no UI).**

The `seller_verifications` table stores verification documents with `docType` values: `identity`, `business_registration`, `vat_certificate`, `proof_of_address`, `other`.

However, **there is no UI for sellers to upload documents**, and **there is no UI for admins to review uploaded documents**. The table exists in the schema but is unused by any frontend page.

### 7.5 Onboarding completion flags

`seller_profiles.profileCompleteness` (INTEGER, default 0) exists in the DB but:
- Nothing in the frontend reads or displays this value
- Nothing in the frontend writes to this value
- No calculation logic for it exists anywhere

### 7.6 Listing limit

`seller_profiles.listingLimit` defaults to 5 (for unverified sellers). When `verificationStatus` is set to `'verified'`, the DB trigger sets `listingLimit = NULL` (unlimited). However:
- The product form (`ProductFormPage.tsx`) does not check or enforce `listingLimit`
- There is no UI message warning a seller when they are near their limit

### 7.7 What onboarding steps exist

| Step | Exists | Connected to DB | Working |
|------|--------|-----------------|---------|
| Seller signs up | **No** — UI always creates buyers | — | ❌ |
| Admin approves seller | Yes | Yes | ✅ |
| Seller fills business profile | Yes (SellerProfile.tsx) | Yes (seller_profiles) | ✅ |
| Document upload / KYC | DB schema only | No UI | ❌ |
| Stripe Connect setup | Yes (SellerSettings.tsx) | Yes (seller_profiles.stripeConnectStatus) | ✅ |
| Profile completeness tracker | Column in DB | Not connected to frontend | ❌ |
| Listing limit enforcement | Column in DB | Not enforced in frontend | ❌ |

---

## 8. Redirect Logic After Login / Signup

### 8.1 Decision tree

```
User submits login form (Login.tsx)
  ↓
supabase.auth.signInWithPassword()
  ↓
  ├─ Error → Show error on form (stay on /login)
  └─ Success → Check ?next= param
       ├─ ?next= present → navigate to ?next= URL
       └─ ?next= absent → Fetch public.users.role
            ├─ role === 'seller' → /seller
            ├─ role === 'admin' → /admin
            └─ any other role (buyer, guest, unknown) → /dashboard
```

```
User completes signup (Signup.tsx)
  ↓
POST /.netlify/functions/register
  ├─ Error → Show error on form (stay on /signup)
  └─ Success → navigate('/login')
       [User must manually sign in — no auto-login after registration]
```

### 8.2 What happens in each scenario

| Scenario | Outcome |
|----------|---------|
| Buyer logs in | → `/dashboard` |
| Seller logs in (approved) | → `/seller` |
| Seller logs in (pending/unapproved) | → `/seller` (redirect happens), then `RequireSeller` shows inline "Pending Approval" card |
| Seller logs in (rejected) | → `/seller` (redirect happens), then `RequireSeller` shows inline "Pending Approval" card (same as unapproved — rejected sellers see identical message) |
| Admin/Owner logs in | → `/admin` |
| Unauthenticated user visits protected route | → `/login?next=<original-path>` |
| Buyer visits `/seller/*` | → `RequireSeller` shows "Seller Account Required" card |
| Non-admin visits `/admin/*` | → `RequireAdmin` shows "Access Denied" card |
| User with missing `public.users` row | App constructs user from auth metadata, role defaults to `'buyer'` |

**Issue:** Rejected sellers see the same "pending approval" message as pending sellers. There is no differentiated message for rejected accounts. The `RequireSeller` guard checks `isApproved` (boolean) but doesn't distinguish between `verificationStatus = 'pending'` and `verificationStatus = 'rejected'`.

---

## 9. Database / Supabase Structure

**Primary schema file:** `supabase/00_consolidated_schema.sql`

### 9.1 `users` table

```sql
id               UUID  PRIMARY KEY REFERENCES auth.users(id)
email            TEXT  UNIQUE NOT NULL
role             TEXT  NOT NULL DEFAULT 'buyer'
                   CHECK (legacy schema note; active app roles are buyer/seller/admin)
marketplaceRole  TEXT  CHECK (value IN ('carrier','broker','seller'))
firstName        TEXT
lastName         TEXT
phone            TEXT
avatarUrl        TEXT
isEmailVerified  BOOLEAN  DEFAULT FALSE
isActive         BOOLEAN  DEFAULT TRUE
createdAt        TIMESTAMPTZ
updatedAt        TIMESTAMPTZ
```

Used by: every auth guard, login redirect, admin user management.

### 9.2 `buyer_profiles` table

```sql
userId          UUID PRIMARY KEY REFERENCES users(id)
shippingAddress JSONB
billingAddress  JSONB
preferences     JSONB
createdAt       TIMESTAMPTZ
updatedAt       TIMESTAMPTZ
```

Auto-created for buyers/guests by DB trigger. Very minimal — no onboarding completion flag.

### 9.3 `seller_profiles` table

```sql
userId                    UUID PRIMARY KEY REFERENCES users(id)
fullName                  TEXT
storeName                 TEXT
phone                     TEXT
country                   TEXT
businessName              TEXT
vatNumber                 TEXT
companyRegistrationNumber TEXT
businessAddress           JSONB
verificationStatus        TEXT  DEFAULT 'pending'
                            CHECK (value IN ('pending','verified','rejected','suspended'))
verifiedAt                TIMESTAMPTZ
suspensionReason          TEXT
stripeAccountId           TEXT
stripeConnectStatus       TEXT  CHECK (value IN ('pending','restricted','active'))  -- added by 95_stripe_connect.sql
payoutDetails             JSONB
isApproved                BOOLEAN  DEFAULT FALSE
commission                DECIMAL  DEFAULT 7.00
listingLimit              INTEGER  DEFAULT 5
rating                    DECIMAL  DEFAULT 0.00
totalSales                INTEGER  DEFAULT 0
salesCount                INTEGER  DEFAULT 0
disputeRate               DECIMAL  DEFAULT 0.00
deliverySuccessRate       DECIMAL  DEFAULT 1.00
responseTimeHours         DECIMAL  DEFAULT 0.00
onTimeShipmentRate        DECIMAL  DEFAULT 100.00
marketplaceRole           TEXT  CHECK (value IN ('carrier','broker','seller'))
paymentBehaviour          TEXT  CHECK (value IN ('pays_on_time','sometimes_late','repeated_delays'))
isVerified                BOOLEAN  DEFAULT FALSE
profileCompleteness       INTEGER  DEFAULT 0
contactPhone              TEXT
createdAt                 TIMESTAMPTZ
updatedAt                 TIMESTAMPTZ
```

**Key columns for this audit:** `isApproved`, `verificationStatus`, `stripeConnectStatus`, `listingLimit`, `profileCompleteness`.

### 9.4 `seller_stores` table

```sql
userId           UUID PRIMARY KEY REFERENCES users(id)
storeName        TEXT
storeSlug        TEXT UNIQUE
storeLogo        TEXT
storeDescription TEXT
storeBanner      TEXT
socialLinks      JSONB
returnPolicy     TEXT
shippingPolicy   TEXT
isActive         BOOLEAN DEFAULT TRUE
createdAt        TIMESTAMPTZ
updatedAt        TIMESTAMPTZ
```

Auto-created for sellers by DB trigger. Stores the public-facing store data.

### 9.5 `seller_verifications` table

```sql
id              UUID PRIMARY KEY
sellerId        UUID REFERENCES users(id)
docType         TEXT CHECK (value IN ('identity','business_registration','vat_certificate','proof_of_address','other'))
fileUrl         TEXT
status          TEXT CHECK (value IN ('pending','approved','rejected'))
reviewedBy      UUID REFERENCES users(id)
reviewedAt      TIMESTAMPTZ
rejectionReason TEXT
uploadedAt      TIMESTAMPTZ
createdAt       TIMESTAMPTZ
updatedAt       TIMESTAMPTZ
```

**Status: Schema exists, no frontend implementation.** No document upload UI, no admin review UI.

### 9.6 `admin_actions` table

Exists in schema (`00_consolidated_schema.sql` line 987) for logging admin actions. Not referenced in any frontend component.

### 9.7 DB triggers relevant to this flow

| Trigger | Table | Effect |
|---------|-------|--------|
| `trg_new_user_profile` | `users (AFTER INSERT)` | Creates `buyer_profiles` for buyer/guest, creates `seller_profiles` + `seller_stores` for seller |
| `trg_seller_verification_upgrade` | `seller_profiles (BEFORE UPDATE)` | On `verificationStatus → 'verified'`: sets `isVerified=TRUE`, `listingLimit=NULL`, `verifiedAt=NOW()`. On `→ 'suspended'`: sets `isVerified=FALSE` |

### 9.8 RLS policies relevant to this flow

| Table | Policy | Rule |
|-------|--------|------|
| `seller_profiles` | SELECT | `USING (TRUE)` — publicly readable |
| `seller_profiles` | UPDATE | Owner of row OR admin role |
| `seller_profiles` | INSERT | Admin only |
| `seller_profiles` | DELETE | Admin only |
| `users` | Policies | Owner of row OR admin (from migration 100) |

**Key note:** `seller_profiles` SELECT is publicly readable (`USING TRUE`). This means any frontend code can read `isApproved` and `verificationStatus` without authentication — including the `RequireSeller` guard.

### 9.9 Schema / frontend consistency

| Item | Consistent? |
|------|------------|
| `seller_profiles.stripeConnectStatus` | Added in `95_stripe_connect.sql` — separate from consolidated schema. May not be in `00_consolidated_schema.sql`. Frontend reads/writes this column. |
| `seller_profiles.profileCompleteness` | In schema, not used in frontend |
| `seller_profiles.listingLimit` | In schema, not enforced in frontend |
| `seller_verifications` table | In schema, no frontend |
| `buyer_profiles` table | In schema, minimally used (BuyerAddresses page) |

---

## 10. Route Map

### 10.1 Public routes (no auth required)

| Route | Component | Status |
|-------|-----------|--------|
| `/` | `pixel-perfect/Index.tsx` | ✅ Working |
| `/login` | `pixel-perfect/Login.tsx` | ✅ Working |
| `/signup` | `pixel-perfect/Signup.tsx` | ✅ Working (creates buyers only) |
| `/register` | `pixel-perfect/Signup.tsx` | ✅ Working (alias for /signup) |
| `/forgot-password` | `pixel-perfect/ForgotPassword.tsx` | ✅ Working |
| `/reset-password` | `pixel-perfect/ResetPassword.tsx` | ✅ Working |
| `/catalog` | `pixel-perfect/Catalog.tsx` | ✅ Working |
| `/product/:id` | `pixel-perfect/ProductDetail.tsx` | ✅ Working |
| `/seller/:slug` | `SellerPublicProfilePage.tsx` | ✅ Working |
| `/track-order` | `TrackOrderPage.tsx` | ✅ Working |
| `/seller-guidelines` | `SellerGuidelinesPage.tsx` | ✅ Working |
| (various legal pages) | — | ✅ Working |

### 10.2 Buyer-protected routes (RequireAuth)

| Route | Component | Guard | Status |
|-------|-----------|-------|--------|
| `/pp/buyer` | `BuyerShell` + `BuyerDashboard` | RequireAuth | ✅ Working |
| `/pp/buyer/orders` | `BuyerOrders` | RequireAuth | ✅ Working |
| `/pp/buyer/wishlist` | `BuyerWishlist` | RequireAuth | ✅ Working |
| `/pp/buyer/addresses` | `BuyerAddresses` | RequireAuth | ✅ Working |
| `/pp/buyer/payments` | `BuyerPayments` | RequireAuth | ✅ Working |
| `/pp/buyer/reviews` | `BuyerReviews` | RequireAuth | ✅ Working |
| `/pp/buyer/profile` | `BuyerProfile` | RequireAuth | ✅ Working |
| `/pp/buyer/settings` | `BuyerSettings` | RequireAuth | ✅ Working |
| `/dashboard` | `BuyerLayout` + `BuyerDashboard` | RequireAuth | ✅ Working (classic layout) |
| `/dashboard/orders` | `BuyerOrders` | RequireAuth | ✅ Working |
| `/checkout` | `pixel-perfect/Checkout.tsx` | None | ✅ Working (public) |

### 10.3 Seller-protected routes (RequireSeller)

| Route | Component | Guard | Status |
|-------|-----------|-------|--------|
| `/pp/seller` | `SellerShell` + `SellerDashboard` | RequireSeller (+ isApproved) | ✅ Working |
| `/pp/seller/products` | `SellerProducts` | RequireSeller | ✅ Working |
| `/pp/seller/orders` | `SellerOrders` | RequireSeller | ✅ Working |
| `/pp/seller/shipments` | `SellerShipments` | RequireSeller | ✅ Working |
| `/pp/seller/returns` | `SellerReturns` | RequireSeller | ✅ Working |
| `/pp/seller/rfq` | `SellerRFQ` | RequireSeller | ✅ Working |
| `/pp/seller/reviews` | `SellerReviewsPage` | RequireSeller | ✅ Working |
| `/pp/seller/profile` | `SellerProfile` | RequireSeller | ✅ Working |
| `/pp/seller/settings` | `SellerSettings` (inc. Stripe Connect) | RequireSeller | ✅ Working |
| `/seller` | `SellerLayout` + `SellerDashboard` | RequireSeller | ✅ Working (classic layout) |
| `/seller/products/new` | `ProductFormPage` | RequireSeller | ✅ Working |
| `/seller/products/:id/edit` | `ProductFormPage` | RequireSeller | ✅ Working |

### 10.4 Admin-protected routes (RequireAdmin)

| Route | Component | Guard | Status |
|-------|-----------|-------|--------|
| `/pp/admin` | `AdminShell` + `AdminDashboard` | RequireAdmin | ✅ Working |
| `/pp/admin/users` | `AdminUsers` | RequireAdmin | ✅ Working |
| `/pp/admin/approvals` | `AdminApprovals` | RequireAdmin | ✅ Working |
| `/pp/admin/products` | `AdminProducts` | RequireAdmin | ✅ Working |
| `/pp/admin/orders` | `AdminOrders` | RequireAdmin | ✅ Working |
| `/pp/admin/flagged` | `AdminFlagged` | RequireAdmin | ✅ Working |
| `/pp/admin/reports` | `AdminReports` | RequireAdmin | ✅ Working |
| `/pp/admin/support` | `AdminSupport` | RequireAdmin | ✅ Working |
| `/pp/admin/settings` | `AdminSettings` | RequireAdmin | ⚠️ UI only — toggles not persisted to DB |
| `/admin` | `AdminLayout` + `AdminDashboard` | RequireAdmin | ✅ Working (classic layout) |
| `/admin/approvals` | `AdminApprovals` | RequireAdmin | ✅ Working |
| `/admin/sellers/:id` | `AdminSellerDetailPage` | RequireAdmin | ✅ Working |

### 10.5 Missing / broken routes

| Missing Route | Description |
|--------------|-------------|
| `/seller/apply` or `/register?type=seller` | **No seller signup page exists.** Links point here but the Signup page always creates buyers. |
| `/seller/pending` | No dedicated pending-approval page. State shown inline. |
| `/seller/onboarding` | No onboarding wizard exists. |
| Dedicated 404 for seller/buyer role mismatch | Guards show inline cards, not dedicated error pages. |

---

## 11. Summary of Gaps and Issues

### Critical Issues (Broken or Missing Features)

| # | Issue | Severity | Files Involved |
|---|-------|----------|---------------|
| 1 | **No seller signup path in UI.** All signups create buyers. `/register?type=seller` links exist but are ignored. | 🔴 Critical | `src/pages/pixel-perfect/Signup.tsx` |
| 2 | **Rejected sellers see same message as pending sellers.** `RequireSeller` checks `isApproved` (boolean) — it doesn't distinguish `rejected` from `pending`. | 🔴 Critical | `src/components/auth/RequireSeller.tsx` |
| 3 | **No email notification on approval/rejection.** Sellers are not notified when their account status changes. | 🔴 Critical | `src/pages/pixel-perfect/admin/AdminApprovals.tsx` |
| 4 | **Company field silently discarded.** UI collects it but never sends it to the register API. | 🟡 Medium | `src/pages/pixel-perfect/Signup.tsx` |
| 5 | **Misleading toast after signup.** Says "Check your email to verify your account" but `email_confirm: true` means no email is sent. | 🟡 Medium | `src/pages/pixel-perfect/Signup.tsx` |

### Missing Features

| # | Feature | Status |
|---|---------|--------|
| 6 | No admin notification when new seller registers | Missing |
| 7 | No role promotion UI (buyer → seller, seller → admin) | Missing |
| 8 | No approval notes / rejection reason field | Missing |
| 9 | No onboarding wizard for sellers post-approval | Missing |
| 10 | No document upload UI (KYC / verification documents) | Missing |
| 11 | `profileCompleteness` column unused in frontend | Missing |
| 12 | `listingLimit` column not enforced in product creation | Missing |
| 13 | AdminSettings feature toggles not persisted to DB | Missing |
| 14 | No post-signup auto-login (user must manually sign in after registration) | UX gap |

### Partial / Inconsistent Implementations

| # | Item | Notes |
|---|------|-------|
| 15 | Dual route variant for every dashboard (`/seller` + `/pp/seller`, `/admin` + `/pp/admin`, `/dashboard` + `/pp/buyer`) | Both work but create maintenance burden |
| 16 | `seller_verifications` table exists with full schema but has zero frontend implementation | DB schema exists, no UI |
| 17 | `stripeConnectStatus` added in a separate migration (`95_stripe_connect.sql`) rather than in consolidated schema | May cause migration ordering issues |
| 18 | Social login (Google/Apple) shows buttons with "Coming soon" toasts | UI present, feature absent |
| 19 | `admin_actions` audit log table exists but is never written to from any frontend action | DB exists, unused |
| 20 | No gate requiring Stripe Connect completion before a seller can list products | Stripe Connect is optional, not mandatory |
