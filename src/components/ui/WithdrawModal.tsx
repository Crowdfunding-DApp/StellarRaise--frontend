"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, AlertCircle, Loader2, Landmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/context/WalletContext"
import { splitWithdrawal, getMaxSingleWithdrawalFromRemaining, PLATFORM_FEE_BPS } from "@/lib/withdrawal"

interface WithdrawModalProps {
  isOpen: boolean
  onClose: () => void
  campaignTitle: string
  /** Remaining balance not yet withdrawn, minus any prior withdrawals. */
  remainingBalance: number
  onWithdrawSuccess: (amount: number) => void
}

type TxState = "idle" | "processing" | "success" | "error"

export function WithdrawModal({
  isOpen,
  onClose,
  campaignTitle,
  remainingBalance,
  onWithdrawSuccess,
}: WithdrawModalProps) {
  const { address } = useWallet()
  const maxSingleWithdrawal = getMaxSingleWithdrawalFromRemaining(remainingBalance)
  const [amount, setAmount] = useState<string>(String(maxSingleWithdrawal || remainingBalance))
  const [txState, setTxState] = useState<TxState>("idle")
  const [errorMessage, setErrorMessage] = useState<string>("")

  const numericAmount = Number(amount)
  const isValidAmount =
    amount !== "" &&
    !isNaN(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <= maxSingleWithdrawal

  const { netAmount, feeAmount } = splitWithdrawal(isValidAmount ? numericAmount : 0)

  const handleWithdraw = async () => {
    if (!isValidAmount) {
      setTxState("error")
      setErrorMessage(`Enter an amount up to ${maxSingleWithdrawal.toLocaleString()} XLM.`)
      return
    }

    setTxState("processing")

    try {
      // Simulate Freighter transaction signing for withdrawal
      await new Promise((resolve) => setTimeout(resolve, 2500))

      setTxState("success")
      onWithdrawSuccess(numericAmount)

      setTimeout(() => {
        setTxState("idle")
        onClose()
      }, 3000)
    } catch (err) {
      setTxState("error")
      const message = err instanceof Error ? err.message : String(err)
      setErrorMessage(message || "Withdrawal transaction failed or was rejected.")
    }
  }

  const handleClose = () => {
    if (txState === "processing") return
    setTxState("idle")
    onClose()
  }

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
                <h2 className="text-xl font-bold text-foreground">Withdraw Funds</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={txState === "processing"}
                  className="rounded-full"
                  aria-label="Close withdraw modal"
                >
                  <X className="w-5 h-5 text-foreground/60" />
                </Button>
              </div>

              {txState === "success" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Withdrawal Successful!</h3>
                  <p className="text-foreground/70">
                    {netAmount.toLocaleString()} XLM from{" "}
                    <span className="font-semibold text-foreground">{campaignTitle}</span> has
                    been sent to your wallet.
                  </p>
                </div>
              ) : txState === "error" ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <AlertCircle className="w-8 h-8" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-2">Withdrawal Failed</h3>
                  <p className="text-foreground/70 mb-6">{errorMessage}</p>
                  <Button variant="outline" onClick={() => setTxState("idle")} className="w-full">
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
                    <Landmark className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground/80">
                      Up to {maxSingleWithdrawal.toLocaleString()} XLM is withdrawable in this
                      transaction ({remainingBalance.toLocaleString()} XLM remaining overall). A
                      per-transaction cap applies until full multisig approval is in place.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount to Withdraw (XLM)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-lg font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                        min="0"
                        max={maxSingleWithdrawal}
                        disabled={txState === "processing"}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-foreground/50">
                        XLM
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/50 border border-card-border rounded-xl px-4 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/60">Gross amount</span>
                      <span className="font-semibold text-foreground">
                        {(isValidAmount ? numericAmount : 0).toLocaleString()} XLM
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground/60">
                        Platform fee ({(PLATFORM_FEE_BPS / 100).toFixed(2)}%)
                      </span>
                      <span className="font-semibold text-red-400">
                        -{feeAmount.toLocaleString()} XLM
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-card-border pt-2">
                      <span className="text-foreground/60">You receive</span>
                      <span className="font-semibold text-primary">
                        {netAmount.toLocaleString()} XLM
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/60">
                    Proceeding will initiate a withdrawal transaction from{" "}
                    <span className="font-semibold text-foreground">{campaignTitle}</span> to{" "}
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
                    onClick={handleWithdraw}
                    disabled={txState === "processing" || !isValidAmount}
                    className="w-full h-12 text-lg mt-2 shadow-primary/30"
                  >
                    {txState === "processing" ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Confirming in Wallet…
                      </span>
                    ) : (
                      "Confirm Withdrawal"
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
