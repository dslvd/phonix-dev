/**
 * ============================================================
 *  PHONIX PREMIUM SERVICE
 *  Phase 1: Placeholder payment system (no real payment)
 *  Phase 2: Swap only the functions marked PAYMENT_PROVIDER_HOOK
 * ============================================================
 *
 *  Architecture:
 *  - All premium logic flows through this single file
 *  - The rest of the app never touches payment details directly
 *  - To add Stripe/LemonSqueezy later: replace the 3 PAYMENT_PROVIDER_HOOK
 *    functions below. Nothing else needs to change.
 */

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────

export type PremiumPlan = 'monthly' | 'yearly' | 'lifetime';

export interface PremiumStatus {
  isPremium: boolean;
  plan: PremiumPlan | null;
  /** ISO date string – null for lifetime/placeholder */
  expiresAt: string | null;
  /** Opaque token. Phase 1: random string. Phase 2: provider subscription ID */
  subscriptionId: string | null;
}

export interface PurchaseResult {
  success: boolean;
  status: PremiumStatus | null;
  error?: string;
}

// ─────────────────────────────────────────────
//  PLAN CONFIG  (prices shown to user only)
// ─────────────────────────────────────────────

export const PLANS: Record<PremiumPlan, { label: string; price: string; period: string; savings?: string }> = {
  monthly:  { label: 'Monthly',  price: '$4.99',  period: '/mo' },
  yearly:   { label: 'Yearly',   price: '$29.99', period: '/yr', savings: 'Save 50%' },
  lifetime: { label: 'Lifetime', price: '$49.99', period: 'once', savings: 'Best Value' },
};

// ─────────────────────────────────────────────
//  STORAGE HELPERS  (localStorage in Phase 1;
//  replace with server DB fetch in Phase 2)
// ─────────────────────────────────────────────

const STORAGE_KEY = 'phonix-premium-v1';

function saveStatus(status: PremiumStatus): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

function loadStatus(): PremiumStatus | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PremiumStatus;
  } catch {
    return null;
  }
}

function clearStatus(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ─────────────────────────────────────────────
//  PHASE 1 PLACEHOLDER IMPLEMENTATIONS
//  ⚠️  PAYMENT_PROVIDER_HOOK – replace these 3
//      functions in Phase 2, nothing else.
// ─────────────────────────────────────────────

/**
 * PAYMENT_PROVIDER_HOOK #1
 * Phase 1: Simulate a successful purchase after a short delay.
 * Phase 2: Call your payment provider's checkout session API here
 *          (e.g., POST /api/payments/create-checkout) and redirect the
 *          user to the provider's hosted payment page.
 */
async function _providerCreateCheckout(plan: PremiumPlan): Promise<{ subscriptionId: string }> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1200));

  // Simulate a 5 % failure rate so you can test error handling
  if (Math.random() < 0.05) {
    throw new Error('Simulated payment failure – try again.');
  }

  return { subscriptionId: `placeholder_${plan}_${Date.now()}` };
}

/**
 * PAYMENT_PROVIDER_HOOK #2
 * Phase 1: Return the locally stored status.
 * Phase 2: Call GET /api/payments/status?userId=... and return the
 *          server-authoritative subscription object.
 */
async function _providerFetchStatus(): Promise<PremiumStatus | null> {
  return loadStatus();
}

/**
 * PAYMENT_PROVIDER_HOOK #3
 * Phase 1: Clear local storage.
 * Phase 2: Call POST /api/payments/cancel and let the provider webhook
 *          update your database; then clear local cache.
 */
async function _providerCancelSubscription(_subscriptionId: string): Promise<void> {
  await new Promise(r => setTimeout(r, 800));
  clearStatus();
}

// ─────────────────────────────────────────────
//  PUBLIC API  (stable – never needs changing)
// ─────────────────────────────────────────────

/**
 * Load premium status.
 * Always call this on app start; it is the single source of truth.
 */
export async function getPremiumStatus(): Promise<PremiumStatus> {
  const stored = await _providerFetchStatus();
  if (!stored) {
    return { isPremium: false, plan: null, expiresAt: null, subscriptionId: null };
  }

  // Expire subscriptions automatically for Phase 1
  if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
    clearStatus();
    return { isPremium: false, plan: null, expiresAt: null, subscriptionId: null };
  }

  return stored;
}

/**
 * Purchase a plan.
 * Returns a PurchaseResult so the UI can react without knowing provider details.
 */
export async function purchasePlan(plan: PremiumPlan): Promise<PurchaseResult> {
  try {
    const { subscriptionId } = await _providerCreateCheckout(plan);

    const expiresAt =
      plan === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : plan === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null; // lifetime

    const status: PremiumStatus = {
      isPremium: true,
      plan,
      expiresAt,
      subscriptionId,
    };

    saveStatus(status);
    return { success: true, status };
  } catch (err) {
    return {
      success: false,
      status: null,
      error: err instanceof Error ? err.message : 'Purchase failed. Please try again.',
    };
  }
}

/**
 * Cancel the active subscription.
 */
export async function cancelSubscription(): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getPremiumStatus();
    if (!current.isPremium || !current.subscriptionId) {
      return { success: false, error: 'No active subscription found.' };
    }
    await _providerCancelSubscription(current.subscriptionId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Cancellation failed.',
    };
  }
}

/**
 * Restore a purchase (useful for Phase 2 mobile/cross-device scenarios).
 * Phase 1: just re-reads localStorage.
 * Phase 2: call your provider's restore endpoint.
 */
export async function restorePurchase(): Promise<PurchaseResult> {
  const status = await getPremiumStatus();
  if (status.isPremium) {
    return { success: true, status };
  }
  return { success: false, status: null, error: 'No active subscription found to restore.' };
}
