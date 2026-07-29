"use client"

import { useMemo } from "react"
import {
  isFlagEnabled,
  getFlagDefinition,
  getAllFlagStates,
  type FlagDefinition,
} from "@/lib/feature-flags"

/**
 * React hook for consuming feature flags in client components.
 *
 * Keeps flag-check overhead negligible — the evaluation is a memoised
 * O(1) Map lookup + optional hash — so it is safe to call in hot
 * paths like campaign-rendering loops.
 *
 * @param flagName - The kebab-case flag key (e.g. "indexer-migration").
 * @param seed     - Optional stable identifier (wallet address, user id).
 *                   When omitted, an anonymous session-scoped seed is used.
 *
 * @example
 * ```tsx
 * const { enabled, definition } = useFeatureFlag("indexer-migration", walletAddress)
 *
 * if (enabled) {
 *   return <NewIndexerComponent />
 * }
 * return <LegacyComponent />
 * ```
 */
export function useFeatureFlag(
  flagName: string,
  seed?: string | null
): {
  enabled: boolean
  definition: FlagDefinition | undefined
} {
  const state = useMemo(
    () => ({
      enabled: isFlagEnabled(flagName, seed),
      definition: getFlagDefinition(flagName),
    }),
    [flagName, seed]
  )
  return state
}

/**
 * React hook that returns the evaluated state of **all** registered
 * feature flags. Useful for debugging panels, admin UIs, or analytics.
 *
 * @param seed - Optional stable identifier for percentage-rollout bucketing.
 */
export function useAllFeatureFlags(
  seed?: string | null
): Record<string, { definition: FlagDefinition; enabled: boolean }> {
  const states = useMemo(() => getAllFlagStates(seed), [seed])
  return states
}
