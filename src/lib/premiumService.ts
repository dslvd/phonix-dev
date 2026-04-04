/**
 * PHONIX PREMIUM SERVICE (CLEAN PHASE 1)
 * Ready for Phase 2 payment provider swap
 */

export type PremiumPlan = 'lifetime';

export interface PremiumStatus {
  isPremium: boolean;
  plan: PremiumPlan | null;
  expiresAt: null;
  purchaseId: string | null;
}

export interface PurchaseResult {
  success: boolean;
  status: PremiumStatus | null;
  error?: string;
}

export const PLANS: Record<PremiumPlan, { label: string; price: string; period: string }> = {
  lifetime: { label: 'Lifetime', price: '$49.99', period: 'once' },
};

const STORAGE_KEY = 'phonix-premium-v1';

/* ---------------- STORAGE ---------------- */

function saveStatus(status: PremiumStatus): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

function loadStatus(): PremiumStatus | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // basic validation guard
    if (typeof parsed?.isPremium !== 'boolean') return null;

    return parsed as PremiumStatus;
  } catch {
    return null;
  }
}

/* ---------------- PROVIDER HOOKS (PHASE 2 SWAP POINTS) ---------------- */

async function _providerCreateCheckout(): Promise<{ purchaseId: string }> {
  await new Promise(r => setTimeout(r, 1200));

  if (Math.random() < 0.05) {
    throw new Error('Simulated payment failure – try again.');
  }

  return { purchaseId: `placeholder_lifetime_${Date.now()}` };
}

async function _providerFetchStatus(): Promise<PremiumStatus | null> {
  return loadStatus();
}

/* ---------------- PUBLIC API ---------------- */

export async function getPremiumStatus(): Promise<PremiumStatus> {
  const stored = await _providerFetchStatus();

  return (
    stored ?? {
      isPremium: false,
      plan: null,
      expiresAt: null,
      purchaseId: null,
    }
  );
}

/**
 * Returns FULL status instead of boolean (fixes UI ambiguity)
 */
export async function purchasePlan(): Promise<PurchaseResult> {
  const existing = await getPremiumStatus();

  if (existing.isPremium) {
    return { success: true, status: existing };
  }

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
      error: err instanceof Error ? err.message : 'Purchase failed.',
    };
  }
}

export async function restorePurchase(): Promise<PurchaseResult> {
  const status = await getPremiumStatus();

  if (status.isPremium) {
    return { success: true, status };
  }

  return {
    success: false,
    status: null,
    error: 'No active purchase found to restore.',
  };
}