"use client"

import React from "react"
import { Clock } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import type { Campaign } from "@/lib/soroban"
import { useGracePeriodStatus } from "@/hooks/useGracePeriodStatus"
import { formatCountdownParts } from "@/lib/format"

interface GracePeriodCountdownProps {
  campaign: Campaign
  remainingBalance: number
  onWithdraw: () => void
}

export function GracePeriodCountdown({
  campaign,
  remainingBalance,
  onWithdraw,
}: GracePeriodCountdownProps) {
  const t = useTranslations("GracePeriodCountdown")
  const locale = useLocale()
  const { active, msRemaining } = useGracePeriodStatus(campaign.fundedAt)

  if (active) {
    const { days, hours, minutes } = formatCountdownParts(msRemaining, locale)
    return (
      <Button
        className="w-full font-bold"
        variant="default"
        disabled
        aria-label={t("aria_label", { days, hours, minutes })}
      >
        <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span dir="ltr" className="tabular-nums ms-1.5" aria-hidden="true">
          {t("opens_in", {
            days: t("days", { count: days }),
            hours: t("hours", { count: hours }),
            minutes: t("minutes", { count: minutes }),
          })}
        </span>
      </Button>
    )
  }

  return (
    <Button
      className="w-full font-bold"
      variant="default"
      disabled={remainingBalance <= 0}
      onClick={onWithdraw}
    >
      Withdraw Funds
    </Button>
  )
}
