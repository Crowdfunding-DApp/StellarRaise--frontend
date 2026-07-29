"use client"

/**
 * useActivityFeed.ts
 *
 * React hook that maintains a live, paginated feed of pledge events for a
 * campaign contract. Polls Horizon on a fixed interval and prepends new events
 * to the front of the list.
 *
 * Design decisions:
 * - Polling (not SSE streaming) for resilience and rate-limit safety.
 * - Max FEED_MAX_EVENTS entries retained; oldest are dropped on overflow.
 * - Deduplication by pagingToken so rapid polling never doubles entries.
 * - The hook starts in a "paused" state when `contractAddress` is absent,
 *   so it is safe to render before the campaign data resolves.
 */

import { useEffect, useRef, useCallback, useReducer } from "react"
import {
  fetchPledgeEvents,
  type PledgeEvent,
  FEED_MAX_EVENTS,
  FEED_POLL_INTERVAL_MS,
} from "@/lib/activityFeed"

// ─── State ────────────────────────────────────────────────────────────────────

interface FeedState {
  events: PledgeEvent[]
  /** Latest paging token seen — passed as cursor on subsequent polls. */
  latestCursor: string | undefined
  isLoading: boolean
  error: string | null
  /** True after the very first successful fetch. */
  initialized: boolean
}

type FeedAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; events: PledgeEvent[] }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "RESET" }

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null }

    case "FETCH_SUCCESS": {
      if (action.events.length === 0) {
        return { ...state, isLoading: false, initialized: true }
      }

      // Merge new events at the front, deduplicate by pagingToken
      const existing = new Set(state.events.map((e) => e.pagingToken))
      const fresh = action.events.filter((e) => !existing.has(e.pagingToken))

      if (fresh.length === 0) {
        return { ...state, isLoading: false, initialized: true }
      }

      // Prepend and cap at FEED_MAX_EVENTS
      const merged = [...fresh, ...state.events].slice(0, FEED_MAX_EVENTS)

      return {
        ...state,
        events: merged,
        latestCursor: fresh[0].pagingToken, // most recent is first (desc order)
        isLoading: false,
        initialized: true,
      }
    }

    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: action.error }

    case "RESET":
      return initialState

    default:
      return state
  }
}

const initialState: FeedState = {
  events: [],
  latestCursor: undefined,
  isLoading: false,
  error: null,
  initialized: false,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseActivityFeedReturn {
  events: PledgeEvent[]
  isLoading: boolean
  error: string | null
  /** True once at least one successful fetch has completed. */
  initialized: boolean
  /** Manually trigger an immediate refresh. */
  refresh: () => void
}

/**
 * @param contractAddress - Soroban contract/escrow account to watch.
 *                          Pass `null` or `undefined` to pause polling.
 * @param pollInterval    - Override the default poll interval (ms).
 */
export function useActivityFeed(
  contractAddress: string | null | undefined,
  pollInterval = FEED_POLL_INTERVAL_MS
): UseActivityFeedReturn {
  const [state, dispatch] = useReducer(feedReducer, initialState)
  const cursorRef = useRef<string | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)

  const fetchLatest = useCallback(async () => {
    if (!contractAddress) return

    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    dispatch({ type: "FETCH_START" })

    try {
      const events = await fetchPledgeEvents(
        contractAddress,
        cursorRef.current,
        FEED_MAX_EVENTS
      )

      if (controller.signal.aborted) return

      dispatch({ type: "FETCH_SUCCESS", events })

      // Advance cursor to the most recent paging token received
      if (events.length > 0) {
        cursorRef.current = events[0].pagingToken
      }
    } catch (err) {
      if (controller.signal.aborted) return
      const message =
        err instanceof Error ? err.message : "Failed to load activity feed."
      dispatch({ type: "FETCH_ERROR", error: message })
    }
  }, [contractAddress])

  // Initial fetch + polling interval
  useEffect(() => {
    if (!contractAddress) return

    // Reset when the contract address changes (different campaign)
    dispatch({ type: "RESET" })
    cursorRef.current = undefined

    fetchLatest()

    const intervalId = setInterval(fetchLatest, pollInterval)

    return () => {
      clearInterval(intervalId)
      abortRef.current?.abort()
    }
  }, [contractAddress, pollInterval, fetchLatest])

  // Keep cursorRef in sync with reducer state
  useEffect(() => {
    if (state.latestCursor) {
      cursorRef.current = state.latestCursor
    }
  }, [state.latestCursor])

  return {
    events: state.events,
    isLoading: state.isLoading,
    error: state.error,
    initialized: state.initialized,
    refresh: fetchLatest,
  }
}
