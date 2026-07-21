import {
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk"
import { isFlagEnabled } from "@/lib/feature-flags"

export interface Campaign {
  id: string
  title: string
  description: string
  raised: number
  goal: number
  deadline: string
  image: string
}

function getRpcUrl(): string {
  const url = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SOROBAN_RPC_URL is not defined. Please set it in your environment variables."
    )
  }
  return url
}

function getContractId(): string {
  const id = process.env.NEXT_PUBLIC_CONTRACT_ID
  if (!id) {
    throw new Error(
      "NEXT_PUBLIC_CONTRACT_ID is not defined. Please set it in your environment variables."
    )
  }
  return id
}

interface RawCampaign {
  title: string
  description: string
  raised: number
  goal: number
  deadline: number
  image: string
}

/**
 * Minimal Account class for creating TransactionBuilder instances
 * for read-only (simulate-only) contract calls without requiring
 * a real user wallet.
 */
class DummyAccount {
  private _accountId: string

  constructor(accountId: string) {
    this._accountId = accountId
  }

  accountId(): string {
    return this._accountId
  }

  sequenceNumber(): string {
    return "0"
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  incrementSequenceNumber(): void {
    // no-op for simulated transactions
  }
}

/**
 * Fetches all campaigns from the deployed Soroban crowdfunding contract.
 *
 * Uses the **legacy** `simulateTransaction` flow (deprecated RPC path).
 * Kept for backward compatibility during the indexer-migration rollout.
 */
async function getCampaignsLegacy(): Promise<Campaign[]> {
  const rpcUrl = getRpcUrl()
  const contractId = getContractId()

  const server = new rpc.Server(rpcUrl)
  const contract = new Contract(contractId)

  // Build the "get_campaigns" operation with no arguments
  const operation = contract.call("get_campaigns")

  // Get the network passphrase dynamically
  const network = await server.getNetwork()
  const networkPassphrase = network.passphrase

  // Use a dummy account for read-only simulation
  const source = new DummyAccount(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"
  )

  // Build the transaction containing the contract call
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .setTimeout(30)
    .addOperation(operation)
    .build()

  // Simulate the contract call
  const result = await server.simulateTransaction(tx)

  if (
    rpc.Api.isSimulationError(result) ||
    !result.result ||
    !result.result.retval
  ) {
    throw new Error(
      "Failed to fetch campaigns from the Soroban contract. The contract may not be deployed or the network is unreachable."
    )
  }

  // Convert the ScVal result back to native JS values
  const rawCampaigns = scValToNative(result.result.retval) as RawCampaign[]

  const campaigns: Campaign[] = rawCampaigns.map((raw, index) => ({
    id: String(index + 1),
    title: raw.title,
    description: raw.description,
    raised: Number(raw.raised),
    goal: Number(raw.goal),
    deadline: new Date(Number(raw.deadline) * 1000).toISOString(),
    image: raw.image || "",
  }))

  return campaigns
}

/**
 * Fetches all campaigns using the **new indexer** endpoint.
 *
 * This is the Issue-49 migration path. It calls a Soroban indexer
 * endpoint (via NEXT_PUBLIC_INDEXER_URL) that returns pre-processed
 * campaign data, avoiding the deprecated `simulateTransaction` flow.
 *
 * Exposed as a separate function so it can be A/B tested behind the
 * "indexer-migration" feature flag.
 */
export async function getCampaignsFromIndexer(): Promise<Campaign[]> {
  const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL
  if (!indexerUrl) {
    throw new Error(
      "NEXT_PUBLIC_INDEXER_URL is not defined. Set it to use the indexer-based campaign fetch."
    )
  }

  const contractId = getContractId()

  const response = await fetch(
    `${indexerUrl}/contracts/${contractId}/campaigns`,
    { headers: { Accept: "application/json" } }
  )

  if (!response.ok) {
    throw new Error(
      `Indexer responded with ${response.status}: ${response.statusText}. ` +
      "Falling back to the legacy RPC path is recommended until the indexer is stable."
    )
  }

  const rawCampaigns: RawCampaign[] = await response.json()

  const campaigns: Campaign[] = rawCampaigns.map((raw, index) => ({
    id: String(index + 1),
    title: raw.title,
    description: raw.description,
    raised: Number(raw.raised),
    goal: Number(raw.goal),
    deadline: new Date(Number(raw.deadline) * 1000).toISOString(),
    image: raw.image || "",
  }))

  return campaigns
}

/**
 * Fetches all campaigns from the deployed Soroban crowdfunding contract.
 *
 * Automatically selects the data-fetching strategy based on the
 * `indexer-migration` feature flag:
 * - **Flag enabled:** uses the new indexer endpoint (Issue 49).
 * - **Flag disabled:** uses the legacy `simulateTransaction` RPC path.
 *
 * @param walletAddress - Optional wallet address used for percentage-rollout
 *                        bucketing so the same user sees a consistent path.
 */
export async function getCampaigns(
  walletAddress?: string | null
): Promise<Campaign[]> {
  const useIndexer = isFlagEnabled("indexer-migration", walletAddress)

  if (useIndexer) {
    try {
      return await getCampaignsFromIndexer()
    } catch (err) {
      // If the indexer path fails during rollout, degrade gracefully
      // to the legacy path rather than breaking the page for the user.
      console.warn(
        "[FeatureFlag] indexer-migration: indexer fetch failed, falling back to legacy RPC.",
        err
      )
    }
  }

  return getCampaignsLegacy()
}

