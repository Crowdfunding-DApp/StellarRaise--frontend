import type { Campaign } from "@/lib/soroban"

/**
 * v1 Owner registry.
 *
 * In production, campaign ownership is read from the deployed Soroban
 * contract's per-campaign owner field. The current contract binding in
 * `src/lib/soroban.ts` does not yet expose `owner`, so we maintain an
 * authoritative in-memory mapping as a placeholder.
 *
 * SECURITY: This is server-only data. It is consulted exclusively by API
 * routes that have already verified the requesting wallet's signature. The
 * ownership map MUST not be exposed to the client or imported by `"use
 * client"` components.
 */
const CAMPAIGN_OWNERS: Record<string, string> = {
  // Demo creators. Replace with real on-chain owner lookup once the contract
  // exposes the `owner` field (tracked by a follow-up issue).
  "1": "GBZXN7PIRUKQTXR7V4WSJCYWZGQPGFQHBFQWJHHGR3ZNQXVVGXXKQWVZ",
  "2": "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
}

/**
 * Returns the on-chain owner address for a given campaign id, or `null` if
 * no owner is registered. Intentionally returns `null` (rather than throwing)
 * so callers can render a friendly "no owner declared yet" empty state.
 */
export function getCampaignOwner(campaignId: string): string | null {
  return CAMPAIGN_OWNERS[campaignId] ?? null
}

/**
 * Filter a list of campaigns down to those owned by the provided `address`.
 * Returns `[]` if `address` is missing or no ownership matches.
 */
export function filterOwnedCampaigns(
  campaigns: Campaign[],
  address: string | null
): Array<Campaign & { owner: string }> {
  if (!address) return []
  return campaigns
    .filter((c) => CAMPAIGN_OWNERS[c.id] === address)
    .map((c) => ({ ...c, owner: address }))
}
