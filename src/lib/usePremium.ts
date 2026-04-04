import { useState, useEffect, useCallback } from 'react';
import {
  getPremiumStatus,
  purchasePlan,
  restorePurchase,
  type PremiumStatus,
} from './premiumService';

export interface UsePremiumReturn {
  status: PremiumStatus;
  isPremium: boolean;

  loading: boolean;
  purchasing: boolean;
  restoring: boolean;

  error: string | null;

  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
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
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(async () => {
    setPurchasing(true);
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
      setPurchasing(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setRestoring(true);
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
      setRestoring(false);
    }
  }, []);

  return {
    status,
    isPremium: status.isPremium,
    loading,
    purchasing,
    restoring,
    error,
    purchase,
    restore,
    refresh,
  };
}