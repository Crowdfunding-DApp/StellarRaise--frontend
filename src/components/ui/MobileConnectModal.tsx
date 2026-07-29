"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import { X, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/WalletContext"
import {
  MOBILE_WALLET_OPTIONS,
  createSession,
  isSessionExpired,
  buildConnectUri,
  type ConnectSession,
} from "@/lib/mobileWallets"

interface MobileConnectModalProps {
  isOpen: boolean
  onClose: () => void
}

type HandshakeState = "waiting" | "success" | "expired" | "error"

export function MobileConnectModal({ isOpen, onClose }: MobileConnectModalProps) {
  const { setAddress } = useWallet()
  const [session, setSession] = useState<ConnectSession | null>(null)
  const [state, setState] = useState<HandshakeState>("waiting")

  useEffect(() => {
    if (!isOpen) return

    const newSession = createSession()
    setSession(newSession)
    setState("waiting")

    // Simulates the wallet app scanning the QR / opening the deep link and
    // approving the session. A real implementation needs a relay/session-
    // bridge server here: the wallet approves the *specific* nonce over an
    // authenticated channel, the server marks that nonce consumed so it
    // can't be replayed, and rejects anything past the session's expiry.
    const approvalTimer = setTimeout(() => {
      setState((current) => (current === "waiting" ? "success" : current))
    }, 3000)

    const expiryTimer = setInterval(() => {
      setSession((current) => {
        if (current && isSessionExpired(current)) {
          setState((s) => (s === "waiting" ? "expired" : s))
        }
        return current
      })
    }, 1000)

    return () => {
      clearTimeout(approvalTimer)
      clearInterval(expiryTimer)
    }
  }, [isOpen])

  useEffect(() => {
    if (state !== "success") return
    // Mock address standing in for the one a real wallet would return.
    const MOCK_MOBILE_ADDRESS = "GDEMOMOBILEWALLETPLACEHOLDERADDRESSNOTAREALACCOUNTAAAA"
    setAddress(MOCK_MOBILE_ADDRESS)
    const timer = setTimeout(() => onClose(), 2000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const handleClose = () => {
    setState("waiting")
    setSession(null)
    onClose()
  }

  const handleRetry = () => {
    const newSession = createSession()
    setSession(newSession)
    setState("waiting")
  }

  const connectUri = session ? buildConnectUri(session) : ""

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-card-border rounded-2xl shadow-2xl p-6 pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-foreground">Connect Mobile Wallet</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full"
                  aria-label="Close mobile connect modal"
                >
                  <X className="w-5 h-5 text-foreground/60" />
                </Button>
              </div>

              {state === "success" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Wallet Connected!</h3>
                  <p className="text-foreground/70">Your mobile wallet session was approved.</p>
                </div>
              ) : state === "expired" || state === "error" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <AlertCircle className="w-8 h-8" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">
                    {state === "expired" ? "Session Expired" : "Connection Failed"}
                  </h3>
                  <p className="text-foreground/70 mb-6">
                    {state === "expired"
                      ? "This pairing session timed out before it was approved."
                      : "Something went wrong pairing with your wallet."}
                  </p>
                  <Button variant="outline" onClick={handleRetry} className="w-full">
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-foreground/70">
                    No wallet extension was detected on this device. Scan the QR code with your
                    wallet app, or open it directly below.
                  </p>

                  {connectUri && (
                    <div className="flex justify-center bg-white rounded-xl p-4">
                      <QRCodeSVG value={connectUri} size={180} />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    {MOBILE_WALLET_OPTIONS.map((wallet) => (
                      <Button
                        key={wallet.name}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => {
                          if (connectUri) {
                            window.location.href = wallet.buildDeepLink(connectUri)
                          }
                        }}
                      >
                        Open in {wallet.name}
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-foreground/60 pt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for approval…
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  )
}
