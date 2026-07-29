import type { GateDecision, KycConfig, PledgeContext } from "./types"

export function resolveThreshold(config: KycConfig, jurisdiction?: string): number {
  if (jurisdiction && config.jurisdictionThresholds[jurisdiction] !== undefined) {
    return config.jurisdictionThresholds[jurisdiction]
  }
  return config.defaultThreshold
}

/**
 * Pure decision function: given a config and a pledge, decide whether KYC is
 * required. Contains no I/O and no provider calls, so it stays trivially
 * testable and safe to call on every pledge attempt regardless of whether
 * the gate is enabled.
 */
export function evaluateKycGate(config: KycConfig, context: PledgeContext): GateDecision {
  if (!config.enabled) {
    return { required: false, reason: "kyc_gate_disabled" }
  }

  if (context.campaignType && config.exemptCampaignTypes.includes(context.campaignType)) {
    return { required: false, reason: "campaign_type_exempt" }
  }

  if (context.jurisdiction && config.exemptJurisdictions.includes(context.jurisdiction)) {
    return { required: false, reason: "jurisdiction_exempt" }
  }

  if (!context.jurisdiction && config.unknownJurisdictionPolicy === "skip") {
    return { required: false, reason: "unknown_jurisdiction_skipped" }
  }

  const threshold = resolveThreshold(config, context.jurisdiction)
  if (context.amount < threshold) {
    return { required: false, reason: "below_threshold" }
  }

  return { required: true, reason: "threshold_exceeded" }
}
