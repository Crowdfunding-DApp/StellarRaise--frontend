import React from "react"
import { motion } from "framer-motion"
import type { FundingOverTimePoint } from "@/types/analytics"
import { cn } from "@/lib/utils"

interface FundingOverTimeProps {
  points: FundingOverTimePoint[]
  className?: string
}

/**
 * Funding-over-time panel — renders a simple horizontal bar series so we
 * don't have to add a new chart dependency. Each row shows the day, daily
 * pledge amount and cumulative total.
 */
export function FundingOverTime({ points, className }: FundingOverTimeProps) {
  if (!points.length) {
    return (
      <div
        className={cn(
          "rounded-2xl bg-card border border-card-border p-6 text-center text-foreground/60",
          className
        )}
      >
        No pledge activity yet.
      </div>
    )
  }

  const maxDaily = Math.max(...points.map((p) => p.pledgedToday), 0)
  const last = points[points.length - 1]

  return (
    <section
      className={cn(
        "rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-4",
        className
      )}
      aria-label="Total funding over time"
    >
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Funding over time</h3>
          <p className="text-xs text-foreground/60">
            Daily XLM pledged and cumulative total
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-foreground/60">Cumulative</div>
          <div className="text-xl font-extrabold text-primary">
            {last.cumulative.toLocaleString()} XLM
          </div>
        </div>
      </header>

      <div className="space-y-3" role="list">
        {points.map((p, idx) => {
          const widthPct = maxDaily
            ? Math.max(2, (p.pledgedToday / maxDaily) * 100)
            : 0
          return (
            <div key={p.date} role="listitem" className="space-y-1">
              <div className="flex justify-between text-xs text-foreground/60">
                <span>{formatDay(p.date)}</span>
                <span className="font-mono text-foreground/80">
                  {p.pledgedToday.toLocaleString()} XLM
                </span>
              </div>
              <div className="h-3 bg-card-border/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{
                    duration: 0.7,
                    ease: "easeOut",
                    delay: Math.min(idx * 0.02, 0.4),
                  }}
                  className="h-full bg-gradient-to-r from-primary to-accent"
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}
