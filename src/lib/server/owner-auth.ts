import crypto from "node:crypto"
import { cookies } from "next/headers"
import { Keypair } from "@stellar/stellar-sdk"
import type { AuthChallenge, AuthVerifySuccess, ApiErrorResponse } from "@/types/analytics"

/**
 * Server-side owner authentication helpers.
 *
 * Flow:
 *   1. POST /api/auth/challenge -> issues a one-time signed challenge.
 *   2. Client signs the challenge message with Freighter.
 *   3. POST /api/auth/verify -> verifies the ed25519 signature against the
 *      requested public key and on success issues an HMAC-signed HttpOnly
 *      cookie. The cookie payload contains `{ address, exp }` and is bound to
 *      this server-side signing secret.
 *   4. Subsequent /api/analytics/* and /api/owner/campaigns requests are
 *      authenticated by verifying the cookie's HMAC.
 *
 * SECRETS: `OWNER_SESSION_SECRET` is required in production. In dev, a
 * per-process ephemeral secret is used so tests run in isolation.
 */

const DEFAULT_TTL_SECONDS = 300 // 5 minutes — challenges are short-lived
const COOKIE_NAME = "sr_owner_session"
const SESSION_TTL_SECONDS = 60 * 60 // 1 hour session

const SESSION_COOKIE_SECRET: string =
  process.env.OWNER_SESSION_SECRET ??
  // Stable per-process secret for dev / tests so behaviour is reproducible.
  `dev-secret-${process.pid}-${Math.random().toString(36).slice(2)}`

/**
 * In-memory challenge store. In production this would be Redis or a
 * short-lived KV store. Single-process bookkeeping is sufficient for v1
 * because we run on a single Next.js server.
 */
interface ChallengeRecord {
  nonce: string
  message: string
  issuedAt: number
  ttlSeconds: number
}

const challengeStore = new Map<string, ChallengeRecord>()

/**
 * Generate a fresh challenge for the given `address`. The returned `message`
 * MUST be signed verbatim by the wallet.
 */
export function issueChallenge(address: string): AuthChallenge {
  const nonce = crypto.randomBytes(16).toString("hex")
  const issuedAt = new Date().toISOString()
  const ttlSeconds = DEFAULT_TTL_SECONDS

  const message = [
    "Stellar Raise Owner Authentication",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued at: ${issuedAt}`,
    "By signing this message you confirm control of the wallet used to view",
    "creator analytics for the associated campaign. This signature does not",
    "authorize any transaction.",
  ].join("\n")

  challengeStore.set(address, {
    nonce,
    message,
    issuedAt: Date.now(),
    ttlSeconds,
  })
  return { nonce, issuedAt, message, ttlSeconds }
}

/**
 * Verify a signed challenge. Clears the challenge on success or failure to
 * prevent replay.
 *
 * Returns `{ ok: true, address, expiresAt }` on success or `{ ok: false,
 * error }` on any failure.
 */
export async function verifyChallenge(
  address: string,
  signedMessageB64: string
): Promise<AuthVerifySuccess | ApiErrorResponse> {
  const record = challengeStore.get(address)
  if (!record) {
    return { ok: false, error: "No active challenge for this address." }
  }
  const ageMs = Date.now() - record.issuedAt
  if (ageMs > record.ttlSeconds * 1000) {
    challengeStore.delete(address)
    return { ok: false, error: "Challenge expired. Please request a new one." }
  }

  let valid = false
  try {
    const keypair = Keypair.fromPublicKey(address)
    // Verify against the *exact* message the client was asked to sign,
    // not the nonce or any subset of the message — defends against
    // signature malleability and partial-message forgery.
    const messageBytes = Buffer.from(record.message, "utf-8")
    // Freighter returns base64-encoded ed25519 signature.
    const signatureBytes = Buffer.from(signedMessageB64, "base64")
    valid = keypair.verify(messageBytes, signatureBytes)
  } catch {
    valid = false
  }

  // Consume the challenge regardless of outcome to prevent replay.
  challengeStore.delete(address)

  if (!valid) {
    return { ok: false, error: "Signature verification failed." }
  }

  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  const session = signSession({
    address,
    exp: Math.floor(expiresAt.getTime() / 1000),
  })
  await setOwnerSessionCookie(session, expiresAt)

  return { ok: true, address, expiresAt: expiresAt.toISOString() }
}

interface SessionPayload {
  address: string
  exp: number // unix seconds
}

/**
 * HMAC-sign a session payload. Format: base64url(JSON).hmacHex
 */
function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = crypto
    .createHmac("sha256", SESSION_COOKIE_SECRET)
    .update(body)
    .digest("hex")
  return `${body}.${sig}`
}

/**
 * Verify an HMAC-signed session cookie. Returns the unwrapped payload or
 * null. Malformed / tampered cookies return null.
 */
function unsignSession(token: string): SessionPayload | null {
  const idx = token.lastIndexOf(".")
  if (idx === -1) return null
  const body = token.slice(0, idx)
  const sig = token.slice(idx + 1)
  const expected = crypto
    .createHmac("sha256", SESSION_COOKIE_SECRET)
    .update(body)
    .digest("hex")
  // Constant-time comparison
  const a = Buffer.from(sig, "utf-8")
  const b = Buffer.from(expected, "utf-8")
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8")
    ) as SessionPayload
    if (typeof payload.address !== "string" || typeof payload.exp !== "number") {
      return null
    }
    if (payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Issue the session cookie on the outgoing response via Next.js `cookies()`
 * (async in Next.js 15+). Returns the resolved jar so the caller can
 * await the write before responding.
 */
async function setOwnerSessionCookie(token: string, expiresAt: Date) {
  const jar = await cookies()
  jar.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

/**
 * Read and verify the current owner session. Returns the authenticated
 * address or null. Use this from API routes.
 *
 * `await`-s the cookies() promise transparently.
 */
export async function getCurrentOwnerAddress(): Promise<string | null> {
  const jar = await cookies()
  const cookie = jar.get(COOKIE_NAME)
  if (!cookie?.value) return null
  const session = unsignSession(cookie.value)
  return session?.address ?? null
}

/**
 * Clear the session cookie (used by POST /api/auth/logout). Uses the
 * `delete()` API; if a runtime doesn't expose `delete` it falls back to
 * `set(maxAge: 0)` without swallowing errors.
 */
export async function clearOwnerSession(): Promise<void> {
  const jar = (await cookies()) as {
    delete?: (name: string) => void
    set?: (c: {
      name: string
      value: string
      httpOnly: boolean
      sameSite: "strict"
      secure: boolean
      path: string
      maxAge: number
    }) => void
  }
  if (typeof jar.delete === "function") {
    jar.delete(COOKIE_NAME)
    return
  }
  if (typeof jar.set === "function") {
    jar.set({
      name: COOKIE_NAME,
      value: "",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
  }
}
