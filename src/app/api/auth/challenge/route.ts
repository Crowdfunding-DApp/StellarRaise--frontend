import { NextResponse } from "next/server"
import { issueChallenge } from "@/lib/server/owner-auth"

export const runtime = "nodejs"

/**
 * POST /api/auth/challenge
 *
 * Body: `{ address: string }` — the connected Stellar public key.
 *
 * Issues a one-shot signed challenge for the wallet to sign with Freighter.
 * The challenge is stored server-side keyed by address and consumed on
 * `verify`. Returns the exact message the client must sign.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    )
  }

  const address =
    typeof body === "object" && body !== null && "address" in body
      ? String((body as { address: unknown }).address ?? "").trim()
      : ""

  if (!address) {
    return NextResponse.json(
      { ok: false, error: "Missing 'address' in request body." },
      { status: 400 }
    )
  }

  // Lightweight Stellar public-key shape check. Prevents wasting a nonce
  // on obviously invalid input. Full validation happens in `verify`.
  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return NextResponse.json(
      { ok: false, error: "Address is not a valid Stellar public key." },
      { status: 400 }
    )
  }

  const challenge = issueChallenge(address)
  return NextResponse.json(challenge, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  })
}
