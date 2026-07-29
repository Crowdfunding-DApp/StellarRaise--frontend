import { describe, expect, it } from "vitest"
import { defaultKycConfig } from "./config"
import { getKycProvider, registerKycProvider } from "./registry"

describe("getKycProvider", () => {
  it("resolves the mock provider by default", () => {
    expect(getKycProvider(defaultKycConfig).id).toBe("mock")
  })

  it("throws a clear error for an unregistered provider id", () => {
    expect(() => getKycProvider({ ...defaultKycConfig, provider: "sumsub" })).toThrow(
      /No KYC provider registered for id "sumsub"/
    )
  })

  it("allows registering a custom provider implementation (the vendor integration point)", () => {
    registerKycProvider("stub-vendor", () => ({
      id: "stub-vendor",
      getStatus: async () => ({ status: "unverified" }),
      startVerification: async () => ({ status: "verified" }),
    }))

    expect(getKycProvider({ ...defaultKycConfig, provider: "stub-vendor" }).id).toBe("stub-vendor")
  })
})
