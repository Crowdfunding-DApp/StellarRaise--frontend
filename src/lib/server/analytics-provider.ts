import type {
  FundingOverTimePoint,
  PledgeEvent,
  PledgerSource,
  V1SupportedMetrics,
  FutureFunnelMetrics,
  AnalyticsResponse,
} from "@/types/analytics"
import type { Campaign } from "@/lib/soroban"

/**
 * v1 Analytics provider.
 *
 * Generates deterministic, mock-indexed analytics for a campaign by combining
 *   1. Real values from the deployed Soroban contract (`raised`, `goal`,
 *      `deadline`) via `Campaign` from `getCampaigns()`.
 *   2. Mock indexed pledge events whose total exactly matches `raised`, so the
 *      UI never displays mathematically inconsistent numbers.
 *
 * The mock layer is a placeholder for a real backend indexer (Soroban
 * event log consumer). It is intentionally deterministic per `campaignId`
 * so that page refreshes and unit tests yield identical output.
 *
 * SECURITY: This module is server-only. The mock data MUST NOT be exposed
 * to a client whose wallet has not been verified as the campaign owner.
 */

/** List of human-readable acquisition sources used for the v1 mock. */
const SOURCES = [
  { id: "direct", label: "Direct" },
  { id: "twitter", label: "Twitter" },
  { id: "reddit", label: "Reddit" },
  { id: "newsletter", label: "Newsletter" },
  { id: "partner", label: "Partner site" },
] as const

type SourceId = (typeof SOURCES)[number]["id"]

/**
 * Tiny fast deterministic 32-bit PRNG (mulberry32) seeded from a string.
 * Stable per `campaignId`, so mock analytics never change between requests
 * for the same campaign.
 */
function seededRandom(seed: string): () => number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  let t = h
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build the synthetic event window. v1 campaigns are assumed to have started
 * 30 days before their declared deadline. This avoids requiring a real
 * `start_date` field on the contract.
 */
function eventWindow(deadline: string) {
  const end = new Date(deadline).getTime()
  const start = end - 30 * 24 * 60 * 60 * 1000
  return { start, end }
}

interface MockIndexedEvents {
  events: PledgeEvent[]
  sources: Record<SourceId, number>
  backers: Set<string>
}

/**
 * Generate deterministic mock pledge events for `campaign`. Total amount is
 * normalised to exactly `raised` so the series reconciles with the on-chain
 * total.
 */
function generateMockEvents(campaign: Campaign): MockIndexedEvents {
  const { start, end } = eventWindow(campaign.deadline)
  const spanDays = Math.max(
    1,
    Math.ceil((end - start) / (24 * 60 * 60 * 1000))
  )
  const rand = seededRandom(`stellar-raise:${campaign.id}`)

  // Pick a deterministic pledge count per campaign; clamp between 4 and 80.
  const pledgeCount = 4 + Math.floor(rand() * 76)

  // Fractional amounts per pledge — keeps variety but normalises to raised.
  const fractions: number[] = []
  let totalFraction = 0
  for (let i = 0; i < pledgeCount; i++) {
    const f = 0.4 + rand() * 2.6
    fractions.push(f)
    totalFraction += f
  }

  const events: PledgeEvent[] = []
  const sources: Record<SourceId, number> = {
    direct: 0,
    twitter: 0,
    reddit: 0,
    newsletter: 0,
    partner: 0,
  }
  const backers = new Set<string>()

  for (let i = 0; i < pledgeCount; i++) {
    const dayOffset = Math.floor(rand() * spanDays)
    const timestamp = new Date(start + dayOffset * 24 * 60 * 60 * 1000)
    const amount = Number(
      ((campaign.raised * fractions[i]) / totalFraction).toFixed(2)
    )

    // Stable pseudo-address per (campaign, backer index) — realistic shape,
    // never real money. First 5 chars echo the index for debugging.
    const backerIndex = 1000 + i + Math.floor(rand() * 1000)
    const backer = `G${String(backerIndex).padStart(4, "0")}${Math.floor(
      rand() * 1e10
    )
      .toString(16)
      .padStart(48, "0")
      .slice(0, 52)
      .toUpperCase()
      .padEnd(52, "X")}`

    const source: SourceId =
      SOURCES[Math.floor(rand() * SOURCES.length)].id
    sources[source]++

    backers.add(backer)

    events.push({
      timestamp: timestamp.toISOString(),
      amount,
      backer,
      source: { id: source, label: "" } as unknown as PledgerSource, // replaced below
    })
  }

  // Sort events chronologically for the time series.
  events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  return { events, sources, backers }
}

/**
 * Bucket the events by day and produce cumulative funding over time.
 */
function buildFundingOverTime(events: PledgeEvent[]): FundingOverTimePoint[] {
  const buckets = new Map<string, number>()
  for (const ev of events) {
    const day = ev.timestamp.slice(0, 10) // YYYY-MM-DD
    buckets.set(day, (buckets.get(day) ?? 0) + ev.amount)
  }

  const sortedDays = [...buckets.keys()].sort()
  let cumulative = 0
  return sortedDays.map((date) => {
    const pledgedToday = Number((buckets.get(date) ?? 0).toFixed(2))
    cumulative = Number((cumulative + pledgedToday).toFixed(2))
    return { date, pledgedToday, cumulative }
  })
}

/**
 * Compute funding velocity in XLM / day averaged over the entire event
 * window. Returns 0 when the window is too short or there are no events.
 */
function computeFundingVelocity(
  events: PledgeEvent[],
  deadline: string
): number {
  if (!events.length) return 0
  const { start, end } = eventWindow(deadline)
  const days = Math.max(
    1,
    Math.ceil((end - start) / (24 * 60 * 60 * 1000))
  )
  const total = events.reduce((sum, ev) => sum + ev.amount, 0)
  return Number((total / days).toFixed(2))
}

/**
 * Build v1 supported metrics for a campaign. Mixes real contract totals
 * with deterministic mock indexed events.
 */
function buildV1Metrics(campaign: Campaign): V1SupportedMetrics {
  const { events, sources, backers } = generateMockEvents(campaign)
  const fundingOverTime = buildFundingOverTime(events)
  const fundingVelocityXlmPerDay = computeFundingVelocity(
    events,
    campaign.deadline
  )

  // Compute per-source totals.
  const perSourceTotals = new Map<string, number>()
  for (const ev of events) {
    const src = ev.source.id as SourceId
    perSourceTotals.set(src, (perSourceTotals.get(src) ?? 0) + ev.amount)
  }

  const referralBreakdown: PledgerSource[] = SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    backers: sources[s.id] ?? 0,
    pledged: Number((perSourceTotals.get(s.id) ?? 0).toFixed(2)),
  }))

  return {
    raised: campaign.raised,
    goal: campaign.goal,
    deadline: campaign.deadline,
    fundingVelocityXlmPerDay,
    fundingOverTime,
    uniqueBackers: backers.size,
    totalPledges: events.length,
    referralBreakdown,
  }
}

/**
 * Future (out-of-scope) funnel metrics. They are not computed in v1 because
 * impression tracking does not exist yet, but we emit the descriptors so the
 * dashboard can render explicit placeholders.
 */
function buildFutureMetrics(): FutureFunnelMetrics {
  const reason =
    "Requires impression tracking (not implemented in v1). Will be enabled when Issue #67 indexer exposes pageview / click events."
  return {
    pageViews: { available: false, reason },
    clickThroughRate: { available: false, reason },
    conversionRate: { available: false, reason },
    impressionsToBackerRatio: { available: false, reason },
  }
}

/**
 * Build the full analytics payload for one campaign.
 *
 * `viewerAddress` is included so the API can attach `isOwner` without
 * exposing server-only ownership checks back to the client.
 */
export function buildAnalytics(
  campaign: Campaign,
  viewerAddress: string | null,
  ownerAddress: string | null
): AnalyticsResponse {
  return {
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    isOwner: !!viewerAddress && !!ownerAddress && viewerAddress === ownerAddress,
    v1: buildV1Metrics(campaign),
    future: buildFutureMetrics(),
  }
}
