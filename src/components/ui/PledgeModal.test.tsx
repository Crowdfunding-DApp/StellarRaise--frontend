import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PledgeModal } from "./PledgeModal"

vi.mock("@/context/WalletContext", () => ({
  useWallet: () => ({
    address: "GABCDEF1234567890",
    isConnecting: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

describe("PledgeModal + KYC gate integration", () => {
  it("ungated path: pledge completes immediately when the KYC gate is off (default)", async () => {
    render(<PledgeModal isOpen={true} onClose={() => {}} campaignTitle="Test Campaign" />)

    fireEvent.change(screen.getByPlaceholderText("100"), { target: { value: "50000" } })
    fireEvent.click(screen.getByRole("button", { name: /confirm pledge/i }))

    expect(screen.getByText(/confirming in wallet/i)).toBeInTheDocument()
    expect(screen.queryByText(/requires identity verification/i)).not.toBeInTheDocument()

    await waitFor(() => expect(screen.getByText(/pledge successful/i)).toBeInTheDocument(), { timeout: 4000 })
  })

  it("gated path: a pledge above the configured threshold is blocked behind identity verification", async () => {
    render(
      <PledgeModal
        isOpen={true}
        onClose={() => {}}
        campaignTitle="Test Campaign"
        jurisdiction="US"
        kycConfig={{ enabled: true, defaultThreshold: 1000 }}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("100"), { target: { value: "50000" } })
    fireEvent.click(screen.getByRole("button", { name: /confirm pledge/i }))

    expect(screen.getByText(/requires identity verification/i)).toBeInTheDocument()
    expect(screen.queryByText(/confirming in wallet/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /verify identity/i }))
    expect(screen.getByText(/verifying your identity/i)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByRole("button", { name: /confirm pledge/i })).toBeInTheDocument(), {
      timeout: 3000,
    })

    fireEvent.click(screen.getByRole("button", { name: /confirm pledge/i }))
    await waitFor(() => expect(screen.getByText(/pledge successful/i)).toBeInTheDocument(), { timeout: 4000 })
  })

  it("gated path: a pledge below the configured threshold is not blocked", async () => {
    render(
      <PledgeModal
        isOpen={true}
        onClose={() => {}}
        campaignTitle="Test Campaign"
        jurisdiction="US"
        kycConfig={{ enabled: true, defaultThreshold: 100000 }}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("100"), { target: { value: "50000" } })
    fireEvent.click(screen.getByRole("button", { name: /confirm pledge/i }))

    expect(screen.queryByText(/requires identity verification/i)).not.toBeInTheDocument()
    expect(screen.getByText(/confirming in wallet/i)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText(/pledge successful/i)).toBeInTheDocument(), { timeout: 4000 })
  })

  it("gated path: an exempt jurisdiction is not blocked regardless of amount", async () => {
    render(
      <PledgeModal
        isOpen={true}
        onClose={() => {}}
        campaignTitle="Test Campaign"
        jurisdiction="US"
        kycConfig={{ enabled: true, defaultThreshold: 100, exemptJurisdictions: ["US"] }}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("100"), { target: { value: "50000" } })
    fireEvent.click(screen.getByRole("button", { name: /confirm pledge/i }))

    expect(screen.queryByText(/requires identity verification/i)).not.toBeInTheDocument()
    expect(screen.getByText(/confirming in wallet/i)).toBeInTheDocument()
  })
})
