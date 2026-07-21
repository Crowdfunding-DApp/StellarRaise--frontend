"use client"

import { useCallback, useMemo, useState } from "react"
import { getKycConfig } from "@/lib/kyc/config"
import { evaluateKycGate } from "@/lib/kyc/gate"
import { getKycProvider } from "@/lib/kyc/registry"
import type { GateDecision, KycConfig, PledgeContext } from "@/lib/kyc/types"

export type KycGateState = "not_required" | "required" | "verifying" | "verified" | "rejected"

interface UseKycGateOptions {
  /** Overrides applied on top of env-derived config, e.g. for a specific campaign or a test. */
  config?: Partial<KycConfig>
}

/**
 * Pluggable KYC middleware for the pledge flow. Callers evaluate() a pledge
 * before submitting it; if the gate is disabled (the default) this always
 * returns not-required and the caller's flow is unaffected. If required,
 * the caller renders a verification step and calls startVerification()
 * before retrying the pledge.
 */
export function useKycGate(options?: UseKycGateOptions) {
  const config = useMemo(() => getKycConfig(options?.config), [options?.config])
  const [state, setState] = useState<KycGateState>("not_required")
  const [error, setError] = useState<string | null>(null)

  const evaluate = useCallback(
    (context: PledgeContext): GateDecision => {
      const decision = evaluateKycGate(config, context)
      setState((prev) => (decision.required ? (prev === "verified" ? prev : "required") : "not_required"))
      return decision
    },
    [config]
  )

  const startVerification = useCallback(
    async (context: PledgeContext & { walletAddress: string }) => {
      setState("verifying")
      setError(null)
      try {
        const provider = getKycProvider(config)
        const result = await provider.startVerification(context)
        setState(result.status === "verified" ? "verified" : "rejected")
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setState("rejected")
        throw err
      }
    },
    [config]
  )

  const reset = useCallback(() => {
    setState("not_required")
    setError(null)
  }, [])

  return { config, state, error, evaluate, startVerification, reset }
}
