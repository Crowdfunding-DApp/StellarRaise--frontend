"use client"

import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { KycGateState } from "@/hooks/useKycGate"

interface KycVerificationPanelProps {
  state: Extract<KycGateState, "required" | "verifying" | "rejected">
  error: string | null
  onStart: () => void
}

export function KycVerificationPanel({ state, error, onStart }: KycVerificationPanelProps) {
  if (state === "verifying") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-card-border bg-background p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-foreground/70">Verifying your identity...</p>
      </div>
    )
  }

  if (state === "rejected") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <ShieldAlert className="w-6 h-6 text-red-500" />
        <p className="text-sm text-foreground/70">{error || "Identity verification could not be completed."}</p>
        <Button variant="outline" onClick={onStart} className="w-full">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-card-border bg-background p-6 text-center">
      <ShieldCheck className="w-6 h-6 text-primary" />
      <p className="text-sm text-foreground/70">
        This pledge amount requires identity verification before it can be confirmed.
      </p>
      <Button onClick={onStart} className="w-full">
        Verify Identity
      </Button>
    </div>
  )
}
