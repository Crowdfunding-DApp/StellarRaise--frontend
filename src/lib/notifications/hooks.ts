/**
 * React hooks that convert campaign data into notification events (Issue #78).
 *
 * The hooks are intentionally thin: they only read inputs, decide via pure
 * predicates, and dispatch events. They never mutate global state, so they
 * are safe to mount multiple times.
 *
 * Each trigger uses a session-scoped set so we never spam the user with the same
 * notification twice in one browser session. Persistent rate-limiting /
 * deduplication is the backend's responsibility (Issue #3 dependency).
 */

import { useEffect, useRef } from "react";
import type { Campaign } from "@/lib/soroban";
import type { NotificationEvent } from "./types";
import { getNotificationService } from "./service";
import { isDeadlineApproaching, isRefundEligible } from "./predicates";

/** Window within which we consider a deadline "approaching". */
export const DEADLINE_APPROACHING_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface DeadlineTriggerOptions {
  enabled: boolean;
  walletAddress: string | null;
  campaigns: Campaign[];
}

/**
 * Fire `campaign.deadline_approaching` once per campaign that is within the
 * approaching window and not already completed.
 */
export function useDeadlineApproachingTrigger({
  enabled,
  walletAddress,
  campaigns,
}: DeadlineTriggerOptions): void {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !walletAddress) return;
    const service = getNotificationService();
    const now = Date.now();

    for (const c of campaigns) {
      if (firedRef.current.has(c.id)) continue;
      if (!isDeadlineApproaching(c, now)) continue;

      firedRef.current.add(c.id);
      const event: NotificationEvent = {
        type: "campaign.deadline_approaching",
        walletAddress,
        campaignId: c.id,
        campaignTitle: c.title,
        campaignDeadline: c.deadline,
      };
      // Errors are intentionally swallowed at the boundary; channels already
      // record delivery results without throwing.
      void service.dispatch(event);
    }
  }, [enabled, walletAddress, campaigns]);
}

export interface RefundTriggerOptions {
  enabled: boolean;
  walletAddress: string | null;
  campaigns: Campaign[];
}

/**
 * Fire `campaign.refund_eligible` once per campaign that has ended without
 * reaching its funding goal.
 */
export function useRefundEligibleTrigger({
  enabled,
  walletAddress,
  campaigns,
}: RefundTriggerOptions): void {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !walletAddress) return;
    const service = getNotificationService();
    const now = Date.now();

    for (const c of campaigns) {
      if (firedRef.current.has(c.id)) continue;
      if (!isRefundEligible(c, now)) continue;

      firedRef.current.add(c.id);
      const event: NotificationEvent = {
        type: "campaign.refund_eligible",
        walletAddress,
        campaignId: c.id,
        campaignTitle: c.title,
        campaignDeadline: c.deadline,
      };
      void service.dispatch(event);
    }
  }, [enabled, walletAddress, campaigns]);
}
