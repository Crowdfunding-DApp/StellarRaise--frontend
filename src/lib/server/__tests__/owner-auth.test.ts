import { describe, it, expect, beforeEach, vi } from "vitest"
import crypto from "node:crypto"
import { Keypair } from "@stellar/stellar-sdk"

/**
 * Server-side crypto tests. We avoid mocking the SDK / crypto modules so we
 * actually exercise the verification path end-to-end against an
 * in-memory keypair.
 */

// vi.hoisted guarantees the cookie map is created before the vi.mock
// factory runs (vitest hoists module-level vi.mock calls to the very top
// of the file). Without this the closures inside the mock factory would
// capture `undefined` for the map at hoisted-eval time.
const { cookieJar } = vi.hoisted(() => {
  const jar = new Map<string, { value: string }>()
  return { cookieJar: jar }
})

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (c: { name: string; value: string }) =>
      cookieJar.set(c.name, { value: c.value }),
    delete: (name: string) => {
      cookieJar.delete(name)
    },
  }),
}))

import {
  issueChallenge,
  verifyChallenge,
  getCurrentOwnerAddress,
  clearOwnerSession,
} from "@/lib/server/owner-auth"

function freshKeypair() {
  return Keypair.random()
}

function signPayload(keypair: Keypair, payload: string) {
  // Returns a base64-encoded ed25519 signature — matches the shape
  // Freighter returns from `signMessage`, so the test exercises the
  // exact same decode step the verifier does in production.
  return keypair.sign(Buffer.from(payload)).toString("base64")
}

beforeEach(() => {
  cookieJar.clear()
})

describe("owner-auth: challenge lifecycle", () => {
  it("issues a challenge with a non-empty message and 32-char hex nonce", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    expect(challenge.nonce).toMatch(/^[a-f0-9]{32}$/i)
    expect(challenge.message.length).toBeGreaterThan(20)
    expect(challenge.message).toContain(kp.publicKey())
    expect(challenge.message).toContain(challenge.nonce)
    expect(challenge.ttlSeconds).toBeGreaterThan(0)
  })

  it("verifies a valid ed25519 signature over the exact challenge message", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    const signature = signPayload(kp, challenge.message)
    const result = await verifyChallenge(kp.publicKey(), signature)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.address).toBe(kp.publicKey())
      expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now())
    }
  })

  it("rejects a signature over the wrong payload (nonce only)", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    const signature = signPayload(kp, challenge.nonce)
    const result = await verifyChallenge(kp.publicKey(), signature)
    expect(result.ok).toBe(false)
  })

  it("rejects a forged signature from a different keypair", async () => {
    const owner = freshKeypair()
    const attacker = freshKeypair()
    const challenge = issueChallenge(owner.publicKey())
    const signature = signPayload(attacker, challenge.message)
    const result = await verifyChallenge(owner.publicKey(), signature)
    expect(result.ok).toBe(false)
  })

  it("rejects replay — second verification of the same challenge fails", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    const signature = signPayload(kp, challenge.message)
    const first = await verifyChallenge(kp.publicKey(), signature)
    const second = await verifyChallenge(kp.publicKey(), signature)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
  })

  it("rejects unknown address with no active challenge", async () => {
    const result = await verifyChallenge(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      "AAAA"
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/no active challenge/i)
    }
  })

  it("rejects expired challenges", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    const signature = signPayload(kp, challenge.message)
    const before = Date.now
    const future =
      new Date(challenge.issuedAt).getTime() +
      challenge.ttlSeconds * 1000 +
      1
    Date.now = () => future
    try {
      const result = await verifyChallenge(kp.publicKey(), signature)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toMatch(/expired/i)
      }
    } finally {
      Date.now = before
    }
  })
})

describe("owner-auth: session cookie", () => {
  it("issues a verifiable session cookie on success", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    const signature = signPayload(kp, challenge.message)
    const result = await verifyChallenge(kp.publicKey(), signature)
    expect(result.ok).toBe(true)
    const address = await getCurrentOwnerAddress()
    expect(address).toBe(kp.publicKey())
  })

  it("rejects a tampered session cookie", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    const signature = signPayload(kp, challenge.message)
    await verifyChallenge(kp.publicKey(), signature)
    const stored = cookieJar.get("sr_owner_session")
    expect(stored?.value).toBeDefined()
    // Replace the last character of the cookie value with `X`. Cookie
    // format is `<base64url-body>.<hex-hmac>`, so the last character is
    // always part of the hex HMAC signature (`0-9a-f`). `X` is not in
    // that set, which guarantees the HMAC can no longer verify.
    const tampered = stored!.value.slice(0, -1) + "X"
    cookieJar.set("sr_owner_session", { value: tampered })
    const address = await getCurrentOwnerAddress()
    expect(address).toBeNull()
  })

  it("clearOwnerSession removes the session", async () => {
    const kp = freshKeypair()
    const challenge = issueChallenge(kp.publicKey())
    const signature = signPayload(kp, challenge.message)
    await verifyChallenge(kp.publicKey(), signature)
    await clearOwnerSession()
    const address = await getCurrentOwnerAddress()
    expect(address).toBeNull()
  })
})

describe("owner-auth: input validation", () => {
  it("rejects non-base64 garbage gracefully", async () => {
    const kp = freshKeypair()
    issueChallenge(kp.publicKey())
    const broken = crypto.randomBytes(4).toString("utf8") + "$$$"
    const bad = await verifyChallenge(kp.publicKey(), broken)
    expect(bad.ok).toBe(false)
    // After consuming the bad attempt, a fresh challenge verifies cleanly.
    const secondChallenge = issueChallenge(kp.publicKey())
    const good = await verifyChallenge(
      kp.publicKey(),
      signPayload(kp, secondChallenge.message)
    )
    expect(good.ok).toBe(true)
  })
})
