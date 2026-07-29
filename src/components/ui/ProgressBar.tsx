"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProgressBarProps {
  progress: number // 0 to 100
  className?: string
  label?: string
}

export function ProgressBar({ progress, className, label }: ProgressBarProps) {
  // Ensure progress is within 0-100 bounds
  const clampedProgress = Math.min(Math.max(progress, 0), 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${Math.round(clampedProgress)}% funded`}
      className={cn("w-full bg-card-border rounded-full overflow-hidden h-3", className)}
    >
      {/* from-primary/to-accent are AA-large-text tints only; primary-300/accent-300
          keep the same hue family but clear the 3:1 non-text contrast minimum
          against the card-border track (raw primary/accent land at ~2.3-2.6:1). */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clampedProgress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full rounded-full bg-gradient-to-r from-primary-300 to-accent-300 shadow-[0_0_10px_rgba(129,140,248,0.5)]"
      />
    </div>
  )
}
