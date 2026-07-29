import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard"
import {
  DashboardEmpty,
  DashboardError,
  DashboardUnauthorized,
} from "@/components/analytics/DashboardStates"
import type { AnalyticsResponse } from "@/types/analytics"

const ISONOW = new Date().toISOString()

const sampleData: AnalyticsResponse = {
  campaignId: "1",
  campaignTitle: "Demo campaign",
  isOwner: true,
  v1: {
    raised: 1500,
    goal: 5000,
    deadline: ISONOW,
    fundingVelocityXlmPerDay: 50,
    fundingOverTime: [
      { date: "2024-01-01", pledgedToday: 100, cumulative: 100 },
      { date: "2024-01-02", pledgedToday: 200, cumulative: 300 },
      { date: "2024-01-03", pledgedToday: 250, cumulative: 550 },
    ],
    uniqueBackers: 8,
    totalPledges: 12,
    referralBreakdown: [
      { id: "direct", label: "Direct", backers: 4, pledged: 700 },
      { id: "twitter", label: "Twitter", backers: 3, pledged: 450 },
      { id: "reddit", label: "Reddit", backers: 1, pledged: 350 },
    ],
  },
  future: {
    pageViews: { available: false, reason: "Needs impression tracking" },
    clickThroughRate: { available: false, reason: "Needs impression tracking" },
    conversionRate: { available: false, reason: "Needs impression tracking" },
    impressionsToBackerRatio: {
      available: false,
      reason: "Needs impression tracking",
    },
  },
}

describe("AnalyticsDashboard rendering", () => {
  it("renders title, metrics and panels", () => {
    render(<AnalyticsDashboard data={sampleData} />)
    expect(screen.getByText("Demo campaign")).toBeInTheDocument()
    // "Funding velocity", "Unique backers" and "Total raised" appear in
    // multiple places (MetricCard + FunnelMetrics), so we assert presence
    // via getAllByText rather than strict uniqueness.
    expect(screen.getAllByText(/Funding velocity/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Total raised/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Unique backers/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Referral source breakdown/i)).toBeInTheDocument()
    expect(screen.getByText(/Funnel metrics/i)).toBeInTheDocument()
  })

  it("renders the v1 supported funnel rows", () => {
    render(<AnalyticsDashboard data={sampleData} />)
    // These labels appear as both MetricCard headings and FunnelMetrics
    // row labels, so they match multiple elements — verify presence
    // rather than strict uniqueness.
    expect(screen.getAllByText("Unique backers").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Total pledges").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Funding velocity").length).toBeGreaterThan(0)
  })

  it("renders the out-of-scope funnel guidance", () => {
    render(<AnalyticsDashboard data={sampleData} />)
    expect(screen.getAllByText(/Page views/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Click-through rate/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Conversion rate/i).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Impressions to backer ratio/i).length
    ).toBeGreaterThan(0)
  })
})

describe("Dashboard empty state", () => {
  beforeEach(() => {
    cleanup()
  })
  it("shows the empty state heading and retry handler", () => {
    const onRetry = vi.fn()
    render(<DashboardEmpty onRetry={onRetry} />)
    expect(screen.getByText(/No campaigns yet/i)).toBeInTheDocument()
    const button = screen.getByRole("button", { name: /retry/i })
    button.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe("Dashboard error state", () => {
  it("displays the error message and exposes a retry callback", () => {
    const onRetry = vi.fn()
    render(
      <DashboardError
        message="Soroban RPC temporarily unavailable."
        onRetry={onRetry}
      />
    )
    expect(
      screen.getByText("Soroban RPC temporarily unavailable.")
    ).toBeInTheDocument()
    const button = screen.getByRole("button", { name: /try again/i })
    button.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe("Dashboard unauthorized state", () => {
  it("renders expected and actual addresses when provided", () => {
    render(
      <DashboardUnauthorized
        expected="GBBB…BBBB"
        actual="GAAA…AAAA"
      />
    )
    expect(
      screen.getByText(/Wallet is not the campaign owner/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/GAAA…AAAA/)).toBeInTheDocument()
    expect(screen.getByText(/GBBB…BBBB/)).toBeInTheDocument()
  })
})
