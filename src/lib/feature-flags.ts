/**
 * Feature Flag System — Stellar Raise Interface
 * ===============================================
 *
 * A config-driven, progressive-rollout mechanism for safely shipping
 * in-progress features without hard cutovers.
 *
 * ## Design Decisions
 *
 * - **Boolean flags** enable/disable a feature entirely.
 * - **Percentage-rollout flags** enable a feature for a given % of users
 *   by hashing a stable user identifier (default: anonymous session hash).
 * - **No sensitive data leaks:** Flag state is evaluated client-side via
 *   a public config file – no NEXT_PUBLIC_* env var exposure for rollout
 *   specifics.  Remote-toggleable flags (future) should use a secure
 *   endpoint that authenticates the request; do NOT embed admin secrets
 *   in public bundles.
 * - **Check overhead** is kept negligible: flag lookups are O(1) Map
 *   reads + optional string hash; no async/await in hot paths.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlagType = "boolean" | "percentage-rollout"

export interface BooleanFlag {
  type: "boolean"
  enabled: boolean
}

export interface PercentageRolloutFlag {
  type: "percentage-rollout"
  /** 0–100 integer representing the percentage of users who see the feature */
  percentage: number
  /** Optional stable identifier (e.g. wallet address) used for consistent
   *  bucketing. Falls back to a session-stored anonymous hash when null. */
  seedKey?: string
}

export type FlagDefinition = BooleanFlag | PercentageRolloutFlag

export type FeatureFlagMap = ReadonlyMap<string, FlagDefinition>

// ---------------------------------------------------------------------------
// Flag Registry — Add new flags here
// ---------------------------------------------------------------------------

/** All feature flags with their current rollout configuration.
 *
 *  🚨 IMPORTANT — Adding a new flag:
 *  1. Choose a unique kebab-case key.
 *  2. Decide between `boolean` or `percentage-rollout`.
 *  3. Document its purpose in the comment beside the entry.
 *  4. Update FEATURE_FLAGS.md with the new flag name, type, and
 *     intended removal criteria.
 */
const FLAG_REGISTRY: Record<string, FlagDefinition> = {
  // ---- Issue 49: Indexer Migration ----
  // Migrate contract-read calls from the deprecated Soroban RPC
  // `simulateTransaction` flow to the new indexer endpoint.
  // Currently in percentage-rollout (10%) for gradual validation.
  "indexer-migration": {
    type: "percentage-rollout",
    percentage: 10,
  },

  // ---- Issue 70: Admin Moderation Console ----
  // Enables the admin console at /admin for reviewing, suspending, and
  // annotating campaigns.  Requires NEXT_PUBLIC_ADMIN_SECRET to be set.
  // Boolean flag so it can be toggled off entirely in production until
  // a proper backend auth system is integrated.
  "admin-console": {
    type: "boolean",
    enabled: true,
  },
} as const

// ---------------------------------------------------------------------------
// Evaluation Helpers
// ---------------------------------------------------------------------------

const flagMap: FeatureFlagMap = new Map(Object.entries(FLAG_REGISTRY))

/**
 * Deterministic hash of a string into a number in [0, 100).
 * Used for percentage-rollout bucketing — same input always yields
 * the same bucket.
 */
function hashToBucket(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % 100
}

/**
 * Retrieve a stable anonymous seed for the current session.
 * Persisted in sessionStorage so the same user sees consistent
 * flag state within a browsing session.
 */
function getAnonymousSeed(): string {
  if (typeof window === "undefined") return "ssr-fallback-seed"
  try {
    const STORAGE_KEY = "stellar_raise_flag_seed"
    let seed = sessionStorage.getItem(STORAGE_KEY)
    if (!seed) {
      seed = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
      sessionStorage.setItem(STORAGE_KEY, seed)
    }
    return seed
  } catch {
    return Math.random().toString(36).slice(2)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a feature flag is active for the current context.
 *
 * - **Boolean flags** return `definition.enabled` directly.
 * - **Percentage-rollout flags** hash the seed (wallet address, or
 *   anonymous session id) into a bucket and return `true` if the
 *   bucket falls below the configured percentage.
 *
 * @param flagName - The kebab-case key of the flag (e.g. "indexer-migration").
 * @param seed     - Optional stable identifier (wallet address, user id).
 *                   When omitted, an anonymous session-scoped seed is used.
 *
 * @example
 * ```ts
 * if (isFlagEnabled("indexer-migration", walletAddress)) {
 *   // use new indexer path
 * } else {
 *   // use legacy path
 * }
 * ```
 */
export function isFlagEnabled(
  flagName: string,
  seed?: string | null
): boolean {
  const definition = flagMap.get(flagName)
  if (!definition) return false

  switch (definition.type) {
    case "boolean":
      return definition.enabled

    case "percentage-rollout": {
      const effectiveSeed = seed ?? getAnonymousSeed()
      const bucket = hashToBucket(effectiveSeed + flagName)
      return bucket < definition.percentage
    }

    default:
      return false
  }
}

/**
 * Return the raw `FlagDefinition` object for a flag, or `undefined`
 * if the flag is not registered. Useful for debugging / admin panels.
 */
export function getFlagDefinition(
  flagName: string
): FlagDefinition | undefined {
  return flagMap.get(flagName)
}

/**
 * Return a snapshot of all registered flags and their current
 * evaluated state (using the provided seed, or anonymous).
 * Useful for debugging or rendering an admin dashboard.
 */
export function getAllFlagStates(
  seed?: string | null
): Record<string, { definition: FlagDefinition; enabled: boolean }> {
  const states: Record<string, { definition: FlagDefinition; enabled: boolean }> =
    {}
  for (const [name, def] of flagMap.entries()) {
    states[name] = { definition: def, enabled: isFlagEnabled(name, seed) }
  }
  return states
}
