import type { Campaign } from "@/lib/soroban"

export type WithdrawalState = "none" | "partial" | "full"

/** Platform fee taken on every withdrawal, in basis points (Issue 25 fee-split). */
export const PLATFORM_FEE_BPS = 250 // 2.5%

/**
 * Per-transaction withdrawal cap, in basis points of the remaining balance.
 * Stands in for real multisig-gated withdrawal limits (Issue 14) until that
 * governance layer exists on-chain.
 */
export const PARTIAL_WITHDRAWAL_CAP_BPS = 5000 // 50% of remaining per tx

/** Dispute/grace window after a campaign is funded (Issue 34), in milliseconds. */
export const GRACE_PERIOD_MS = 48 * 60 * 60 * 1000 // 48 hours

export function splitWithdrawal(amount: number): { netAmount: number; feeAmount: number } {
  const feeAmount = (amount * PLATFORM_FEE_BPS) / 10000
  return { netAmount: amount - feeAmount, feeAmount }
}

export function getRemainingBalance(campaign: Campaign): number {
  return Math.max(0, campaign.raised - (campaign.withdrawnAmount ?? 0))
}

export function getWithdrawalState(campaign: Campaign): WithdrawalState {
  const withdrawn = campaign.withdrawnAmount ?? 0
  if (withdrawn <= 0) return "none"
  if (withdrawn >= campaign.raised) return "full"
  return "partial"
}

/**
 * Max amount withdrawable in a single transaction, given the remaining
 * (not-yet-withdrawn) balance. Real multisig approval (Issue 14) would
 * replace this flat per-tx cap with a signer-threshold check.
 */
export function getMaxSingleWithdrawalFromRemaining(remaining: number): number {
  return (remaining * PARTIAL_WITHDRAWAL_CAP_BPS) / 10000
}

export function getMaxSingleWithdrawal(campaign: Campaign): number {
  return getMaxSingleWithdrawalFromRemaining(getRemainingBalance(campaign))
}

/**
 * Whether the campaign is still inside its post-funding dispute/grace window.
 * Without a contract-tracked `fundedAt`, there's no way to know a grace
 * period even applies, so we conservatively treat it as already elapsed
 * (Issue 34 should supply a real timestamp and dispute status here).
 */
export function isWithinGracePeriod(campaign: Campaign): boolean {
  if (!campaign.fundedAt) return false
  const fundedAtMs = new Date(campaign.fundedAt).getTime()
  return Date.now() - fundedAtMs < GRACE_PERIOD_MS
}

export function getGracePeriodEndsAt(campaign: Campaign): string | null {
  if (!campaign.fundedAt) return null
  const fundedAtMs = new Date(campaign.fundedAt).getTime()
  return new Date(fundedAtMs + GRACE_PERIOD_MS).toISOString()
}
