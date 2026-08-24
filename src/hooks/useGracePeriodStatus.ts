"use client"

import { useEffect, useState } from "react"
import { isWithinGracePeriod, getGracePeriodEndsAt } from "@/lib/withdrawal"

export interface GracePeriodStatus {
  active: boolean
  endsAt: string | null
  msRemaining: number
}

const TICK_MS = 1000

function computeGracePeriodStatus(fundedAt: string | undefined): GracePeriodStatus {
  const campaign = { fundedAt }
  const endsAt = getGracePeriodEndsAt(campaign)
  const active = isWithinGracePeriod(campaign)
  const msRemaining = endsAt ? Math.max(0, new Date(endsAt).getTime() - Date.now()) : 0
  return { active, endsAt, msRemaining }
}

/**
 * Live-ticking grace-period status, re-derived every second directly from
 * lib/withdrawal.ts so the withdraw-gating UI reflects the active -> elapsed
 * transition without a page refresh (Issue 34).
 *
 * @param fundedAt - ISO timestamp of when the campaign was funded, or
 *                   undefined when the contract hasn't reported one yet.
 */
export function useGracePeriodStatus(fundedAt: string | undefined): GracePeriodStatus {
  const [status, setStatus] = useState<GracePeriodStatus>(() =>
    computeGracePeriodStatus(fundedAt)
  )

  useEffect(() => {
    const tick = () => setStatus(computeGracePeriodStatus(fundedAt))

    tick()
    const timer = setInterval(tick, TICK_MS)
    return () => clearInterval(timer)
  }, [fundedAt])

  return status
}
