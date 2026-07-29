"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, AlertCircle, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/WalletContext"
import { useDialogA11y } from "@/lib/useDialogA11y"

interface RefundModalProps {
  isOpen: boolean
  onClose: () => void
  campaignTitle: string
  pledgedAmount?: number
}

type TxState = "idle" | "processing" | "success" | "error"

export function RefundModal({
  isOpen,
  onClose,
  campaignTitle,
  pledgedAmount,
}: RefundModalProps) {
  const { address, connect } = useWallet()
  const [txState, setTxState] = useState<TxState>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  const handleClaimRefund = async () => {
    if (!address) {
      await connect()
      return
    }

    setTxState("processing")

    try {
      // Simulate Freighter transaction signing for refund
      await new Promise((resolve) => setTimeout(resolve, 2500))

      setTxState("success")

      setTimeout(() => {
        setTxState("idle")
        onClose()
      }, 3000)
    } catch (err) {
      setTxState("error")
      const message = err instanceof Error ? err.message : String(err)
      setErrorMessage(message || "Refund transaction failed or was rejected.")
    }
  }

  const handleClose = () => {
    if (txState === "processing") return
    setTxState("idle")
    onClose()
  }

  const containerRef = useDialogA11y(isOpen, handleClose)

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={containerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="refund-modal-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-card-border rounded-2xl shadow-2xl p-6 pointer-events-auto outline-none"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 id="refund-modal-title" className="text-xl font-bold text-foreground">Claim Refund</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={txState === "processing"}
                  className="rounded-full"
                  aria-label="Close refund modal"
                >
                  <X className="w-5 h-5 text-foreground/60" aria-hidden="true" />
                </Button>
              </div>

              {txState === "success" ? (
                <div role="status" className="flex flex-col items-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Refund Successful!</h3>
                  <p className="text-foreground/70">
                    Your pledge to{" "}
                    <span className="font-semibold text-foreground">{campaignTitle}</span>{" "}
                    has been refunded to your wallet.
                  </p>
                </div>
              ) : txState === "error" ? (
                <div role="alert" className="flex flex-col items-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <AlertCircle className="w-8 h-8" aria-hidden="true" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Refund Failed</h3>
                  <p className="text-foreground/70 mb-6">{errorMessage}</p>
                  <Button
                    variant="outline"
                    onClick={() => setTxState("idle")}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Campaign failed notice */}
                  <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      This campaign did not reach its funding goal and has expired. You are
                      eligible to claim a full refund.
                    </p>
                  </div>

                  <div className="bg-background/50 border border-card-border rounded-xl px-4 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/60">Campaign</span>
                      <span className="font-semibold text-foreground text-right line-clamp-1 max-w-[60%]">
                        {campaignTitle}
                      </span>
                    </div>
                    {pledgedAmount !== undefined && pledgedAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground/60">Refund amount</span>
                        <span className="font-semibold text-primary-300">
                          {pledgedAmount.toLocaleString()} XLM
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-foreground/60">
                    Proceeding will initiate a refund transaction via your connected wallet.
                    The XLM will be returned to{" "}
                    {address ? (
                      <span className="font-mono text-foreground/80">
                        {address.substring(0, 5)}...{address.substring(address.length - 4)}
                      </span>
                    ) : (
                      "your wallet"
                    )}
                    .
                  </p>

                  <Button
                    onClick={handleClaimRefund}
                    disabled={txState === "processing"}
                    variant="destructive"
                    className="w-full h-12 text-lg mt-2"
                  >
                    {txState === "processing" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        Processing Refund…
                      </span>
                    ) : !address ? (
                      "Connect Wallet to Claim"
                    ) : (
                      <span className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5" aria-hidden="true" />
                        Claim Refund
                      </span>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  )
}
