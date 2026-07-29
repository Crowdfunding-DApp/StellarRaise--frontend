"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/WalletContext"
import { useTranslations } from "next-intl"
import { useKycGate } from "@/hooks/useKycGate"
import { KycVerificationPanel } from "@/components/kyc/KycVerificationPanel"
import type { KycConfig } from "@/lib/kyc/types"
import { useDialogA11y } from "@/lib/useDialogA11y"

interface PledgeModalProps {
  isOpen: boolean
  onClose: () => void
  campaignTitle: string
  /** Optional pledge-context hints for the KYC gate. Absent by default — the gate stays inert without them. */
  jurisdiction?: string
  campaignType?: string
  /** Overrides for the KYC gate config (e.g. to enable it for this surface, or in tests). Off by default. */
  kycConfig?: Partial<KycConfig>
}

type TxState = "idle" | "processing" | "success" | "error"

export function PledgeModal({
  isOpen,
  onClose,
  campaignTitle,
  jurisdiction,
  campaignType,
  kycConfig,
}: PledgeModalProps) {
  const { address, connect } = useWallet()
  const t = useTranslations("PledgeModal")
  const [pledgeAmount, setPledgeAmount] = useState<string>("100")
  const [txState, setTxState] = useState<TxState>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")
  const kyc = useKycGate({ config: kycConfig })

  const handlePledge = async () => {
    if (!address) {
      await connect()
      return
    }

    if (!pledgeAmount || isNaN(Number(pledgeAmount)) || Number(pledgeAmount) <= 0) {
      setTxState("error")
      setErrorMessage(t("invalid_amount"))
      return
    }

    const decision = kyc.evaluate({
      amount: Number(pledgeAmount),
      currency: "XLM",
      jurisdiction,
      campaignType,
      walletAddress: address,
    })

    if (decision.required && kyc.state !== "verified") {
      // Gate engaged: render KycVerificationPanel instead of proceeding.
      // No-op when the gate is disabled (the default) — decision.required is always false then.
      return
    }

    setTxState("processing")

    try {
      // Simulate Freighter transaction signing delay
      await new Promise((resolve) => setTimeout(resolve, 2500))
      setTxState("success")
      // Reset state and close modal after success
      setTimeout(() => {
        setTxState("idle")
        onClose()
      }, 3000)
    } catch (err) {
      setTxState("error")
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg || "Transaction failed or rejected.")
    }
  }

  const handleClose = () => {
    if (txState === "processing") return
    setTxState("idle")
    kyc.reset()
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
              aria-labelledby="pledge-modal-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-card-border rounded-2xl shadow-2xl p-6 pointer-events-auto outline-none"
            >
              {/* Header: justify-between is RTL-safe (start/end flip automatically) */}
              <div className="flex justify-between items-center mb-6">
                <h2 id="pledge-modal-title" className="text-xl font-bold text-foreground">{t("title")}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={txState === "processing"}
                  className="rounded-full"
                  aria-label="Close pledge modal"
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
                  <h3 className="text-2xl font-bold mb-2">{t("success_title")}</h3>
                  <p className="text-foreground/70">
                    {t("success_message", { campaign: campaignTitle })}
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
                  <h3 className="text-2xl font-bold mb-2">{t("error_title")}</h3>
                  <p className="text-foreground/70 mb-6">{errorMessage}</p>
                  <Button variant="outline" onClick={() => setTxState("idle")} className="w-full">
                    {t("try_again")}
                  </Button>
                </div>
              ) : kyc.state === "required" || kyc.state === "verifying" || kyc.state === "rejected" ? (
                <KycVerificationPanel
                  state={kyc.state}
                  error={kyc.error}
                  onStart={() =>
                    address &&
                    kyc.startVerification({
                      amount: Number(pledgeAmount),
                      currency: "XLM",
                      jurisdiction,
                      campaignType,
                      walletAddress: address,
                    })
                  }
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-foreground/70">
                    {t("pledging_to")}{" "}
                    <span className="font-semibold text-foreground">{campaignTitle}</span>.
                  </p>

                  <div className="space-y-2">
                    <label htmlFor="pledge-amount" className="text-sm font-medium">{t("amount_label")}</label>
                    <div className="relative">
                      <input
                        id="pledge-amount"
                        type="number"
                        value={pledgeAmount}
                        onChange={(e) => setPledgeAmount(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        placeholder={t("amount_placeholder")}
                        min="1"
                        disabled={txState === "processing"}
                        // Always LTR for numeric input regardless of document direction
                        dir="ltr"
                      />
                      {/* XLM badge positioned at the logical end of the input */}
                      <div className="absolute end-4 top-1/2 -translate-y-1/2 font-bold text-foreground/50 pointer-events-none">
                        XLM
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handlePledge}
                    disabled={txState === "processing"}
                    className="w-full h-12 text-lg mt-4 shadow-primary/30"
                  >
                    {txState === "processing" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        {t("confirming")}
                      </span>
                    ) : !address ? (
                      t("connect_to_pledge")
                    ) : (
                      t("confirm_pledge")
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
