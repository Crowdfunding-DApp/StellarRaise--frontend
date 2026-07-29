/**
 * activityFeed.ts
 *
 * Fetches on-chain pledge activity for a given campaign contract from the
 * Stellar Horizon API using the `payments` endpoint.
 *
 * ─── Privacy Posture ─────────────────────────────────────────────────────────
 * This feed surfaces full backer addresses (truncated for display) and pledge
 * amounts. Stellar is a public ledger — every transaction is permanently
 * visible on-chain by design. Displaying this information in the UI reflects
 * the network's inherent transparency and is consistent with the norms of
 * on-chain crowdfunding platforms (e.g., Gitcoin, Juicebox).
 *
 * Users who wish to preserve privacy may use a fresh, unlinked Stellar address
 * for their pledge. The application does not provide additional obfuscation
 * beyond address truncation in the UI (`GABC...WXYZ`).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Architecture note (Issue 3 / event subscription):
 * Horizon's `payments` endpoint is polled on a configurable interval via the
 * `useActivityFeed` hook rather than opened as a streaming SSE connection.
 * This avoids unbounded connections for high-velocity campaigns and makes the
 * feed resilient to brief RPC interruptions. A cursor is maintained so each
 * poll only fetches new records.
 */

import { Horizon } from "@stellar/stellar-sdk"

/** A single resolved pledge event surfaced in the feed. */
export interface PledgeEvent {
  /** Unique paging token from Horizon (used as React key and cursor). */
  pagingToken: string
  /** Full Stellar address of the backer. */
  backerAddress: string
  /** Amount pledged (string to preserve Stellar's fixed-point precision). */
  amount: string
  /** Asset code — "XLM" for native, or the custom asset code. */
  asset: string
  /** ISO-8601 timestamp from the ledger. */
  timestamp: string
  /** Horizon transaction hash (links to explorer). */
  txHash: string
}

/**
 * Maximum events held in the feed at any time.
 * Older entries are evicted when this limit is exceeded to avoid unbounded
 * memory growth on high-velocity campaigns.
 */
export const FEED_MAX_EVENTS = 50

/**
 * Number of events displayed per "page" before showing the "Show older" control.
 */
export const FEED_PAGE_SIZE = 10

/**
 * Polling interval in milliseconds. 10 s is a reasonable trade-off between
 * freshness and Horizon rate limits on Testnet (default: 100 req/s).
 */
export const FEED_POLL_INTERVAL_MS = 10_000

function getHorizonUrl(): string {
  return (
    process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org"
  )
}

/**
 * Fetches pledge payments sent to `contractAddress` since `cursor`.
 *
 * @param contractAddress - The Soroban contract / escrow account receiving funds.
 * @param cursor          - Horizon paging token from the last seen event.
 *                          Pass `"now"` on first load to get only new events,
 *                          or `undefined` to fetch the most recent batch.
 * @param limit           - Maximum records per request (capped at 200 by Horizon).
 */
export async function fetchPledgeEvents(
  contractAddress: string,
  cursor: string | undefined,
  limit = FEED_MAX_EVENTS
): Promise<PledgeEvent[]> {
  const server = new Horizon.Server(getHorizonUrl(), { allowHttp: false })

  let builder = server
    .payments()
    .forAccount(contractAddress)
    .order("desc")
    .limit(Math.min(limit, 200))

  if (cursor) {
    builder = builder.cursor(cursor)
  }

  const page = await builder.call()

  const events: PledgeEvent[] = []

  for (const record of page.records) {
    // We only care about inbound payments (pledges arriving at the contract).
    // "payment" operations have a `to` field; Soroban invoke-host-function
    // operations appear as "invoke_host_function" — filter accordingly.
    if (record.type !== "payment") continue

    const payment = record as Horizon.ServerApi.PaymentOperationRecord

    // Only inbound transfers (backers sending TO the contract)
    if (payment.to !== contractAddress) continue

    const isNative = payment.asset_type === "native"
    events.push({
      pagingToken: payment.paging_token,
      backerAddress: payment.from,
      amount: payment.amount,
      asset: isNative ? "XLM" : (payment.asset_code ?? "UNKNOWN"),
      timestamp: payment.created_at,
      txHash: payment.transaction_hash,
    })
  }

  return events
}

/** Returns the Horizon stellar.expert explorer URL for a transaction. */
export function explorerTxUrl(txHash: string): string {
  const network =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toLowerCase() === "mainnet"
      ? "public"
      : "testnet"
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`
}

/** Truncates a Stellar address to `GABC...WXYZ` form for display. */
export function truncateAddress(address: string, leading = 4, trailing = 4): string {
  if (address.length <= leading + trailing + 3) return address
  return `${address.slice(0, leading)}...${address.slice(-trailing)}`
}

/** Formats a Stellar amount string with up to 7 decimal places, trimming trailing zeros. */
export function formatAmount(amount: string): string {
  const n = parseFloat(amount)
  if (isNaN(n)) return amount
  // Stellar amounts have up to 7 decimal places
  return n.toLocaleString(undefined, { maximumFractionDigits: 7 })
}

/** Returns a human-readable relative time string (e.g. "2m ago"). */
export function relativeTime(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
