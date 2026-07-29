"use client"

import React, { useEffect, useState } from "react"
import { useWallet } from "@/context/WalletContext"
import { OwnerAuthGate } from "@/components/analytics/OwnerAuthGate"
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard"
import { DashboardSkeleton } from "@/components/analytics/DashboardSkeleton"
import {
  DashboardEmpty,
  DashboardError,
  DashboardUnauthorized,
} from "@/components/analytics/DashboardStates"
import { fetchCampaignAnalytics } from "@/lib/client/analytics-client"
import type { AnalyticsResponse } from "@/types/analytics"

interface CreatorCampaignDashboardProps {
  campaignId: string
}

/**
 * Client-side dashboard for a single campaign. Handles:
 *   - connect wallet prompt (no Freighter session)
 *   - OwnerAuthGate signature challenge (no owner cookie)
 *   - 401/403/404/5xx states appropriately
 *   - empty body (in owner context this is rare)
 *   - authenticated analytics render
 *
 * The data fetch is wired to [address, campaignId, refreshKey] and
 * runs inside the effect using a self-invoking async expression so
 * the asynchronous setState calls live inside the IIFE (which keeps
 * the effect body free of synchronous setState calls).
 */
export function CreatorCampaignDashboard({
  campaignId,
}: CreatorCampaignDashboardProps) {
  const { address } = useWallet()
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [authRequired, setAuthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unauthorised, setUnauthorised] = useState<{
    expected: string | null
    actual: string | null
  } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!address) return
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      setError(null)
      setUnauthorised(null)
      const result = await fetchCampaignAnalytics(campaignId, {
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setLoading(false)
      if (result.ok) {
        setData(result.data)
      } else if (/auth/i.test(result.error)) {
        setAuthRequired(true)
        setData(null)
      } else if (/not the owner/i.test(result.error)) {
        setUnauthorised({ expected: null, actual: address })
        setData(null)
      } else {
        setError(result.error)
        setData(null)
      }
    })()
    return () => controller.abort()
  }, [address, campaignId, refreshKey])

  // Derived view-state from the latest fetched record.
  const showAuthRequired =
    !!address && authRequired && !loading && !data && !error && !unauthorised

  if (!address) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground mb-3">
          Connect your wallet
        </h1>
        <p className="text-foreground/70">
          Connect with Freighter to view analytics for this campaign.
        </p>
      </div>
    )
  }

  if (showAuthRequired) {
    return (
      <OwnerAuthGate
        ownerAddress={null}
        onAuthenticated={() => setRefreshKey((k) => k + 1)}
      />
    )
  }

  if (loading) return <DashboardSkeleton />
  if (unauthorised) return <DashboardUnauthorized {...unauthorised} />
  if (error)
    return (
      <DashboardError
        message={error}
        onRetry={() => setRefreshKey((k) => k + 1)}
      />
    )
  if (!data) {
    return <DashboardEmpty onRetry={() => setRefreshKey((k) => k + 1)} />
  }
  if (!data.isOwner) {
    // Defensive check: server returned a non-owner payload.
    return (
      <DashboardUnauthorized
        expected={null}
        actual={address}
        onRetry={() => setRefreshKey((k) => k + 1)}
      />
    )
  }

  return <AnalyticsDashboard data={data} />
}
