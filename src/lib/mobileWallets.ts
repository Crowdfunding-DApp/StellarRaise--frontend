/**
 * Stellar's mobile wallet ecosystem has no single universal deep-link
 * standard (unlike WalletConnect on EVM chains), so each wallet gets its
 * own best-effort URI scheme here rather than one shared protocol.
 */
export interface MobileWalletOption {
  name: string
  /** Builds a deep link that should open the wallet app to the given pairing URI. */
  buildDeepLink: (connectUri: string) => string
}

export const MOBILE_WALLET_OPTIONS: MobileWalletOption[] = [
  {
    name: "Lobstr",
    buildDeepLink: (connectUri) => `https://lobstr.co/connect?uri=${encodeURIComponent(connectUri)}`,
  },
  {
    name: "xBull",
    buildDeepLink: (connectUri) => `xbull://connect?uri=${encodeURIComponent(connectUri)}`,
  },
  {
    name: "Rabet",
    buildDeepLink: (connectUri) => `rabet://connect?uri=${encodeURIComponent(connectUri)}`,
  },
]

export interface ConnectSession {
  id: string
  nonce: string
  expiresAt: number
}

const SESSION_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Creates a short-lived, single-use pairing session. In production this
 * session must be minted and validated by a real relay/session-bridge
 * server, which should enforce: one-time consumption of the nonce (reject
 * replay), expiry (reject stale approvals), and origin binding (reject
 * approvals for a session the requesting client didn't create) to stay
 * safe against replay/hijack. This client-only demo can only model the
 * shape of that session, not enforce it server-side.
 */
export function createSession(): ConnectSession {
  const random = () => Math.random().toString(36).slice(2)
  return {
    id: `${random()}${random()}`,
    nonce: `${random()}${random()}`,
    expiresAt: Date.now() + SESSION_TTL_MS,
  }
}

export function isSessionExpired(session: ConnectSession): boolean {
  return Date.now() >= session.expiresAt
}

/** SEP-7-style pairing URI a wallet app scans/opens to approve the session. */
export function buildConnectUri(session: ConnectSession): string {
  const params = new URLSearchParams({
    session_id: session.id,
    nonce: session.nonce,
    origin: typeof window !== "undefined" ? window.location.origin : "",
  })
  return `web+stellar:connect?${params.toString()}`
}
