import { NextResponse } from "next/server"
import { clearOwnerSession } from "@/lib/server/owner-auth"

export const runtime = "nodejs"

/**
 * POST /api/auth/logout — clear the HttpOnly owner session cookie.
 */
export async function POST() {
  await clearOwnerSession()
  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  )
}
