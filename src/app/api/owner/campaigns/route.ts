import { NextResponse } from "next/server"
import { getCampaigns } from "@/lib/soroban"
import { getCampaignOwner } from "@/lib/server/ownership"
import { getCurrentOwnerAddress } from "@/lib/server/owner-auth"

export const runtime = "nodejs"

/**
 * GET /api/owner/campaigns
 *
 * Returns the campaigns owned by the currently authenticated wallet
 * (verified via the HttpOnly session cookie). If the session is missing or
 * the wallet has no owned campaigns, returns an empty list.
 *
 * Never exposes owner addresses directly — only echoes the wallet used by
 * the verified session to look them up.
 */
export async function GET() {
  let address: string | null = null
  try {
    address = await getCurrentOwnerAddress()
  } catch {
    address = null
  }

  if (!address) {
    return NextResponse.json(
      { ok: true, campaigns: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  }

  let campaigns: Awaited<ReturnType<typeof getCampaigns>> = []
  try {
    campaigns = await getCampaigns()
  } catch {
    // Surface as an empty list so the dashboard can render the empty state
    // rather than a hard error on transient RPC issues.
    return NextResponse.json(
      { ok: true, campaigns: [] },
      { status: 200, headers: { "Cache-Control": "no-store" } }
  )
  }

  const owned = campaigns
    .filter((c) => getCampaignOwner(c.id) === address)
    .map((c) => ({
      id: c.id,
      title: c.title,
      raised: c.raised,
      goal: c.goal,
      deadline: c.deadline,
      image: c.image,
    }))

  return NextResponse.json(
    { ok: true, campaigns: owned },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  )
}
