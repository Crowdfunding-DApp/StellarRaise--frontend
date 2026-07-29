"use client"

import React, { useCallback, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, BarChart3 } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/context/WalletContext"
import { Button } from "@/components/ui/button"
import { OwnerAuthGate } from "@/components/analytics/OwnerAuthGate"
import { DashboardSkeleton } from "@/components/analytics/DashboardSkeleton"
import {
  DashboardEmpty,
  DashboardError,
} from "@/components/analytics/DashboardStates"

interface OwnedCampaignSummary {
  id: string
  title: string
  raised: number
  goal: number
  deadline: string
  image: string
}

/**
 * Client-side landing page for `/dashboard`. Handles:
 *   - "Connect wallet" prompt when no Freighter session.
 *   - OwnerAuthGate when wallet is present but no owner-cookie session.
 *   - Authenticated list of owned campaigns (or empty / error states).
 */
export function CreatorDashboardClient() {
  const { address } = useWallet()
  const [campaigns, setCampaigns] = useState<OwnedCampaignSummary[] | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authRequired, setAuthRequired] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  /**
   * We probe the server to see whether an owner session is active. The
   * owner auth gate flips this back to true if it isn't.
   */
  const probe = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      try {
        const res = await fetch("/api/owner/campaigns", {
          credentials: "include",
          signal,
          headers: { Accept: "application/json" },
        })
        return res.ok
      } catch {
        return false
      }
    },
    []
  )

  // Attempt to load owned campaigns whenever the wallet changes or we
  // re-trigger a refresh (e.g., after a successful auth).
  useEffect(() => {
    if (!address) {
      setCampaigns(null)
      setLoading(false)
      setError(null)
      setAuthRequired(false)
      return
    }
    const controller = new AbortController()
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const ok = await probe(controller.signal)
        if (!ok) {
          setAuthRequired(true)
          setCampaigns(null)
          return
        }
        setAuthRequired(false)
        const res = await fetch("/api/owner/campaigns", {
          credentials: "include",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          setError(
            (json && typeof json.error === "string"
              ? json.error
              : null) ?? `Failed to load (HTTP ${res.status}).`
          )
          setCampaigns([])
          return
        }
        const list = Array.isArray(json?.campaigns)
          ? (json.campaigns as OwnedCampaignSummary[])
          : []
        setCampaigns(list)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(
          err instanceof Error ? err.message : "Network error loading campaigns."
        )
        setCampaigns([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [address, refreshKey, probe])

  // Wallet not connected — show CTA.
  if (!address) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-primary/15 text-primary mx-auto flex items-center justify-center mb-6">
          <Wallet className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
          Creator Analytics
        </h1>
        <p className="text-foreground/70 mb-8">
          Connect your Stellar wallet to view the campaigns you own. You will
          then sign a one-time challenge message to authenticate as the
          owner — no transaction is broadcast.
        </p>
        <AuthLauncher />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-primary/80">
            Creator analytics
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
            Your campaigns
          </h1>
          <p className="text-foreground/60 mt-1">
            Signed in as <span className="font-mono">{short(address)}</span>
          </p>
        </div>
      </header>

      {authRequired ? (
        <OwnerAuthGate ownerAddress={null} onAuthenticated={() => setRefreshKey((k) => k + 1)} />
      ) : loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <DashboardError
          message={error}
          onRetry={() => setRefreshKey((k) => k + 1)}
        />
      ) : campaigns && campaigns.length === 0 ? (
        <DashboardEmpty onRetry={() => setRefreshKey((k) => k + 1)} />
      ) : (
        <CampaignGrid campaigns={campaigns ?? []} />
      )}
    </div>
  )
}

function CampaignGrid({ campaigns }: { campaigns: OwnedCampaignSummary[] }) {
  return (
    <motion.ul
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role="list"
    >
      <AnimatePresence>
        {campaigns.map((c) => {
          const progress = c.goal ? (c.raised / c.goal) * 100 : 0
          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Link
                href={`/dashboard/${c.id}`}
                aria-label={`Open analytics for ${c.title}`}
                className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
              >
                <article className="rounded-2xl bg-card border border-card-border overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 transform hover:-translate-y-0.5">
                  {c.image ? (
                    <div className="h-32 bg-card-border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.image}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-primary/30 to-accent/30" />
                  )}
                  <div className="p-5 flex flex-col gap-3">
                    <h3 className="text-base font-bold text-foreground line-clamp-1">
                      {c.title}
                    </h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-semibold">
                        {c.raised.toLocaleString()} XLM
                      </span>
                      <span className="text-foreground/60">
                        of {c.goal.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-card-border rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.max(2, progress))}%`,
                        }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary to-accent"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      tabIndex={-1}
                    >
                      <BarChart3 className="w-4 h-4" />
                      Open analytics
                    </Button>
                  </div>
                </article>
              </Link>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </motion.ul>
  )
}

function AuthLauncher() {
  const { connect, isConnecting } = useWallet()
  return (
    <Button
      onClick={connect}
      disabled={isConnecting}
      aria-label={isConnecting ? "Connecting wallet…" : "Connect wallet"}
      className="gap-2 shadow-primary/30"
    >
      <Wallet className="w-4 h-4" aria-hidden="true" />
      {isConnecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  )
}

function short(addr: string) {
  if (addr.length < 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
