import {
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  BASE_FEE,
} from "@stellar/stellar-sdk"

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
 * Uses the configured RPC URL and contract ID from environment variables.
 */
export async function getCampaigns(): Promise<Campaign[]> {
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
