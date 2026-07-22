/**
 * Types shared between the Creator Analytics Dashboard client and server code.
 * Kept framework-agnostic so they can be safely imported by API routes and
 * React components.
 */

/**
 * A single pledge event used to compute funding velocity and total funding
 * over time. In v1 these are derived from a deterministic, server-side mock
 * indexer (see src/lib/server/analytics-provider.ts) because the live Soroban
 * contract does not yet expose a historical event log. When a real indexer is
 * wired in (Issue #67 follow-up), only the producer for these events changes.
 */
export interface PledgeEvent {
  /** ISO-8601 timestamp the pledge was recorded */
  timestamp: string
  /** Amount pledged in XLM */
  amount: number
  /** Wallet address of the backer (pseudo-random for v1 mock data) */
  backer: string
  /** "Direct", "Twitter", "ReferralLink:<id>" etc. */
  source: PledgerSource
}

/**
 * A referral "source" — where a backer came from. In v1 this list is
 * illustrative and seeded deterministically. When Issue #67 indexed referral
 * data is available, this is replaced with real on-chain referral codes.
 */
export interface PledgerSource {
  id: string
  label: string
  /** Number of backers attributed to this source */
  backers: number
  /** XLM pledged via this source */
  pledged: number
}

/**
 * v1-supported metrics derived from indexed pledge events.
 *
 * IMPORTANT: `velocity`, `timeSeries`, `backers`, and `referrals` are produced
 * by a server-side mock indexer because we currently have no real event index.
 * They are clearly labelled in the UI (see `AnalyticsDashboard.tsx`).
 *
 * `raised`, `goal`, and `deadline` are real values fetched from the deployed
 * Soroban contract via `getCampaigns()`.
 */
export interface V1SupportedMetrics {
  /** Total XLM raised, sourced from the Soroban contract */
  raised: number
  /** Funding goal XLM, sourced from the Soroban contract */
  goal: number
  /** ISO deadline from the Soroban contract */
  deadline: string
  /** Funding velocity in XLM / day averaged over the recent window */
  fundingVelocityXlmPerDay: number
  /** Time-bucketed totals of cumulative XLM raised, oldest first */
  fundingOverTime: FundingOverTimePoint[]
  /** Distinct backer count (deduplicated by wallet address) */
  uniqueBackers: number
  /** Total number of pledge events */
  totalPledges: number
  /** Breakdown of backers by acquisition source */
  referralBreakdown: PledgerSource[]
}

/**
 * Future (out-of-scope for v1) funnel metrics that require impression tracking
 * to compute. Listed here so the dashboard can render explicit "Requires
 * impression tracking" placeholders.
 */
export interface FutureFunnelMetrics {
  pageViews: { available: false; reason: string }
  clickThroughRate: { available: false; reason: string }
  conversionRate: { available: false; reason: string }
  impressionsToBackerRatio: { available: false; reason: string }
}

/**
 * One point on the funding-over-time chart.
 */
export interface FundingOverTimePoint {
  /** ISO-8601 day bucket (YYYY-MM-DD) */
  date: string
  /** XLM pledged on this day */
  pledgedToday: number
  /** Cumulative XLM pledged up to and including this day */
  cumulative: number
}

/**
 * The full payload returned by `GET /api/analytics/[campaignId]`.
 */
export interface AnalyticsResponse {
  campaignId: string
  campaignTitle: string
  /** True if the requester is the verified owner of this campaign */
  isOwner: boolean
  /** v1 metrics (real + indexed-placeholder) */
  v1: V1SupportedMetrics
  /** Out-of-scope funnel metrics, fully described in the response */
  future: FutureFunnelMetrics
}

/**
 * Owner challenge payload. The server returns this for the client to sign
 * with Freighter's `signMessage` to prove wallet control.
 */
export interface AuthChallenge {
  /** Random 32-character hex nonce */
  nonce: string
  /** ISO timestamp the challenge was issued */
  issuedAt: string
  /** The exact message the client must sign verbatim */
  message: string
  /** Lifetime in seconds */
  ttlSeconds: number
}

/**
 * Successful auth verification response. The server attaches an HttpOnly
 * HMAC-signed session cookie to the response.
 */
export interface AuthVerifySuccess {
  ok: true
  address: string
  expiresAt: string
}

/**
 * Error response shape returned by auth / analytics endpoints.
 */
export interface ApiErrorResponse {
  ok: false
  error: string
}
