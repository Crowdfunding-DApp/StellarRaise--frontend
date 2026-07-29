import { describe, it, expect } from "vitest"
import { buildAnalytics } from "@/lib/server/analytics-provider"
import type { Campaign } from "@/lib/soroban"

function campaignFixture(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: overrides.id ?? "1",
    title: overrides.title ?? "Test campaign",
    description: overrides.description ?? "Hypothetical campaign used in tests.",
    raised: overrides.raised ?? 1000,
    goal: overrides.goal ?? 5000,
    deadline:
      overrides.deadline ??
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    image: overrides.image ?? "",
  }
}

describe("analytics-provider: buildAnalytics", () => {
  it("exposes v1 metrics derived from the campaign", () => {
    const c = campaignFixture({ id: "1", raised: 2500 })
    const analytics = buildAnalytics(c, null, null)
    expect(analytics.campaignId).toBe("1")
    expect(analytics.v1.raised).toBe(2500)
    expect(analytics.v1.goal).toBe(5000)
    expect(analytics.v1.fundingOverTime.length).toBeGreaterThan(0)
    expect(analytics.v1.referralBreakdown.length).toBeGreaterThan(0)
  })

  it("marks isOwner=false when viewer and owner differ", () => {
    const c = campaignFixture()
    const a = buildAnalytics(c, "GAAA…AAAA", "GBBB…BBBB")
    expect(a.isOwner).toBe(false)
  })

  it("marks isOwner=true when viewer equals owner", () => {
    const c = campaignFixture()
    const same = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
    const a = buildAnalytics(c, same, same)
    expect(a.isOwner).toBe(true)
  })

  it("marks isOwner=false when either side is missing", () => {
    const a = buildAnalytics(campaignFixture(), null, "GXXX…")
    expect(a.isOwner).toBe(false)
    const b = buildAnalytics(campaignFixture(), "GYYY…", null)
    expect(b.isOwner).toBe(false)
  })

  it("future metrics are explicitly marked unavailable with reason", () => {
    const c = campaignFixture()
    const a = buildAnalytics(c, null, null)
    expect(a.future.pageViews.available).toBe(false)
    expect(a.future.pageViews.reason.length).toBeGreaterThan(10)
    expect(a.future.clickThroughRate.available).toBe(false)
    expect(a.future.conversionRate.available).toBe(false)
    expect(a.future.impressionsToBackerRatio.available).toBe(false)
  })

  it("produces deterministic output for the same campaign id", () => {
    const c = campaignFixture({ id: "42", raised: 1234 })
    const a = buildAnalytics(c, null, null)
    const b = buildAnalytics(c, null, null)
    expect(a.v1.fundingVelocityXlmPerDay).toBe(
      b.v1.fundingVelocityXlmPerDay
    )
    expect(a.v1.fundingOverTime).toEqual(b.v1.fundingOverTime)
    expect(a.v1.uniqueBackers).toBe(b.v1.uniqueBackers)
    expect(a.v1.totalPledges).toBe(b.v1.totalPledges)
    expect(a.v1.referralBreakdown).toEqual(b.v1.referralBreakdown)
  })

  it("total pledge amount reconciles with raised (within rounding)", () => {
    const c = campaignFixture({ id: "77", raised: 999.99 })
    const a = buildAnalytics(c, null, null)
    // v1 fundingOverTime cumulative final should equal (close to) raised.
    const last = a.v1.fundingOverTime[a.v1.fundingOverTime.length - 1]
    expect(Math.abs(last.cumulative - c.raised)).toBeLessThanOrEqual(0.05)
    expect(a.v1.totalPledges).toBeGreaterThan(0)
    expect(a.v1.uniqueBackers).toBeGreaterThan(0)
  })

  it("handles raised=0 edge case without dividing by zero", () => {
    const c = campaignFixture({ id: "0-edge", raised: 0 })
    const a = buildAnalytics(c, null, null)
    expect(a.v1.raised).toBe(0)
    expect(a.v1.fundingOverTime.length).toBeGreaterThan(0)
    // No NaNs.
    expect(Number.isFinite(a.v1.fundingVelocityXlmPerDay)).toBe(true)
  })
})
