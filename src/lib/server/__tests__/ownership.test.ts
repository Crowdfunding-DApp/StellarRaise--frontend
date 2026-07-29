import { describe, it, expect } from "vitest"
import {
  getCampaignOwner,
  filterOwnedCampaigns,
} from "@/lib/server/ownership"
import type { Campaign } from "@/lib/soroban"

const CAMPAIGN: Campaign = {
  id: "1",
  title: "C1",
  description: "d",
  raised: 1,
  goal: 1,
  deadline: new Date().toISOString(),
  image: "",
}

describe("ownership", () => {
  it("returns the registered owner for known ids", () => {
    expect(getCampaignOwner("1")).toBeTruthy()
    expect(getCampaignOwner("2")).toBeTruthy()
  })

  it("returns null for unknown ids", () => {
    expect(getCampaignOwner("nope")).toBeNull()
  })

  it("filterOwnedCampaigns matches the provided wallet address", () => {
    const owner = getCampaignOwner("1")!
    const matched = filterOwnedCampaigns(
      [{ ...CAMPAIGN, id: "1" }, { ...CAMPAIGN, id: "999" }],
      owner
    )
    expect(matched.length).toBe(1)
    expect(matched[0].id).toBe("1")
    expect(matched[0].owner).toBe(owner)
  })

  it("filterOwnedCampaigns returns empty when address is null", () => {
    const matched = filterOwnedCampaigns([CAMPAIGN], null)
    expect(matched).toEqual([])
  })
})
