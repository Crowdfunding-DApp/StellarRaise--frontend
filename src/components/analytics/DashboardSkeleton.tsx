import React from "react"
import { cn } from "@/lib/utils"

/**
 * Loading skeleton for the analytics dashboard. Mirrors the layout of the
 * real Metrics + Panels to avoid layout shift.
 */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-6 animate-pulse", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading analytics"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-card border border-card-border"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-72 rounded-2xl bg-card border border-card-border lg:col-span-2" />
        <div className="h-72 rounded-2xl bg-card border border-card-border" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-96 rounded-2xl bg-card border border-card-border lg:col-span-2" />
        <div className="h-96 rounded-2xl bg-card border border-card-border" />
      </div>
    </div>
  )
}
