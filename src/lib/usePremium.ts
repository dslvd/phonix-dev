/**
 * usePremium hook
 *
 * Drop-in hook that wraps premiumService for React components.
 * Components import this — never import premiumService directly.
 *
 * Usage:
 *   const { isPremium, purchase, cancel, restore, loading } = usePremium();
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPremiumStatus,
  purchasePlan,
  cancelSubscription,
  restorePurchase,
  type PremiumPlan,
  type PremiumStatus,
} from './premiumService';

export interface UsePremiumReturn {
  /** Current authoritative status */
  status: PremiumStatus;
  isPremium: boolean;
  loading: boolean;
  /** Error from the last operation, if any */
  error: string | null;
  /** Initiates a purchase for the given plan */
  purchase: (plan: PremiumPlan) => Promise<boolean>;
  /** Cancels the active subscription */
  cancel: () => Promise<boolean>;
  /** Restores a purchase (cross-device / re-install) */
  restore: () => Promise<boolean>;
  /** Manually re-fetch status (e.g., after returning from payment redirect) */
  refresh: () => Promise<void>;
}

const DEFAULT_STATUS: PremiumStatus = {
  isPremium: false,
  plan: null,
  expiresAt: null,
  subscriptionId: null,
};

export function usePremium(): UsePremiumReturn {
  const [status, setStatus] = useState<PremiumStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getPremiumStatus();
      setStatus(s);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(async (plan: PremiumPlan): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await purchasePlan(plan);
      if (result.success && result.status) {
        setStatus(result.status);
        return true;
      }
      setError(result.error ?? 'Purchase failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await cancelSubscription();
      if (result.success) {
        setStatus(DEFAULT_STATUS);
        return true;
      }
      setError(result.error ?? 'Cancellation failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await restorePurchase();
      if (result.success && result.status) {
        setStatus(result.status);
        return true;
      }
      setError(result.error ?? 'Nothing to restore.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    status,
    isPremium: status.isPremium,
    loading,
    error,
    purchase,
    cancel,
    restore,
    refresh,
  };
}
