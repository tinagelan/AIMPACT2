import type { Benefits, Msg, PnLSaving } from "./types";

/**
 * The ONLY ways to create P&L savings. Freed time is never money on the P&L
 * unless the role/FTE is actually reduced (PRD §6.1 "iron rule").
 */
export const pnl = {
  zero(): PnLSaving {
    return 0 as PnLSaving;
  },
  /** An expense that stops: cancelled subscription, fewer seats, cheaper plan. */
  fromExpenseReduction(monthlyNis: number): PnLSaving {
    return Math.max(0, monthlyNis) as PnLSaving;
  },
  /** Freed hours become P&L savings only when the owner confirms a real FTE/scope reduction. */
  fromConfirmedFteReduction(
    hours: number,
    hourlyEmployerCost: number,
    confirmation: { confirmed: true },
  ): PnLSaving {
    if (!confirmation.confirmed) return 0 as PnLSaving;
    return Math.max(0, hours * hourlyEmployerCost) as PnLSaving;
  },
  add(a: PnLSaving, b: PnLSaving): PnLSaving {
    return (a + b) as PnLSaving;
  },
};

/** Revenue capacity from freed hours: only when redirected AND value per hour is known. */
export function revenueFromRedirectedHours(
  hours: number,
  revenuePerHourNis: number | undefined,
  redirected: boolean,
): number {
  if (!redirected || !revenuePerHourNis || revenuePerHourNis <= 0) return 0;
  return hours * revenuePerHourNis;
}

export function emptyBenefits(quality: Msg[] = []): Benefits {
  return {
    directSavingsNis: pnl.zero(),
    avoidedCostNis: 0,
    timeSavedHours: 0,
    revenueImprovementNis: 0,
    quality,
  };
}

/** Money that counts as a financial benefit (never includes hours). */
export function monthlyFinancialBenefit(b: Benefits): number {
  return b.directSavingsNis + b.avoidedCostNis + b.revenueImprovementNis;
}
