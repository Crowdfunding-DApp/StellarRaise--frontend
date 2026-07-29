/**
 * Pure predicates used by the lifecycle hooks (Issue #78).
 *
 * These are deliberately separated from `hooks.ts` so that the "when does an
 * event fire?" decision can be unit-tested without rendering React. UI calls
 * `dispatch(event)`; these functions decide whether an event should exist
 * at all.
 */

import type { Campaign } from "@/lib/soroban";
import { DEADLINE_APPROACHING_WINDOW_MS } from "./hooks";

/** A campaign is "deadline approaching" when it ends within the window and has not yet ended. */
export function isDeadlineApproaching(
  campaign: Campaign,
  now: number = Date.now()
): boolean {
  if (!campaign) return false;
  const deadlineMs = new Date(campaign.deadline).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  const diff = deadlineMs - now;
  return diff > 0 && diff <= DEADLINE_APPROACHING_WINDOW_MS;
}

/** A campaign is "refund eligible" when it failed: deadline passed + raised < goal. */
export function isRefundEligible(
  campaign: Campaign,
  now: number = Date.now()
): boolean {
  if (!campaign) return false;
  if (campaign.goal <= 0) return false;
  const funded = campaign.raised / campaign.goal >= 1;
  if (funded) return false;
  const deadlineMs = new Date(campaign.deadline).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  return deadlineMs < now;
}
