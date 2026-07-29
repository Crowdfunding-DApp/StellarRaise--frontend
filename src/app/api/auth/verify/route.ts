import { NextResponse } from "next/server"
import { verifyChallenge } from "@/lib/server/owner-auth"

export const runtime = "nodejs"

/**
 * POST /api/auth/verify
 *
 * Body: `{ address: string, signature: string }` where `signature` is the
 * base64-encoded ed25519 signature returned by Freighter's `signMessage`
 * over the issued challenge.
 *
 * On success, sets an HttpOnly HMAC-signed session cookie containing the
 * authenticated address. The challenge is consumed in either case.
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
  const signature =
    typeof body === "object" && body !== null && "signature" in body
      ? String((body as { signature: unknown }).signature ?? "").trim()
      : ""

  if (!address || !signature) {
    return NextResponse.json(
      { ok: false, error: "Missing 'address' or 'signature' in request body." },
      { status: 400 }
    )
  }

  const result = await verifyChallenge(address, signature)
  if (!result.ok) {
    return NextResponse.json(result, { status: 401 })
  }
  return NextResponse.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  })
}
