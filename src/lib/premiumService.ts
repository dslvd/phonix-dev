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
 *  - To add Stripe/LemonSqueezy later: replace the 2 PAYMENT_PROVIDER_HOOK
 *    functions below. Nothing else needs to change.
 */

// ─────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────

export type PremiumPlan = 'lifetime';

export interface PremiumStatus {
  isPremium: boolean;
  plan: PremiumPlan | null;
  /** Always null for lifetime — never expires */
  expiresAt: null;
  /** Opaque token. Phase 1: random string. Phase 2: provider payment ID */
  purchaseId: string | null;
}

export interface PurchaseResult {
  success: boolean;
  status: PremiumStatus | null;
  error?: string;
}

// ─────────────────────────────────────────────
//  PLAN CONFIG  (prices shown to user only)
// ─────────────────────────────────────────────

export const PLANS: Record<PremiumPlan, { label: string; price: string; period: string }> = {
  lifetime: { label: 'Lifetime', price: '$49.99', period: 'once' },
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

// ─────────────────────────────────────────────
//  PHASE 1 PLACEHOLDER IMPLEMENTATIONS
//  ⚠️  PAYMENT_PROVIDER_HOOK – replace these 2
//      functions in Phase 2, nothing else.
// ─────────────────────────────────────────────

/**
 * PAYMENT_PROVIDER_HOOK #1
 * Phase 1: Simulate a successful purchase after a short delay.
 * Phase 2: Call your payment provider's checkout session API here
 *          (e.g., POST /api/payments/create-checkout) and redirect the
 *          user to the provider's hosted payment page.
 */
async function _providerCreateCheckout(): Promise<{ purchaseId: string }> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 1200));

  // Simulate a 5% failure rate so you can test error handling
  if (Math.random() < 0.05) {
    throw new Error('Simulated payment failure – try again.');
  }

  return { purchaseId: `placeholder_lifetime_${Date.now()}` };
}

/**
 * PAYMENT_PROVIDER_HOOK #2
 * Phase 1: Return the locally stored status.
 * Phase 2: Call GET /api/payments/status?userId=... and return the
 *          server-authoritative purchase object.
 */
async function _providerFetchStatus(): Promise<PremiumStatus | null> {
  return loadStatus();
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
    return { isPremium: false, plan: null, expiresAt: null, purchaseId: null };
  }
  return stored;
}

/**
 * Purchase lifetime plan.
 * Returns a PurchaseResult so the UI can react without knowing provider details.
 */
export async function purchasePlan(): Promise<PurchaseResult> {
  try {
    const { purchaseId } = await _providerCreateCheckout();

    const status: PremiumStatus = {
      isPremium: true,
      plan: 'lifetime',
      expiresAt: null,
      purchaseId,
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
 * Restore a purchase (cross-device / re-install).
 * Phase 1: re-reads localStorage.
 * Phase 2: call your provider's restore endpoint.
 */
export async function restorePurchase(): Promise<PurchaseResult> {
  const status = await getPremiumStatus();
  if (status.isPremium) {
    return { success: true, status };
  }
  return { success: false, status: null, error: 'No active purchase found to restore.' };
}
