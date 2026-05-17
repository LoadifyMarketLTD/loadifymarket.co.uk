# 🚀 TASK: GENERATE FULL MOBILE & WEB-MOBILE AUDIT PACKAGE

## 🎯 OBJECTIVE

Generate a complete audit-ready package for:

- Mobile App (APK)
- Web Mobile experience

This package will be used for a full UX/UI/Product audit.

---

# 🧱 1. APK BUILD (MANDATORY)

## ✅ ACTION
- Build latest APK from repository
- Use production config (fallback to staging if not available)

## ✅ OUTPUT

/artifacts/mobile-app-latest.apk

## ✅ INCLUDE METADATA

Create file:
/artifacts/mobile-app-info.txt

Content:
version:
commit hash:
build date:
environment (prod/staging):

---

# 🎥 2. MOBILE FLOWS

## ✅ REQUIRED FLOWS

### 🔹 HOME
- open app
- scroll homepage
- interact with UI

### 🔹 BUYER FLOW
- browse products
- open product
- add to cart (if possible)
- checkout navigation

### 🔹 SELLER FLOW
- dashboard
- products/orders

### 🔹 ADMIN FLOW
- admin dashboard
- key panels

---

## ✅ OUTPUT OPTIONS

OPTION A:
- Playwright video recording

OPTION B:
- screenshot sequences

OPTION C:
- component preview states

---

## ✅ OUTPUT FILES

/artifacts/mobile-flow-home.mp4 OR screenshots folder  
/artifacts/mobile-flow-buyer.mp4  
/artifacts/mobile-flow-seller.mp4  
/artifacts/mobile-flow-admin.mp4  

---

# 🌐 3. WEB MOBILE PREVIEW

## ✅ ACTION
- Deploy preview (Netlify / Vercel)

## ✅ OUTPUT

Preview URL:

## ✅ REQUIREMENTS
- responsive working
- tested at 375px and 390px

---

# 📸 4. WEB MOBILE FLOWS

## ✅ RECORD

- homepage scroll
- product page
- checkout
- dashboard

## ✅ OUTPUT

/artifacts/web-mobile-home.mp4  
/artifacts/web-mobile-product.mp4  
/artifacts/web-mobile-dashboard.mp4  

---

# 🔍 5. FINAL COLOR AUDIT

## ✅ RUN CHECKS

- forbidden hex colors
- inline styles
- background usage
- token usage

## ✅ OUTPUT

/artifacts/color-audit-final.txt

## ✅ FORMAT

TAILWIND CONFIG: PASS/FAIL  
HEX COLORS: PASS/FAIL  
INLINE STYLES: PASS/FAIL  
BACKGROUND SYSTEM: PASS/FAIL  
TOKENS USAGE: PASS/FAIL  

Remaining issues (if any)

---

# 🧬 6. DESIGN SYSTEM VALIDATION

## ✅ VERIFY

- tailwind config updated
- no hex in components
- no inline styles
- role accents present

## ✅ OUTPUT

/artifacts/design-system-check.txt

---

# 🧾 7. EXPORT CORE FILES

Include:

tailwind.config.ts  
src/index.css  
src/components/Header.tsx  
src/components/ProductCard.tsx  
src/layouts/MainLayout.tsx  

---

# ⚠️ 8. KNOWN LIMITATIONS

## ✅ OUTPUT

/artifacts/known-limitations.txt

## ✅ INCLUDE

- unfinished UI
- temporary components
- non-refactored areas

---

# 📦 FINAL STRUCTURE

/artifacts/
  mobile-app-latest.apk
  mobile-app-info.txt
  mobile-flow-home.mp4
  mobile-flow-buyer.mp4
  mobile-flow-seller.mp4
  mobile-flow-admin.mp4
  web-mobile-home.mp4
  web-mobile-product.mp4
  web-mobile-dashboard.mp4
  color-audit-final.txt
  design-system-check.txt
  known-limitations.txt

---

# ✅ SUCCESS CRITERIA

- APK builds successfully
- Web preview works
- Mobile flows reproducible
- Audit file generated
- Design system validated

---

# 🚨 RULES

NO placeholders  
NO mock-only outputs  
NO fake data  

---

# 🎯 FINAL GOAL

Enable full audit of:

✅ Mobile UX  
✅ UI consistency  
✅ Product quality  
✅ Conversion readiness  
✅ Premium perception  
