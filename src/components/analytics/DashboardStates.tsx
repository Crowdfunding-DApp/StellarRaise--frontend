"use client"

import React from "react"
import { AlertCircle, FolderOpen, ShieldAlert, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DashboardStateProps {
  onRetry?: () => void
  className?: string
}

/**
 * Loading / empty / error states for the creator analytics dashboard.
 * Kept as a small single-purpose file so they're easy to swap or restyle.
 */

export function DashboardEmpty({
  onRetry,
  className,
}: DashboardStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl bg-card border border-card-border",
        className
      )}
      role="status"
    >
      <div className="w-16 h-16 rounded-full bg-card-border flex items-center justify-center mb-4">
        <FolderOpen className="w-8 h-8 text-foreground/60" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        No campaigns yet
      </h2>
      <p className="text-foreground/60 max-w-md mb-6">
        We couldn&apos;t find any campaigns owned by this wallet. Once a
        campaign is created on-chain and linked to your address, it will show
        up here.
      </p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      ) : null}
    </div>
  )
}

export function DashboardError({
  message,
  onRetry,
  className,
}: DashboardStateProps & { message: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl bg-card border border-red-500/30",
        className
      )}
      role="alert"
    >
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Failed to load analytics
      </h2>
      <p className="text-foreground/60 max-w-md mb-6">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Try again
        </Button>
      ) : null}
    </div>
  )
}

export function DashboardUnauthorized({
  expected,
  actual,
  onRetry,
  className,
}: {
  expected: string | null
  actual: string | null
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl bg-card border border-amber-500/30",
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
        <ShieldAlert
          className="w-8 h-8 text-amber-400"
          aria-hidden="true"
        />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        Wallet is not the campaign owner
      </h2>
      <p className="text-foreground/60 max-w-md mb-2">
        The wallet you signed with does not own this campaign, so the
        analytics endpoint was refused by the server.
      </p>
      {actual ? (
        <p className="text-xs text-foreground/50 font-mono break-all">
          Connected: {actual}
        </p>
      ) : null}
      {expected ? (
        <p className="text-xs text-foreground/50 font-mono break-all">
          Expected owner: {expected}
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="gap-2 mt-4">
          <RefreshCw className="w-4 h-4" /> Switch wallet or retry
        </Button>
      ) : null}
    </div>
  )
}
