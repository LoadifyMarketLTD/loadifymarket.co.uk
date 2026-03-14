# CE AI NEVOIE DE LA STRIPE — GHID COMPLET

> Fără aceste 3 chei Stripe, platforma **nu poate procesa plăți** și **comenzile nu se salvează în baza de date**.

---

## REZUMAT — 3 chei de care ai nevoie

| Variabilă | De unde o iei | Exemplu |
|---|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API Keys | `pk_live_51...` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys | `sk_live_51...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks | `whsec_...` |

---

## PAS 1 — Ia cheile API din Stripe Dashboard

1. Mergi la **https://dashboard.stripe.com/apikeys**
2. Dacă nu ești în **Live mode**, apasă butonul **"View live keys"** (comută din Test în Live)
3. Copiază:
   - **Publishable key** → aceasta este `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → apasă **"Reveal live key"** → aceasta este `STRIPE_SECRET_KEY`

> ⚠️ **IMPORTANT:** Cheile care încep cu `pk_test_` / `sk_test_` sunt doar pentru testare — plățile reale cer `pk_live_` / `sk_live_`.

---

## PAS 2 — Creează un Webhook în Stripe

Webhook-ul este **obligatoriu** — fără el, comenzile NU se salvează în baza de date după plată.

1. Mergi la **https://dashboard.stripe.com/webhooks**
2. Apasă **"Add endpoint"**
3. Completează câmpurile:

   - **Endpoint URL:**
     ```
     https://loadifymarket.co.uk/.netlify/functions/stripe-webhook
     ```

   - **Listen to events** — adaugă exact aceste 4 events:
     - `checkout.session.completed` ← **CEL MAI IMPORTANT** (creează comanda în DB)
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

4. Apasă **"Add endpoint"**

5. Pe pagina webhook-ului, apasă **"Reveal signing secret"**
   - Copiază valoarea care începe cu `whsec_...` → aceasta este `STRIPE_WEBHOOK_SECRET`

---

## PAS 3 — Pune cheile în Netlify

1. Mergi la **https://app.netlify.com** → proiectul tău `loadifymarket.co.uk`
2. **Site configuration → Environment variables → Add variable**
3. Adaugă **toate cele 3 variabile** de mai jos:

```
VITE_STRIPE_PUBLISHABLE_KEY   = pk_live_51...
STRIPE_SECRET_KEY             = sk_live_51...
STRIPE_WEBHOOK_SECRET         = whsec_...
```

4. Apasă **"Save"**
5. Mergi la **Deploys → Trigger deploy → Deploy site** (pentru ca modificările să fie active)

---

## CE SE ÎNTÂMPLĂ DACĂ LIPSESC CHEILE

| Cheie lipsă | Efect |
|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Butonul "Proceed to Payment" nu face nimic (eroare de consolă) |
| `STRIPE_SECRET_KEY` | Funcția `create-checkout` crapă cu eroare 500 — utilizatorul vede "Failed to proceed to checkout" |
| `STRIPE_WEBHOOK_SECRET` | Funcția `stripe-webhook` returnează 501 — comanda **NU se salvează** în baza de date după plată; cumpărătorul plătește dar comanda nu apare în sistem |

---

## VERIFICARE DUPĂ CONFIGURARE

### Test rapid (din browser):
1. Accesează: `https://loadifymarket.co.uk/.netlify/functions/health`
   - Trebuie să returneze `{ "status": "ok" }`

### Test Stripe webhook (din Stripe Dashboard):
1. Mergi la **Dashboard → Webhooks → webhook-ul tău**
2. Apasă **"Send test event"**
3. Selectează `checkout.session.completed`
4. Verifică că răspunsul este `200 OK`

---

## REZUMAT VIZUAL

```
Cumpărător adaugă în coș
         ↓
Apasă "Proceed to Payment"
         ↓
[NETLIFY] create-checkout (nevoie de STRIPE_SECRET_KEY)
         ↓
Stripe Checkout Page (nevoie de VITE_STRIPE_PUBLISHABLE_KEY)
         ↓
Cumpărătorul plătește
         ↓
Stripe trimite event → [NETLIFY] stripe-webhook (nevoie de STRIPE_WEBHOOK_SECRET)
         ↓
Comanda se salvează în Supabase ← FĂRĂ WEBHOOK, ACEASTA NU SE ÎNTÂMPLĂ
         ↓
Cumpărătorul ajunge la /orders/success
```

---

## NOTE IMPORTANTE

- **Nu pune niciodată `STRIPE_SECRET_KEY` în codul frontend** (nu în fișiere `.tsx` / `.ts` din `src/`). Aceasta rămâne strict în Netlify Environment Variables.
- `VITE_STRIPE_PUBLISHABLE_KEY` este publică (sigur de pus în frontend) — dar în cod nu este folosită direct momentan; Stripe Checkout gestionează tot pe server-side.
- Dacă folosești **Stripe Connect** în viitor (pentru ca vânzătorii să primească bani direct), vei mai avea nevoie de chei suplimentare. Momentan platforma folosește un cont Stripe central.
