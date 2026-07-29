// ISO 3166-1 alpha-2 country code, e.g. "US", "FR". Left as a plain string
// (rather than a union) because the allowed/required set is a legal/product
// decision, not an engineering one — see KycConfig.
export type Jurisdiction = string

export type KycProviderId = string

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected"

export interface PledgeContext {
  amount: number
  currency: string
  jurisdiction?: Jurisdiction
  campaignType?: string
  walletAddress?: string
}

export interface KycConfig {
  /** Master switch. Off by default — the gate is inert until a deployment explicitly enables it. */
  enabled: boolean
  /** Amount (in `currency` units) at or above which KYC is required, absent a jurisdiction-specific override. */
  defaultThreshold: number
  /** Per-jurisdiction threshold overrides, e.g. { US: 10000, FR: 1000 }. Set by legal/compliance, not engineering. */
  jurisdictionThresholds: Record<Jurisdiction, number>
  /** Jurisdictions that never require KYC through this gate, regardless of amount. */
  exemptJurisdictions: Jurisdiction[]
  /** Campaign types (e.g. "community", "nonprofit") that never require KYC through this gate. */
  exemptCampaignTypes: string[]
  /** What to do when the pledger's jurisdiction can't be determined. */
  unknownJurisdictionPolicy: "require" | "skip"
  /** Which registered KycProvider implementation to use for actually verifying identity. */
  provider: KycProviderId
}

export type GateDecisionReason =
  | "kyc_gate_disabled"
  | "campaign_type_exempt"
  | "jurisdiction_exempt"
  | "unknown_jurisdiction_skipped"
  | "below_threshold"
  | "threshold_exceeded"

export interface GateDecision {
  required: boolean
  reason: GateDecisionReason
}

export interface KycVerificationResult {
  status: VerificationStatus
  reference?: string
  verifiedAt?: string
}

/**
 * Integration point for a real identity-verification vendor (Persona, Sumsub,
 * Onfido, ...). Implement this interface and register it via
 * registerKycProvider — the gate and UI never depend on a concrete vendor.
 */
export interface KycProvider {
  id: KycProviderId
  getStatus(walletAddress: string): Promise<KycVerificationResult>
  startVerification(context: PledgeContext & { walletAddress: string }): Promise<KycVerificationResult>
}
