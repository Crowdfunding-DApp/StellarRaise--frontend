"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  TrendingUp,
  Users,
  Wallet,
  Target,
  Sparkles,
  Database,
} from "lucide-react"
import type { AnalyticsResponse } from "@/types/analytics"
import { MetricCard } from "@/components/analytics/MetricCard"
import { FundingOverTime } from "@/components/analytics/FundingOverTime"
import { ReferralBreakdown } from "@/components/analytics/ReferralBreakdown"
import { FunnelMetrics } from "@/components/analytics/FunnelMetrics"

interface AnalyticsDashboardProps {
  data: AnalyticsResponse
}

/**
 * Top-level analytics dashboard. Composes MetricCards + panels. Clearly
 * labels v1-supported metrics vs indexed-placeholder metrics so creators
 * are not misled about the underlying data sources.
 */
export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const { campaignId, campaignTitle, v1, future } = data

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col gap-8"
      aria-label={`Analytics for ${campaignTitle}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide font-semibold text-primary/80">
            Campaign #{campaignId}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
            {campaignTitle}
          </h1>
        </div>
        <div className="rounded-2xl bg-card border border-card-border px-4 py-2 text-xs text-foreground/60 flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>
            Real: raised, goal, deadline. Planned: full indexer (Issue #67).
          </span>
        </div>
      </header>

      {/* Key metrics row */}
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          label="Funding velocity"
          value={`${v1.fundingVelocityXlmPerDay.toLocaleString()} XLM`}
          helper="Average per day across the campaign window"
          icon={<TrendingUp className="w-4 h-4" />}
          badge={{ label: "Mock indexed", tone: "warning" }}
        />
        <MetricCard
          label="Total raised"
          value={`${v1.raised.toLocaleString()} XLM`}
          helper={`of ${v1.goal.toLocaleString()} XLM goal`}
          icon={<Target className="w-4 h-4" />}
          badge={{ label: "Live (contract)", tone: "primary" }}
        />
        <MetricCard
          label="Unique backers"
          value={v1.uniqueBackers.toString()}
          helper={`${v1.totalPledges} total pledges`}
          icon={<Users className="w-4 h-4" />}
          badge={{ label: "Mock indexed", tone: "warning" }}
        />
        <MetricCard
          label="Total pledges"
          value={v1.totalPledges.toString()}
          helper="Including repeat backers"
          icon={<Wallet className="w-4 h-4" />}
          badge={{ label: "Mock indexed", tone: "warning" }}
        />
      </section>

      {/* Funding over time + funnel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FundingOverTime
          points={v1.fundingOverTime}
          className="lg:col-span-2"
        />
        <FunnelMetrics
          v1={v1}
          future={future}
        />
      </section>

      {/* Referral breakdown + scope notes */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReferralBreakdown
          sources={v1.referralBreakdown}
          totalPledgedXlm={v1.raised}
          className="lg:col-span-2"
        />
        <ScopeNotes />
      </section>
    </motion.div>
  )
}

/**
 * Static "scope notes" panel that spells out exactly which numbers are
 * authoritative and which need a future indexer.
 */
function ScopeNotes() {
  return (
    <aside
      aria-label="Data scope notes"
      className="rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-accent/15 text-accent w-9 h-9 rounded-xl flex items-center justify-center"
        >
          <Sparkles className="w-5 h-5" />
        </span>
        <h3 className="text-lg font-bold text-foreground">Data scope</h3>
      </div>
      <ul className="text-sm text-foreground/70 space-y-2">
        <li>
          <strong className="text-foreground">Live (contract)</strong>:{" "}
          <code className="font-mono text-primary">raised</code>,{" "}
          <code className="font-mono text-primary">goal</code>,{" "}
          <code className="font-mono text-primary">deadline</code>.
        </li>
        <li>
          <strong className="text-foreground">Mock indexed (v1)</strong>:
          velocity, time series, backers, referrals. Deterministic
          placeholder data — replaced when the Soroban indexer lands.
        </li>
        <li>
          <strong className="text-foreground">Out of scope (v1)</strong>:
          page views, click-through, conversion rate — all require impression
          tracking.
        </li>
      </ul>
    </aside>
  )
}
