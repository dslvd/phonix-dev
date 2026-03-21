/**
 * usePremium hook
 *
 * Drop-in hook that wraps premiumService for React components.
 * Components import this — never import premiumService directly.
 *
 * Usage:
 *   const { isPremium, purchase, restore, loading } = usePremium();
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPremiumStatus,
  purchasePlan,
  restorePurchase,
  type PremiumStatus,
} from './premiumService';

export interface UsePremiumReturn {
  /** Current authoritative status */
  status: PremiumStatus;
  isPremium: boolean;
  loading: boolean;
  /** Error from the last operation, if any */
  error: string | null;
  /** Initiates the lifetime purchase */
  purchase: () => Promise<boolean>;
  /** Restores a purchase (cross-device / re-install) */
  restore: () => Promise<boolean>;
  /** Manually re-fetch status (e.g., after returning from payment redirect) */
  refresh: () => Promise<void>;
}

const DEFAULT_STATUS: PremiumStatus = {
  isPremium: false,
  plan: null,
  expiresAt: null,
  purchaseId: null,
};

export function usePremium(): UsePremiumReturn {
  const [status, setStatus] = useState<PremiumStatus>(DEFAULT_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
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

  const purchase = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await purchasePlan();
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
    restore,
    refresh,
  };
}
