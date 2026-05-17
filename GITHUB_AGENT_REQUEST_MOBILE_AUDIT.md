# 🚀 TASK: PREPARE FULL MOBILE & WEB-MOBILE AUDIT PACKAGE

## 🎯 OBJECTIVE

Generate a **complete audit-ready package** for:

- Mobile App (APK)
- Web Mobile version

This package will be used for a **full UX/UI/Product audit**.

---

# 🧱 1. BUILD APK (MANDATORY)

## ✅ ACTION

- Build latest APK from repo
- Use production config (if available)

---

## ✅ OUTPUT

Upload as artifact:

```
/artifacts/mobile-app-latest.apk
```

---

## ✅ INCLUDE

- version name
- commit hash
- build date

---

# 🎥 2. SCREEN RECORDINGS (SIMULATED / AUTOMATED / MANUAL SUPPORT)

## ✅ REQUIRED FLOWS

### 🔹 HOME
- open app
- scroll homepage
- interact with main components

---

### 🔹 BUYER FLOW
- browse products
- open product
- add to cart (if possible)
- navigate checkout

---

### 🔹 SELLER FLOW
- dashboard load
- view products/orders

---

### 🔹 ADMIN FLOW
- open admin dashboard
- show key sections

---

## ✅ OUTPUT OPTIONS

If real device automation not available:

✅ generate screenshots sequence  
OR  
✅ provide storybook / preview states  
OR  
✅ generate Playwright flows  

Save as:

```
/artifacts/mobile-flow-home.mp4 (or screenshots folder)
/artifacts/mobile-flow-buyer.mp4
/artifacts/mobile-flow-seller.mp4
/artifacts/mobile-flow-admin.mp4
```

---

# 🌐 3. WEB MOBILE PREVIEW

## ✅ ACTION

- Deploy preview build (Netlify / Vercel / GitHub Pages)

---

## ✅ OUTPUT

Provide:

```
Preview URL:
```

---

## ✅ ADD

- confirm responsive mode
- mobile viewport tested (375px / 390px)

---

# 📸 4. WEB MOBILE RECORDING

## ✅ REQUIRED

- homepage scroll
- product page
- checkout
- dashboard

---

## ✅ OUTPUT

```
/artifacts/web-mobile-home.mp4
/artifacts/web-mobile-product.mp4
/artifacts/web-mobile-dashboard.mp4
```

---

# 🔍 5. RUN FINAL COLOR AUDIT (AGAIN)

## ✅ EXECUTE

Run checks:

- forbidden hex colors
- inline styles
- background usage
- token usage

---

## ✅ OUTPUT

```
/artifacts/color-audit-final.txt
```

Must include:

```
PASS / FAIL summary
remaining issues (if any)
```

---

# 🧬 6. DESIGN SYSTEM VALIDATION

## ✅ VERIFY

- tailwind config updated
- tokens used instead of hex
- no inline styles (colors)
- role accents present

---

## ✅ OUTPUT

```
/artifacts/design-system-check.txt
```

---

# 🧾 7. EXPORT KEY FILES

Include:

```
tailwind.config.ts
src/index.css
3 core components (Header, ProductCard, Layout)
```

---

# ⚠️ 8. KNOWN LIMITATIONS

## ✅ OUTPUT

List:

- unfinished UI sections
- temporary components
- areas not yet refactored

Save as:

```
/artifacts/known-limitations.txt
```

---

# 📦 FINAL OUTPUT STRUCTURE

```
/artifacts/
mobile-app-latest.apk
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
```

---

# ✅ SUCCESS CRITERIA

- APK builds successfully
- Mobile + web flows reproducible
- Audit results included
- Design system validated

---

# 🚨 IMPORTANT

This package must represent the **real current state of the product**.

NO placeholders  
NO mock-only outputs  

---

# 🎯 FINAL GOAL

Enable a **complete expert-level audit** of:

✅ Mobile UX  
✅ UI consistency  
✅ Product quality  
✅ Conversion readiness  
✅ Premium perception
