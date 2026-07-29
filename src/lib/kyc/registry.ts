import type { KycConfig, KycProvider, KycProviderId } from "./types"
import { createMockKycProvider } from "./providers/mockProvider"

type KycProviderFactory = () => KycProvider

const providerFactories = new Map<KycProviderId, KycProviderFactory>([["mock", createMockKycProvider]])

/**
 * Registers a KycProvider implementation under an id so it can be selected
 * via KycConfig.provider (e.g. from an env var). Real vendor integrations
 * call this once at app startup: registerKycProvider("persona", () => createPersonaProvider(...)).
 */
export function registerKycProvider(id: KycProviderId, factory: KycProviderFactory): void {
  providerFactories.set(id, factory)
}

export function getKycProvider(config: KycConfig): KycProvider {
  const factory = providerFactories.get(config.provider)
  if (!factory) {
    throw new Error(
      `No KYC provider registered for id "${config.provider}". Register one via registerKycProvider() before enabling the KYC gate.`
    )
  }
  return factory()
}
