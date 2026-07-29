import type { KycConfig } from "./types"

// Off by default: the gate must be explicitly enabled by a deployment that
// has determined it's legally required. Threshold/jurisdiction values below
// are placeholders for local development only — real values are a
// legal/compliance decision, supplied via env vars or the `kycConfig` prop.
export const defaultKycConfig: KycConfig = {
  enabled: false,
  defaultThreshold: 10000,
  jurisdictionThresholds: {},
  exemptJurisdictions: [],
  exemptCampaignTypes: [],
  unknownJurisdictionPolicy: "require",
  provider: "mock",
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === "true" || value === "1"
}

function parseList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseThresholdMap(value: string | undefined): Record<string, number> {
  if (!value) return {}
  const result: Record<string, number> = {}
  for (const entry of value.split(",")) {
    const [jurisdiction, amount] = entry.split(":").map((part) => part.trim())
    if (jurisdiction && amount && !isNaN(Number(amount))) {
      result[jurisdiction] = Number(amount)
    }
  }
  return result
}

/**
 * Resolves the effective KYC config from (in increasing priority):
 * built-in defaults -> env vars -> explicit overrides (e.g. a prop passed
 * by a specific campaign/page). This lets a deployment enable the gate
 * globally via env, while still allowing per-surface overrides.
 */
export function getKycConfig(overrides?: Partial<KycConfig>): KycConfig {
  const envConfig: Partial<KycConfig> = {
    enabled: parseBool(process.env.NEXT_PUBLIC_KYC_ENABLED, defaultKycConfig.enabled),
    defaultThreshold: process.env.NEXT_PUBLIC_KYC_THRESHOLD
      ? Number(process.env.NEXT_PUBLIC_KYC_THRESHOLD)
      : defaultKycConfig.defaultThreshold,
    jurisdictionThresholds: parseThresholdMap(process.env.NEXT_PUBLIC_KYC_JURISDICTION_THRESHOLDS),
    exemptJurisdictions: parseList(process.env.NEXT_PUBLIC_KYC_EXEMPT_JURISDICTIONS),
    exemptCampaignTypes: parseList(process.env.NEXT_PUBLIC_KYC_EXEMPT_CAMPAIGN_TYPES),
    provider: process.env.NEXT_PUBLIC_KYC_PROVIDER || defaultKycConfig.provider,
  }

  return {
    ...defaultKycConfig,
    ...envConfig,
    ...overrides,
  }
}
