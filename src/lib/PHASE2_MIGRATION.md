# Phonix Premium — Phase 2 Migration Guide

## How the system is designed

All payment logic is isolated in **one file**: `src/lib/premiumService.ts`.

The rest of the app (components, pages, hooks) never touches payment details.
They only call three public functions:

```
getPremiumStatus()   →  load current status
purchasePlan(plan)   →  start a purchase
cancelSubscription() →  cancel
```

To add a real payment provider, you replace **3 private functions** inside
`premiumService.ts`. Nothing else changes — not the hook, not the UI, not
App.tsx.

---

## The 3 functions to replace

These are clearly marked `// PAYMENT_PROVIDER_HOOK` in the source.

### Hook #1 — `_providerCreateCheckout(plan)`
Currently: simulates a network call and returns a fake subscription ID.  
Phase 2: Call your backend to create a checkout session, then redirect the
user to the provider's payment page.

**Stripe example:**
```ts
async function _providerCreateCheckout(plan: PremiumPlan) {
  const res = await fetch('/api/payments/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, userId: getCurrentUserId() }),
  });
  const { url } = await res.json();
  // Redirect to Stripe Checkout — user returns to /premium?success=true
  window.location.href = url;
  // This line is never reached; the webhook handles completion
  return { subscriptionId: '' };
}
```

**LemonSqueezy example:** Same pattern — create a checkout URL on your
backend, redirect the user, handle the webhook.

---

### Hook #2 — `_providerFetchStatus()`
Currently: reads from localStorage.  
Phase 2: Fetch from your own backend, which is the authoritative source.

```ts
async function _providerFetchStatus(): Promise<PremiumStatus | null> {
  const res = await fetch('/api/payments/status', {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) return null;
  return res.json(); // shape must match PremiumStatus
}
```

Your backend reads from your database (updated by the provider's webhook).
This means users can never fake premium status by editing localStorage.

---

### Hook #3 — `_providerCancelSubscription(subscriptionId)`
Currently: clears localStorage.  
Phase 2: Tell your backend to cancel via the provider API.

```ts
async function _providerCancelSubscription(subscriptionId: string) {
  await fetch('/api/payments/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ subscriptionId }),
  });
  // The provider webhook will update your DB; local cache clears automatically
}
```

---

## Backend work needed (provider-agnostic)

Regardless of which provider you choose, you need:

| Endpoint | Purpose |
|---|---|
| `POST /api/payments/create-checkout` | Creates a session and returns a checkout URL |
| `GET /api/payments/status` | Returns the user's current `PremiumStatus` from DB |
| `POST /api/payments/cancel` | Cancels subscription via provider API |
| `POST /api/payments/webhook` | Receives provider events; updates your DB |

The webhook is the most important piece — it's how you reliably know when a
payment succeeds, renews, or fails. Never trust the frontend alone.

---

## Provider-specific notes

### Stripe
- Use `stripe.checkout.sessions.create()` for `_providerCreateCheckout`
- Listen for `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.deleted` webhooks
- Store `stripe_customer_id` and `stripe_subscription_id` per user in your DB
- SDK: `npm install stripe`

### LemonSqueezy
- Very similar to Stripe but simpler setup, better for indie projects
- Use `/v1/checkouts` to create a session
- Listen for `subscription_created`, `subscription_cancelled` webhooks
- SDK: `npm install @lemonsqueezy/lemonsqueezy.js`

### RevenueCat (best for cross-platform / mobile)
- Manages iOS, Android, and web subscriptions under one API
- `_providerFetchStatus` calls RevenueCat's `/subscribers/{userId}` endpoint
- Handles receipt validation and restore automatically

---

## Database schema (minimal, works with Supabase/PlanetScale/Neon)

```sql
CREATE TABLE user_subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL UNIQUE,
  is_premium      BOOLEAN NOT NULL DEFAULT false,
  plan            TEXT,                  -- 'monthly' | 'yearly' | 'lifetime'
  expires_at      TIMESTAMPTZ,
  subscription_id TEXT,                  -- provider subscription ID
  provider        TEXT,                  -- 'stripe' | 'lemonsqueezy' | 'revenuecat'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

Your webhook handler updates `is_premium`, `expires_at`, and `updated_at`
whenever a payment event arrives.

---

## Checklist for going live

- [ ] Choose a payment provider
- [ ] Set up a backend (Vercel API routes already work — see `api/` folder)
- [ ] Add user auth so you have a stable `userId` to attach subscriptions to
      (Supabase Auth is the simplest addition given the existing stack)
- [ ] Create the `user_subscriptions` table
- [ ] Implement the 4 backend endpoints above
- [ ] Replace the 3 `PAYMENT_PROVIDER_HOOK` functions in `premiumService.ts`
- [ ] Remove the "Phase 1 placeholder" note from the Premium UI
- [ ] Test the full purchase → webhook → status flow in provider sandbox mode
- [ ] Go live
