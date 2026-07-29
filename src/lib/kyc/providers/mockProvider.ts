import type { KycProvider, KycVerificationResult } from "../types"

/**
 * Default provider used in local development and tests: auto-approves after
 * a short simulated delay, in-memory only. Never wire this up in a
 * production deployment that actually enables the gate — register a real
 * vendor integration (Persona, Sumsub, Onfido, ...) via registerKycProvider
 * instead.
 */
export function createMockKycProvider(): KycProvider {
  const store = new Map<string, KycVerificationResult>()

  return {
    id: "mock",
    async getStatus(walletAddress) {
      return store.get(walletAddress) ?? { status: "unverified" }
    },
    async startVerification(context) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const result: KycVerificationResult = {
        status: "verified",
        reference: `mock-${context.walletAddress}-${Date.now()}`,
        verifiedAt: new Date().toISOString(),
      }
      store.set(context.walletAddress, result)
      return result
    },
  }
}
