# Phonix Premium — Phase 2 Migration Guide

## How the system is designed

All premium/payment logic is isolated in one file:

```
src/lib/premiumService.ts
```

The rest of the app (components, hooks, pages) NEVER directly handles payment logic.
They only interact with this public API:

```
getPremiumStatus()  → load current premium state on app start
purchasePlan()      → initiate lifetime purchase flow
restorePurchase()   → restore previous purchase (cross-device / reinstall)
```

---

## Core architecture rule (IMPORTANT)

### ✅ Single source of truth
Premium state is managed ONLY by:

- `premiumService.ts` (storage + provider layer)
- `usePremium()` hook (React state wrapper)

### ❌ DO NOT:
- store premium in `appState`
- duplicate batteries premium logic in UI
- manually sync localStorage in components

Premium is now fully decoupled from app state.

---

## The 2 functions to replace (ONLY change these in Phase 2)

These are marked in code as provider hooks:

---

### 🔌 Hook #1 — `_providerCreateCheckout()`

Current (Phase 1):
- Simulates purchase
- Returns fake purchaseId

Phase 2:
- Call backend to create a payment session
- Redirect user to hosted checkout page

### Stripe example:
```ts
async function _providerCreateCheckout(): Promise<{ purchaseId: string }> {
  const res = await fetch('/api/payments/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: getCurrentUserId() }),
  });

  const { url } = await res.json();

  // Redirect user to Stripe Checkout
  window.location.href = url;

  // Execution stops here (webhook completes purchase)
  return { purchaseId: '' };
}
```

### LemonSqueezy example:
Same flow:
- backend creates checkout URL
- frontend redirects
- webhook confirms purchase

---

### 🔌 Hook #2 — `_providerFetchStatus()`

Current (Phase 1):
- Reads localStorage

Phase 2:
- Fetch from backend (authoritative source)
- Prevents users from faking premium status

```ts
async function _providerFetchStatus(): Promise<PremiumStatus | null> {
  const res = await fetch('/api/payments/status', {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!res.ok) return null;

  return res.json();
}
```

Backend must return:

```ts
{
  isPremium: boolean,
  plan: "lifetime" | null,
  expiresAt: null,
  purchaseId: string | null
}
```

---

## Why this system is simple

Phonix uses a **lifetime purchase model**, not subscriptions.

### That means:
- ❌ No renewal logic
- ❌ No cancellation flow
- ❌ No recurring billing

### Only one event matters:
✔ Payment succeeded

---

## Backend endpoints (provider-agnostic)

| Endpoint | Purpose |
|----------|--------|
| POST `/api/payments/create-checkout` | Creates checkout session + returns URL |
| GET `/api/payments/status` | Returns current PremiumStatus from DB |
| POST `/api/payments/webhook` | Handles payment success event |
| POST `/api/payments/restore` | Restores purchase via user ID/email |

---

## Webhook rule (CRITICAL)

The webhook is the **source of truth**.

Never trust frontend state or localStorage.

Webhook responsibilities:
- verify payment success
- store/update user purchase in DB
- mark user as premium

---

## Provider-specific setup

### Stripe (recommended)
- Use: `mode: "payment"` (NOT subscription)
- Listen for:
  - `checkout.session.completed`
- Store:
  - `payment_intent` as `purchaseId`

---

### LemonSqueezy
- Use one-time product checkout
- Listen for:
  - `order_created`
- Store:
  - order ID as `purchaseId`

---

### RevenueCat (best for mobile apps)
- Use non-consumable entitlement
- `_providerFetchStatus()` queries subscriber API
- Built-in restore flow

---

## Database schema (minimal + production-ready)

```sql
CREATE TABLE user_purchases (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL UNIQUE,
  is_premium   BOOLEAN NOT NULL DEFAULT false,
  plan         TEXT DEFAULT 'lifetime',
  purchase_id  TEXT,
  provider     TEXT,
  purchased_at TIMESTAMPTZ DEFAULT now()
);
```

### Notes:
- No `expires_at` needed (lifetime only)
- One row per user
- Updated only via webhook

---

## Migration checklist

### Setup
- [ ] Choose payment provider (Stripe / LemonSqueezy / RevenueCat)
- [ ] Create backend (Vercel API routes recommended)
- [ ] Add authentication (Supabase Auth recommended)

### Database
- [ ] Create `user_purchases` table

### Backend
- [ ] Implement `/create-checkout`
- [ ] Implement `/status`
- [ ] Implement `/webhook`
- [ ] Implement `/restore`

### Frontend
- [ ] Replace ONLY:
  - `_providerCreateCheckout`
  - `_providerFetchStatus`
- [ ] Remove all `appState` premium logic (already deprecated)
- [ ] Ensure UI uses only `usePremium()`

### Testing
- [ ] Test purchase flow (sandbox mode)
- [ ] Test webhook updates DB correctly
- [ ] Test restore flow
- [ ] Verify premium persists after refresh

---

## Final rule

> If it touches premium logic outside `premiumService.ts`, it is architecture debt.

Keep everything centralized — this system is designed to scale cleanly into a real paid product.