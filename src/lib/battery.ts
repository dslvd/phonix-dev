export const BATTERY_MAX = 5;
export const BATTERY_REFILL_MS = 3 * 60 * 60 * 1000;

export interface BatteryState {
  batteriesRemaining: number;
  batteryResetAt: string | null;
}

export const getBatteryResetAt = (now: number = Date.now()) => new Date(now + BATTERY_REFILL_MS).toISOString();

export const formatBatteryCountdown = (resetAt: string | null, now: number = Date.now()) => {
  if (!resetAt) {
    return '';
  }

  const targetTime = Date.parse(resetAt);
  if (!Number.isFinite(targetTime)) {
    return '';
  }

  const remainingMs = Math.max(0, targetTime - now);
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (remainingMs <= 0) {
    return '0m';
  }

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

export const normalizeBatteryState = (
  state: BatteryState,
  now: number = Date.now()
): BatteryState => {
  if (state.batteriesRemaining > 0) {
    return {
      batteriesRemaining: Math.min(state.batteriesRemaining, BATTERY_MAX),
      batteryResetAt: null,
    };
  }

  if (!state.batteryResetAt) {
    return {
      batteriesRemaining: 0,
      batteryResetAt: getBatteryResetAt(now),
    };
  }

  const targetTime = Date.parse(state.batteryResetAt);
  if (!Number.isFinite(targetTime)) {
    return {
      batteriesRemaining: 0,
      batteryResetAt: getBatteryResetAt(now),
    };
  }

  if (targetTime <= now) {
    return {
      batteriesRemaining: BATTERY_MAX,
      batteryResetAt: null,
    };
  }

  return {
    batteriesRemaining: 0,
    batteryResetAt: state.batteryResetAt,
  };
};

export const spendBattery = (
  state: BatteryState,
  amount: number = 1,
  now: number = Date.now()
): BatteryState => {
  if (state.batteriesRemaining <= 0) {
    return normalizeBatteryState(state, now);
  }

  const nextCount = Math.max(0, state.batteriesRemaining - amount);
  if (nextCount === 0) {
    return {
      batteriesRemaining: 0,
      batteryResetAt: state.batteryResetAt || getBatteryResetAt(now),
    };
  }

  return {
    batteriesRemaining: Math.min(nextCount, BATTERY_MAX),
    batteryResetAt: null,
  };
};
