"use client"

import React, { useState } from "react"
import {
  Fingerprint,
  ShieldCheck,
  AlertCircle,
  Loader2,
  LogOut,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/WalletContext"
import {
  authenticateAsOwner,
  logoutOwner,
} from "@/lib/client/owner-auth-client"

interface OwnerAuthGateProps {
  /** Address declared as the campaign owner (server-side). */
  ownerAddress: string | null
  /** Optional marker rendered after successful auth (subscription confirmation, etc). */
  onAuthenticated?: () => void
}

/**
 * OwnerAuthGate handles the wallet signature-challenge flow required to
 * view analytics for a campaign.
 *
 * The component is intentionally a controlled surface element that swaps
 * between three states:
 *   1. Connect wallet CTA (no freighter session)
 *   2. Authenticate CTA (wallet present, no signature session)
 *   3. Children / authenticated marker
 *
 * Loading and error states are surfaced inline beneath each CTA.
 */
export function OwnerAuthGate({
  ownerAddress,
  onAuthenticated,
}: OwnerAuthGateProps) {
  const { address, connect, isConnecting } = useWallet()
  const [authenticating, setAuthenticating] = useState(false)
  // Track the address at the moment of auth so a wallet swap mid-flow
  // doesn't reuse stale authentication. Initialised to `null` because
  // we re-issue it when the parent resets on address change.
  const [signedInFor, setSignedInFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setError(null)
    await connect()
  }

  const handleAuthenticate = async () => {
    if (!address) return
    setAuthenticating(true)
    setError(null)
    const result = await authenticateAsOwner(address)
    setAuthenticating(false)
    if (result.ok) {
      setSignedInFor(address)
      onAuthenticated?.()
    } else {
      setError(result.error)
    }
  }

  const handleLogout = async () => {
    await logoutOwner()
    setSignedInFor(null)
    setError(null)
  }

  // The signedIn flag is derived from `address` and `signedInFor` so
  // wallet swaps automatically present the auth CTA again — no
  // effect-based state reset is required.

  const signedIn = !!address && signedInFor === address

  // Already signed in: render the gate as a small confirmed badge.
  // The signedIn flag is derived purely from `address` and
  // `signedInFor`, so a wallet swap (or `signedInFor` reset after
  // logout) automatically returns the user to the auth CTA without
  // requiring an effect-based reset.
  if (signedIn) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card border border-card-border px-5 py-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="bg-green-500/20 text-green-400 w-10 h-10 rounded-xl flex items-center justify-center"
            >
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Owner session active
              </div>
              <div className="text-xs text-foreground/60 font-mono">
                {shortAddress(address)}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Sign out of owner session"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-card-border p-6 flex flex-col gap-4"
      role="region"
      aria-label="Owner authentication"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="bg-primary/15 text-primary w-10 h-10 rounded-xl flex items-center justify-center"
        >
          <Fingerprint className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Authenticate as the campaign owner
          </h2>
          <p className="text-sm text-foreground/60">
            Sign a one-time message with your Stellar wallet to prove ownership.
            No on-chain transaction is broadcast.
          </p>
        </div>
      </div>

      {ownerAddress ? (
        <p className="text-xs text-foreground/60 font-mono break-all">
          Expected owner: {ownerAddress}
        </p>
      ) : (
        <p className="text-xs text-amber-400">
          No owner is registered for this campaign in v1. Once the Soroban
          contract exposes the on-chain owner (Issue #67 follow-up), this
          screen will be enforced automatically.
        </p>
      )}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {!address ? (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="gap-2"
            aria-label={isConnecting ? "Connecting wallet…" : "Connect wallet"}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Connect Wallet
          </Button>
        ) : (
          <Button
            onClick={handleAuthenticate}
            disabled={authenticating || isConnecting}
            className="gap-2"
            aria-label={
              authenticating ? "Signing challenge…" : "Sign owner challenge"
            }
          >
            {authenticating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Fingerprint className="w-4 h-4" />
            )}
            Sign challenge with Freighter
          </Button>
        )}
      </div>

      <p className="text-xs text-foreground/50">
        Your session is bound to a signed HTTP-only cookie for one hour. Sign
        out any time to revoke it.
      </p>
    </motion.div>
  )
}

function shortAddress(address: string | null): string {
  if (!address) return ""
  if (address.length < 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
