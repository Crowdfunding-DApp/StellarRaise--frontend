"use client"

/**
 * ActivityFeed.tsx
 *
 * Displays a live, paginated feed of on-chain pledge events for a campaign.
 *
 * Features:
 * - Animates new entries in from the top with Framer Motion
 * - Paginates at FEED_PAGE_SIZE entries; "Show older" loads the next page
 * - Skeleton loader during the first fetch
 * - Inline error state with retry
 * - Empty state for campaigns with no pledges yet
 * - Polling indicator (subtle pulse) so users know the feed is live
 * - Accessible: uses <time> for timestamps, aria-live for new-entry announcements
 *
 * Privacy: addresses and amounts are public on-chain data; see activityFeed.ts.
 */

import React, { useState, useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { RefreshCw, ExternalLink, Activity, AlertCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useActivityFeed } from "@/hooks/useActivityFeed"
import {
  truncateAddress,
  formatAmount,
  relativeTime,
  explorerTxUrl,
  type PledgeEvent,
  FEED_PAGE_SIZE,
} from "@/lib/activityFeed"
import { cn } from "@/lib/utils"

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading activity feed">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/40 animate-pulse"
        >
          <div className="w-8 h-8 rounded-full bg-card-border shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-card-border rounded w-2/3" />
            <div className="h-3 bg-card-border rounded w-1/3" />
          </div>
          <div className="h-3 bg-card-border rounded w-12" />
        </div>
      ))}
    </div>
  )
}

interface FeedRowProps {
  event: PledgeEvent
  isNew: boolean
}

function FeedRow({ event, isNew }: FeedRowProps) {
  const [relTime, setRelTime] = useState(() => relativeTime(event.timestamp))

  // Update relative time every 30 s while the row is mounted
  useEffect(() => {
    const id = setInterval(() => setRelTime(relativeTime(event.timestamp)), 30_000)
    return () => clearInterval(id)
  }, [event.timestamp])

  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -10 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
        "hover:bg-card-border/30",
        isNew && "bg-primary/5 border border-primary/20"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          "bg-gradient-to-br from-primary/30 to-accent/30 text-primary"
        )}
        aria-hidden="true"
      >
        {event.backerAddress.slice(1, 3).toUpperCase()}
      </div>

      {/* Address + amount */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-foreground/90 truncate">
          {truncateAddress(event.backerAddress)}
        </p>
        <p className="text-xs text-foreground/50 truncate">
          pledged{" "}
          <span className="text-primary font-semibold">
            {formatAmount(event.amount)} {event.asset}
          </span>
        </p>
      </div>

      {/* Timestamp + explorer link */}
      <div className="flex items-center gap-1.5 shrink-0">
        <time
          dateTime={event.timestamp}
          title={new Date(event.timestamp).toLocaleString()}
          className="text-xs text-foreground/40 tabular-nums"
        >
          {relTime}
        </time>
        <a
          href={explorerTxUrl(event.txHash)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View transaction ${event.txHash.slice(0, 8)} on Stellar Expert`}
          className="text-foreground/30 hover:text-primary transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ActivityFeedProps {
  /**
   * The Soroban contract address / escrow account to watch.
   * When null/undefined the feed renders a placeholder.
   */
  contractAddress: string | null | undefined
  className?: string
}

export function ActivityFeed({ contractAddress, className }: ActivityFeedProps) {
  const { events, isLoading, error, initialized, refresh } =
    useActivityFeed(contractAddress)

  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE)
  const [newTokens, setNewTokens] = useState<Set<string>>(new Set())
  const prevEventsRef = useRef<PledgeEvent[]>([])

  // Track which events are newly arrived (to highlight them briefly)
  useEffect(() => {
    if (!initialized || events.length === 0) return

    const prevTokens = new Set(prevEventsRef.current.map((e) => e.pagingToken))
    const incoming = events
      .filter((e) => !prevTokens.has(e.pagingToken))
      .map((e) => e.pagingToken)

    if (incoming.length > 0) {
      setNewTokens(new Set(incoming))
      // Clear highlight after 3 s
      const timeout = setTimeout(
        () => setNewTokens(new Set()),
        3_000
      )
      prevEventsRef.current = events
      return () => clearTimeout(timeout)
    }

    prevEventsRef.current = events
  }, [events, initialized])

  const visibleEvents = events.slice(0, visibleCount)
  const hasMore = events.length > visibleCount

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-card-border bg-card/50 p-4",
        className
      )}
      aria-label="Live pledge activity"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">Live Activity</h3>
          {/* Live pulse indicator */}
          <span
            className="relative flex h-2 w-2"
            aria-label="Feed is live"
            title="Polling for new pledges every 10 seconds"
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
        </div>

        <button
          onClick={refresh}
          disabled={isLoading}
          className={cn(
            "p-1 rounded-lg text-foreground/40 hover:text-foreground/80 transition-colors",
            isLoading && "animate-spin text-primary"
          )}
          aria-label="Refresh activity feed"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Aria-live region announces new pledge count to screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {newTokens.size > 0
          ? `${newTokens.size} new pledge${newTokens.size > 1 ? "s" : ""} received`
          : ""}
      </div>

      {/* Content */}
      {!initialized && isLoading ? (
        <FeedSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" aria-hidden="true" />
          <p className="text-sm text-foreground/60">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Zap
            className="w-8 h-8 text-foreground/20"
            aria-hidden="true"
          />
          <p className="text-sm text-foreground/40">
            No pledges yet — be the first backer!
          </p>
        </div>
      ) : (
        <>
          <AnimatePresence initial={false}>
            {visibleEvents.map((event) => (
              <FeedRow
                key={event.pagingToken}
                event={event}
                isNew={newTokens.has(event.pagingToken)}
              />
            ))}
          </AnimatePresence>

          {hasMore && (
            <button
              onClick={() => setVisibleCount((c) => c + FEED_PAGE_SIZE)}
              className="text-xs text-foreground/40 hover:text-foreground/70 transition-colors text-center py-1"
            >
              Show {Math.min(FEED_PAGE_SIZE, events.length - visibleCount)} older pledges
            </button>
          )}
        </>
      )}

      {/* Footer privacy note */}
      <p className="text-[10px] text-foreground/25 text-center border-t border-card-border pt-2 mt-1">
        All pledge activity is publicly visible on the Stellar ledger.
      </p>
    </section>
  )
}
