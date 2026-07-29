"use client"

import freighter from "@stellar/freighter-api"
import type { AuthChallenge, AuthVerifySuccess, ApiErrorResponse } from "@/types/analytics"

/**
 * Client-side owner authentication helpers used by the dashboard.
 *
 * Backend flow:
 *   1. POST /api/auth/challenge -> returns a one-shot challenge message
 *   2. signMessage via Freighter -> returns base64-encoded ed25519 signature
 *   3. POST /api/auth/verify -> verifies signature and issues HttpOnly cookie
 */

export type ChallengeResult =
  | { ok: true; challenge: AuthChallenge }
  | { ok: false; error: string }

export type VerifyResult =
  | { ok: true; session: AuthVerifySuccess }
  | { ok: false; error: string }

/**
 * Request a fresh authentication challenge for `address`.
 */
export async function requestChallenge(
  address: string,
  options: { signal?: AbortSignal } = {}
): Promise<ChallengeResult> {
  try {
    const res = await fetch("/api/auth/challenge", {
      method: "POST",
      credentials: "include",
      signal: options.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ address }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const err = (json as ApiErrorResponse | null)?.error ??
        `Failed to issue challenge (HTTP ${res.status}).`
      return { ok: false, error: err }
    }
    return { ok: true, challenge: json as AuthChallenge }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error requesting challenge.",
    }
  }
}

/**
 * Prompt Freighter to sign the challenge message. Returns base64 signature or
 * a structured error result.
 */
export async function signChallenge(
  message: string
): Promise<{ ok: true; signature: string } | { ok: false; error: string }> {
  try {
    const connected = await freighter.isConnected()
    if (!connected) {
      return { ok: false, error: "Freighter wallet is not installed." }
    }
    const allowed = await freighter.isAllowed()
    if (!allowed) {
      const access = await freighter.requestAccess()
      if (!access) {
        return { ok: false, error: "Freighter access was denied." }
      }
    }
    // `networkPassphrase` is required by Freighter v6 so it knows which
    // network the signature scheme should match. We default to Testnet
    // and honour `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` for mainnet.
    const networkPassphrase =
      process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
      "Test SDF Network ; September 2015"
    const signed = await freighter.signMessage(message, {
      networkPassphrase,
    })
    if (
      signed &&
      typeof signed === "object" &&
      "signedMessage" in signed &&
      typeof signed.signedMessage === "string"
    ) {
      return { ok: true, signature: signed.signedMessage }
    }
    return { ok: false, error: "Freighter returned an empty signature." }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Freighter refused to sign.",
    }
  }
}

/**
 * Submit a signed challenge for verification.
 */
export async function submitVerification(
  address: string,
  signature: string,
  options: { signal?: AbortSignal } = {}
): Promise<VerifyResult> {
  try {
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      credentials: "include",
      signal: options.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ address, signature }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const err = (json as ApiErrorResponse | null)?.error ??
        `Signature verification failed (HTTP ${res.status}).`
      return { ok: false, error: err }
    }
    return { ok: true, session: json as AuthVerifySuccess }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error submitting signature.",
    }
  }
}

/**
 * Full challenge → sign → verify flow. Returns the verified session on
 * success.
 */
export async function authenticateAsOwner(
  address: string,
  options: { signal?: AbortSignal } = {}
): Promise<VerifyResult> {
  const challenge = await requestChallenge(address, options)
  if (!challenge.ok) return challenge
  const signature = await signChallenge(challenge.challenge.message)
  if (!signature.ok) return signature
  return submitVerification(address, signature.signature, options)
}

/**
 * Clear the HttpOnly owner session cookie.
 */
export async function logoutOwner(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
}
