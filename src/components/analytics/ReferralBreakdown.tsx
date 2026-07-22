import React from "react"
import { motion } from "framer-motion"
import { Globe2 } from "lucide-react"
import type { PledgerSource } from "@/types/analytics"
import { cn } from "@/lib/utils"

interface ReferralBreakdownProps {
  sources: PledgerSource[]
  totalPledgedXlm: number
  className?: string
}

/**
 * Referral source breakdown panel. Renders each source with its share of
 * backers, pledged XLM and a horizontal share bar.
 */
export function ReferralBreakdown({
  sources,
  totalPledgedXlm,
  className,
}: ReferralBreakdownProps) {
  const totalPledged = sources.reduce((sum, s) => sum + s.pledged, 0) ||
    totalPledgedXlm ||
    0

  const sorted = [...sources].sort(
    (a, b) => (b.pledged || 0) - (a.pledged || 0)
  )

  return (
    <section
      className={cn(
        "rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-4",
        className
      )}
      aria-label="Referral source breakdown"
    >
      <header className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="bg-primary/15 text-primary w-9 h-9 rounded-xl flex items-center justify-center"
        >
          <Globe2 className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Referral source breakdown
          </h3>
          <p className="text-xs text-foreground/60">
            Backers grouped by acquisition source (v1 placeholder — wired to
            Issue #67 indexer when available)
          </p>
        </div>
      </header>

      <div className="space-y-4" role="list">
        {sorted.map((source, idx) => {
          const sharePct = totalPledged
            ? Math.max(0, (source.pledged / totalPledged) * 100)
            : 0
          return (
            <div key={source.id} role="listitem" className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">
                  {source.label}
                </span>
                <span className="text-foreground/60">
                  {source.backers} backers ·{" "}
                  <span className="font-mono text-foreground/80">
                    {source.pledged.toLocaleString()} XLM
                  </span>{" "}
                  <span className="text-foreground/40">
                    ({sharePct.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="h-2 bg-card-border/60 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, sharePct)}%` }}
                  transition={{
                    duration: 0.6,
                    ease: "easeOut",
                    delay: Math.min(idx * 0.03, 0.3),
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
