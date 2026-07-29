import React from "react"
import { Filter, Lock } from "lucide-react"
import type { FutureFunnelMetrics } from "@/types/analytics"
import { cn } from "@/lib/utils"

interface FunnelMetricsProps {
  v1: {
    uniqueBackers: number
    totalPledges: number
    fundingVelocityXlmPerDay: number
  }
  future: FutureFunnelMetrics
  className?: string
}

/**
 * Funnel metrics panel. Clearly separates v1 metrics we already compute
 * (backers, total pledges, velocity) from future metrics that require
 * impression tracking.
 *
 * Future metrics are intentionally labelled "Requires impression tracking"
 * so we are explicit about v1 scope.
 */
export function FunnelMetrics({ v1, future, className }: FunnelMetricsProps) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-5",
        className
      )}
      aria-label="Funnel metrics"
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-primary/15 text-primary w-9 h-9 rounded-xl flex items-center justify-center"
        >
          <Filter className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-foreground">Funnel metrics</h3>
          <p className="text-xs text-foreground/60">
            v1 supported metrics and future impression-tracking metrics
          </p>
        </div>
      </header>

      {/* v1 supported metrics */}
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wide font-semibold text-primary/80">
          v1 — supported
        </div>
        <ul className="space-y-2">
          <FunnelRow label="Unique backers" value={v1.uniqueBackers.toString()} />
          <FunnelRow label="Total pledges" value={v1.totalPledges.toString()} />
          <FunnelRow
            label="Funding velocity"
            value={`${v1.fundingVelocityXlmPerDay.toLocaleString()} XLM / day`}
            helper="Average across the active campaign window"
          />
        </ul>
      </div>

      {/* Future funnel metrics requiring impression tracking */}
      <div className="space-y-2 pt-4 border-t border-card-border">
        <div className="text-xs uppercase tracking-wide font-semibold text-foreground/60">
          Future — requires impression tracking
        </div>
        <ul className="space-y-2" aria-label="Out of scope for v1">
          <LockedFunnelRow
            label="Page views"
            reason={future.pageViews.reason}
          />
          <LockedFunnelRow
            label="Click-through rate"
            reason={future.clickThroughRate.reason}
          />
          <LockedFunnelRow
            label="Conversion rate"
            reason={future.conversionRate.reason}
          />
          <LockedFunnelRow
            label="Impressions to backer ratio"
            reason={future.impressionsToBackerRatio.reason}
          />
        </ul>
        <p className="text-xs text-foreground/50 pt-2">
          Out-of-scope for v1. Will be enabled when a front-end impression
          tracker feeds the Issue #67 indexer.
        </p>
      </div>
    </section>
  )
}

function FunnelRow({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-foreground/80">{label}</span>
      <div className="text-right">
        <div className="font-mono font-semibold text-foreground">{value}</div>
        {helper ? (
          <div className="text-[11px] text-foreground/50">{helper}</div>
        ) : null}
      </div>
    </li>
  )
}

function LockedFunnelRow({ label, reason }: { label: string; reason: string }) {
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <div className="flex items-start gap-2">
        <Lock
          aria-hidden="true"
          className="w-4 h-4 mt-0.5 text-foreground/40 shrink-0"
        />
        <div>
          <div className="text-foreground/80">{label}</div>
          <div className="text-[11px] text-foreground/50 leading-snug max-w-xs">
            {reason}
          </div>
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-wide font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 h-fit">
        Coming soon
      </span>
    </li>
  )
}
