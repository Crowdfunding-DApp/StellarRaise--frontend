import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useKycGate } from "./useKycGate"

describe("useKycGate", () => {
  it("ungated path: never requires verification when the gate is off (default config)", () => {
    const { result } = renderHook(() => useKycGate())

    let decision
    act(() => {
      decision = result.current.evaluate({ amount: 1_000_000, currency: "XLM", jurisdiction: "US" })
    })

    expect(decision).toMatchObject({ required: false, reason: "kyc_gate_disabled" })
    expect(result.current.state).toBe("not_required")
  })

  it("gated path: flags a large pledge as requiring verification, then verifies via the provider", async () => {
    const { result } = renderHook(() => useKycGate({ config: { enabled: true, defaultThreshold: 1000 } }))

    act(() => {
      const decision = result.current.evaluate({ amount: 5000, currency: "XLM", jurisdiction: "US" })
      expect(decision.required).toBe(true)
    })
    expect(result.current.state).toBe("required")

    await act(async () => {
      await result.current.startVerification({ amount: 5000, currency: "XLM", walletAddress: "GABC" })
    })

    await waitFor(() => expect(result.current.state).toBe("verified"))
  })

  it("does not re-gate a pledge from an already-verified wallet in the same session", async () => {
    const { result } = renderHook(() => useKycGate({ config: { enabled: true, defaultThreshold: 1000 } }))

    act(() => {
      result.current.evaluate({ amount: 5000, currency: "XLM", jurisdiction: "US" })
    })
    await act(async () => {
      await result.current.startVerification({ amount: 5000, currency: "XLM", walletAddress: "GABC" })
    })
    expect(result.current.state).toBe("verified")

    act(() => {
      result.current.evaluate({ amount: 5000, currency: "XLM", jurisdiction: "US" })
    })
    expect(result.current.state).toBe("verified")
  })

  it("reset() returns the gate to its inert state", async () => {
    const { result } = renderHook(() => useKycGate({ config: { enabled: true, defaultThreshold: 1000 } }))

    act(() => {
      result.current.evaluate({ amount: 5000, currency: "XLM", jurisdiction: "US" })
    })
    expect(result.current.state).toBe("required")

    act(() => {
      result.current.reset()
    })
    expect(result.current.state).toBe("not_required")
  })
})
