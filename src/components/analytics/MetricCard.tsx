import React from "react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  /** Optional caption / secondary text below the value. */
  helper?: string
  /** Optional inline icon element. */
  icon?: React.ReactNode
  /** Highlight for at-a-glance status (e.g. "live" badge). */
  badge?: { label: string; tone: "primary" | "warning" | "muted" }
  className?: string
}

/**
 * Reusable metric card used by the analytics dashboard. Keeps the same
 * visual language as existing card / panel components (rounded-2xl, border,
 * dark surface).
 */
export function MetricCard({
  label,
  value,
  helper,
  icon,
  badge,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card border border-card-border p-5 flex flex-col gap-2",
        "transition-colors hover:border-primary/40",
        className
      )}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground/60 text-sm font-medium">
          {icon ? (
            <span aria-hidden="true" className="text-primary">
              {icon}
            </span>
          ) : null}
          <span>{label}</span>
        </div>
        {badge ? (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              badge.tone === "primary" &&
                "bg-primary/15 text-primary border border-primary/30",
              badge.tone === "warning" &&
                "bg-amber-500/10 text-amber-400 border border-amber-500/30",
              badge.tone === "muted" &&
                "bg-card-border/40 text-foreground/60 border border-card-border"
            )}
          >
            {badge.label}
          </span>
        ) : null}
      </div>
      <div className="text-3xl font-extrabold text-foreground leading-tight">
        {value}
      </div>
      {helper ? (
        <div className="text-xs text-foreground/60 leading-snug">{helper}</div>
      ) : null}
    </div>
  )
}
