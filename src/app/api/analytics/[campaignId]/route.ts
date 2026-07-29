import { NextResponse } from "next/server"
import { getCampaigns } from "@/lib/soroban"
import { getCampaignOwner } from "@/lib/server/ownership"
import { getCurrentOwnerAddress } from "@/lib/server/owner-auth"
import { buildAnalytics } from "@/lib/server/analytics-provider"

export const runtime = "nodejs"

/**
 * GET /api/analytics/[campaignId]
 *
 * Returns analytics for one campaign. The user MUST have an active HttpOnly
 * session cookie issued by /api/auth/verify, AND the authenticated wallet
 * MUST match the campaign's declared owner. If either check fails, we
 * refuse to compute analytics and never expose data to non-owners.
 *
 * SECURITY:
 *   - Wrong or missing wallet -> 401 with no analytics payload.
 *   - Authenticated but not owner -> 403 with no analytics payload.
 *   - Owner -> 200 with analytics payload (real contract totals + mock
 *     indexed series, clearly labelled in the UI).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params
  const safeId = String(campaignId ?? "").trim()
  if (!safeId) {
    return NextResponse.json(
      { ok: false, error: "Missing campaign id." },
      { status: 400 }
    )
  }

  let viewer: string | null = null
  try {
    viewer = await getCurrentOwnerAddress()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 }
    )
  }
  if (!viewer) {
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 }
    )
  }

  const owner = getCampaignOwner(safeId)
  if (!owner) {
    // Don't leak which campaign ids exist; treat unknown ids the same as
    // not-your-campaign so probing is impossible.
    return NextResponse.json(
      { ok: false, error: "Authentication required." },
      { status: 401 }
    )
  }
  if (owner !== viewer) {
    // Do not leak analytics payload or owner address to the wrong wallet.
    return NextResponse.json(
      { ok: false, error: "You are not the owner of this campaign." },
      { status: 403 }
    )
  }

  let campaign
  try {
    const all = await getCampaigns()
    campaign = all.find((c) => c.id === safeId)
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not retry the campaign from the Soroban contract. Please try again shortly.",
      },
      { status: 502 }
    )
  }

  if (!campaign) {
    return NextResponse.json(
      { ok: false, error: "Campaign not found." },
      { status: 404 }
    )
  }

  const payload = buildAnalytics(campaign, viewer, owner)
  return NextResponse.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  })
}
