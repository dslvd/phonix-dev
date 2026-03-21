# Phonix Premium — Phase 2 Migration Guide

## How the system is designed

All payment logic is isolated in **one file**: `src/lib/premiumService.ts`.

The rest of the app (components, pages, hooks) never touches payment details.
They only call three public functions:

```
getPremiumStatus()  →  load current status on app start
purchasePlan()      →  initiate the lifetime purchase
restorePurchase()   →  restore a previous purchase (cross-device / re-install)
```

To add a real payment provider, you replace **2 private functions** inside
`premiumService.ts`. Nothing else changes — not the hook, not the UI, not
`App.tsx`.

---

## The 2 functions to replace

These are clearly marked `// PAYMENT_PROVIDER_HOOK` in the source.

### Hook #1 — `_providerCreateCheckout()`

Currently: simulates a network call and returns a fake `purchaseId`.
Phase 2: call your backend to create a one-time payment checkout session,
then redirect the user to the provider's hosted payment page.

**Stripe example:**
```ts
async function _providerCreateCheckout(): Promise<{ purchaseId: string }> {
  const res = await fetch('/api/payments/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: getCurrentUserId() }),
  });
  const { url } = await res.json();
  // Redirect to Stripe Checkout — user returns to /premium?success=true
  window.location.href = url;
  // This line is never reached; the webhook handles completion
  return { purchaseId: '' };
}
```

**LemonSqueezy example:** same pattern — create a checkout URL on your
backend, redirect the user, handle the webhook.

---

### Hook #2 — `_providerFetchStatus()`

Currently: reads from localStorage.
Phase 2: fetch from your own backend, which is the authoritative source.
This means users can never fake premium status by editing localStorage.

```ts
async function _providerFetchStatus(): Promise<PremiumStatus | null> {
  const res = await fetch('/api/payments/status', {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) return null;
  // Shape must match PremiumStatus: { isPremium, plan, expiresAt, purchaseId }
  return res.json();
}
```

Your backend reads from your database, which is updated by the provider's
webhook whenever a payment is confirmed.

---

## Key differences from a subscription system

Because Phonix uses a **lifetime one-time payment** (not a recurring
subscription), the integration is simpler than a typical subscription setup:

- `expiresAt` is always `null` — no renewal logic needed
- `purchaseId` holds the provider's payment/order ID (not a subscription ID)
- There is no cancel flow — a lifetime purchase is permanent
- The webhook only needs to handle one event: payment succeeded
- No need to listen for renewal, failed payment, or cancellation events

---

## Backend work needed (provider-agnostic)

| Endpoint | Purpose |
|---|---|
| `POST /api/payments/create-checkout` | Creates a session and returns a checkout URL |
| `GET /api/payments/status` | Returns the user's current `PremiumStatus` from DB |
| `POST /api/payments/webhook` | Receives the payment success event; updates your DB |
| `POST /api/payments/restore` | Looks up a previous purchase by user ID or email |

The webhook is the most important piece — it's how you reliably know when a
payment succeeds. Never trust the frontend alone.

---

## Provider-specific notes

### Stripe (one-time payment)
- Use `stripe.checkout.sessions.create({ mode: 'payment' })` — not
  `mode: 'subscription'`
- Listen for the `checkout.session.completed` webhook event only
- Store the Stripe `payment_intent` ID as `purchaseId` in your DB
- SDK: `npm install stripe`

### LemonSqueezy
- Use `/v1/checkouts` to create a session with a one-time product
- Listen for the `order_created` webhook event
- Store the LemonSqueezy order ID as `purchaseId`
- SDK: `npm install @lemonsqueezy/lemonsqueezy.js`

### RevenueCat (best for cross-platform / mobile)
- Create a non-consumable or lifetime entitlement in the dashboard
- `_providerFetchStatus` calls RevenueCat's `/subscribers/{userId}` endpoint
- `restorePurchase` calls RevenueCat's restore API automatically

---

## Database schema (minimal, works with Supabase / PlanetScale / Neon)

```sql
CREATE TABLE user_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL UNIQUE,
  is_premium  BOOLEAN NOT NULL DEFAULT false,
  plan        TEXT DEFAULT 'lifetime',
  purchase_id TEXT,               -- provider payment/order ID
  provider    TEXT,               -- 'stripe' | 'lemonsqueezy' | 'revenuecat'
  purchased_at TIMESTAMPTZ DEFAULT now()
);
```

Note: no `expires_at` column needed — lifetime purchases never expire.
Your webhook handler inserts or updates a row when payment is confirmed.

---

## Checklist for going live

- [ ] Choose a payment provider
- [ ] Set up a backend (Vercel API routes already work — see `api/` folder)
- [ ] Add user auth so you have a stable `userId` to attach purchases to
      (Supabase Auth is the simplest addition given the existing stack)
- [ ] Create the `user_purchases` table
- [ ] Implement the backend endpoints above
- [ ] Replace the 2 `PAYMENT_PROVIDER_HOOK` functions in `premiumService.ts`
- [ ] Remove the "Phase 1 placeholder" note from the Premium UI
- [ ] Test the full purchase → webhook → status flow in provider sandbox mode
- [ ] Go live
