"use client"

import type { AnalyticsResponse, ApiErrorResponse } from "@/types/analytics"
import type { Campaign } from "@/lib/soroban"

/**
 * Client-side helpers for the Creator Analytics Dashboard.
 *
 * CAUTION: This file is marked `"use client"` and is safe to import from
 * React components. Do NOT import any server-only modules here.
 */

export type AnalyticsResult =
  | { ok: true; data: AnalyticsResponse }
  | { ok: false; error: string }

/**
 * Fetch analytics for a given campaign. Auth is via the HttpOnly session
 * cookie issued by /api/auth/verify. Pass the connected wallet `address`
 * for client-side UX so we can pick the right empty / loading states
 * before the response lands.
 */
export async function fetchCampaignAnalytics(
  campaignId: string,
  options: { signal?: AbortSignal } = {}
): Promise<AnalyticsResult> {
  try {
    const res = await fetch(`/api/analytics/${campaignId}`, {
      method: "GET",
      credentials: "include",
      signal: options.signal,
      headers: { Accept: "application/json" },
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const err = (json as ApiErrorResponse | null)?.error ??
        `Failed to load analytics (HTTP ${res.status}).`
      return { ok: false, error: err }
    }
    return { ok: true, data: json as AnalyticsResponse }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Network error loading analytics."
    return { ok: false, error: message }
  }
}

/**
 * Re-export Campaign for convenience in client components.
 */
export type { Campaign }
