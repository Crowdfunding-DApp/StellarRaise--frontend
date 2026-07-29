"use client"

import React, { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { formatCountdownParts } from "@/lib/format"

interface CountdownTimerProps {
  deadline: Date | string
}

export function CountdownTimer({ deadline }: CountdownTimerProps) {
  const t = useTranslations("CountdownTimer")
  const locale = useLocale()

  const [msLeft, setMsLeft] = useState<number>(0)

  useEffect(() => {
    const calculate = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      setMsLeft(Math.max(0, diff))
    }

    calculate()
    const timer = setInterval(calculate, 60_000) // update every minute
    return () => clearInterval(timer)
  }, [deadline])

  const { days, hours, minutes } = formatCountdownParts(msLeft, locale)

  return (
    <div
      className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 bg-background/50 py-1.5 px-3 rounded-md border border-card-border/50 backdrop-blur-sm"
      aria-label={t("aria_label", { days, hours, minutes })}
    >
      <Clock className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
      {/* Wrap the countdown in an explicit LTR span so digit segments
          like "3d 2h 15m" always read left-to-right even in an RTL document.
          The overall component still participates in the RTL flow (icon on right). */}
      <span dir="ltr" className="tabular-nums" aria-hidden="true">
        {t("days", { count: days })}{" "}
        {t("hours", { count: hours })}{" "}
        {t("minutes", { count: minutes })}
      </span>
    </div>
  )
}
