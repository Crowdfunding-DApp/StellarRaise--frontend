import { describe, expect, it } from "vitest"
import { createMockKycProvider } from "./mockProvider"

describe("createMockKycProvider", () => {
  it("reports unverified status before any verification attempt", async () => {
    const provider = createMockKycProvider()
    expect(await provider.getStatus("GABC")).toEqual({ status: "unverified" })
  })

  it("marks the wallet verified after startVerification resolves", async () => {
    const provider = createMockKycProvider()
    const result = await provider.startVerification({ amount: 20000, currency: "XLM", walletAddress: "GABC" })

    expect(result.status).toBe("verified")
    expect(await provider.getStatus("GABC")).toMatchObject({ status: "verified" })
  })

  it("keeps verification state isolated per wallet address", async () => {
    const provider = createMockKycProvider()
    await provider.startVerification({ amount: 20000, currency: "XLM", walletAddress: "GABC" })

    expect(await provider.getStatus("GOTHER")).toEqual({ status: "unverified" })
  })
})
