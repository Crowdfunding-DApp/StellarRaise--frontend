import { describe, expect, it } from "vitest"
import { defaultKycConfig } from "./config"
import { evaluateKycGate } from "./gate"
import type { KycConfig } from "./types"

describe("evaluateKycGate", () => {
  it("never requires KYC when the gate is disabled (default config)", () => {
    const decision = evaluateKycGate(defaultKycConfig, { amount: 1_000_000, currency: "XLM" })
    expect(decision).toEqual({ required: false, reason: "kyc_gate_disabled" })
  })

  it("does not require KYC below the threshold when enabled", () => {
    const config: KycConfig = { ...defaultKycConfig, enabled: true, defaultThreshold: 10000 }
    const decision = evaluateKycGate(config, { amount: 500, currency: "XLM" })
    expect(decision).toEqual({ required: false, reason: "below_threshold" })
  })

  it("requires KYC at or above the threshold when enabled", () => {
    const config: KycConfig = { ...defaultKycConfig, enabled: true, defaultThreshold: 10000 }
    const decision = evaluateKycGate(config, { amount: 10000, currency: "XLM", jurisdiction: "US" })
    expect(decision).toEqual({ required: true, reason: "threshold_exceeded" })
  })

  it("applies a jurisdiction-specific threshold override", () => {
    const config: KycConfig = {
      ...defaultKycConfig,
      enabled: true,
      defaultThreshold: 10000,
      jurisdictionThresholds: { FR: 1000 },
    }
    expect(evaluateKycGate(config, { amount: 1500, currency: "XLM", jurisdiction: "FR" }).required).toBe(true)
    expect(evaluateKycGate(config, { amount: 1500, currency: "XLM", jurisdiction: "DE" }).required).toBe(false)
  })

  it("exempts explicitly listed jurisdictions regardless of amount", () => {
    const config: KycConfig = {
      ...defaultKycConfig,
      enabled: true,
      defaultThreshold: 100,
      exemptJurisdictions: ["US"],
    }
    const decision = evaluateKycGate(config, { amount: 999_999, currency: "XLM", jurisdiction: "US" })
    expect(decision).toEqual({ required: false, reason: "jurisdiction_exempt" })
  })

  it("exempts listed campaign types regardless of amount", () => {
    const config: KycConfig = {
      ...defaultKycConfig,
      enabled: true,
      defaultThreshold: 100,
      exemptCampaignTypes: ["community"],
    }
    const decision = evaluateKycGate(config, { amount: 999_999, currency: "XLM", campaignType: "community" })
    expect(decision).toEqual({ required: false, reason: "campaign_type_exempt" })
  })

  it("honors the unknown-jurisdiction policy", () => {
    const skipConfig: KycConfig = {
      ...defaultKycConfig,
      enabled: true,
      defaultThreshold: 100,
      unknownJurisdictionPolicy: "skip",
    }
    expect(evaluateKycGate(skipConfig, { amount: 999_999, currency: "XLM" }).required).toBe(false)

    const requireConfig: KycConfig = {
      ...defaultKycConfig,
      enabled: true,
      defaultThreshold: 100,
      unknownJurisdictionPolicy: "require",
    }
    expect(evaluateKycGate(requireConfig, { amount: 999_999, currency: "XLM" }).required).toBe(true)
  })
})
