"use client"

import React, { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { computeTimeLeft, type TimeLeft } from "@/lib/deadlineUtils"

interface CountdownTimerProps {
  deadline: Date | string
}

/**
 * Hydration-safe countdown timer.
 *
 * ## Why `null` is rendered on the first pass
 *
 * `CountdownTimer` is a Client Component (`"use client"`), but Next.js still
 * pre-renders it on the server during SSR/SSG.  `Date.now()` on the server
 * will differ from `Date.now()` on the client, which would cause a React
 * hydration mismatch.
 *
 * The fix: initialise `timeLeft` to `null`.  Both the server render and the
 * *initial* client render output the same placeholder (`--d --h --m`), so the
 * HTML matches and no warning is emitted.  The real countdown starts inside
 * `useEffect`, which runs **only in the browser**, ensuring deterministic
 * values after hydration completes.
 *
 * ## Why countdown arithmetic is timezone-safe
 *
 * All calculations use UTC milliseconds via `Date.prototype.getTime()`.
 * See `src/lib/deadlineUtils.ts` for the full explanation.
 *
 * ## Timezone display
 *
 * The label appends "(UTC)" so users know the countdown is relative to the
 * UTC deadline stored on-chain, regardless of their browser locale.
 */
export function CountdownTimer({ deadline }: CountdownTimerProps) {
  // `null` sentinel keeps the initial render identical on server and client,
  // preventing React hydration mismatches.
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    // This block only runs in the browser — safe to call Date.now() here.
    const tick = () => {
      setTimeLeft(computeTimeLeft(deadline, Date.now()))
    }

    tick()
    const timer = setInterval(tick, 60_000) // update every minute

    return () => clearInterval(timer)
  }, [deadline])

  // Render a stable placeholder during SSR and on the initial client paint.
  const display =
    timeLeft === null
      ? "--d --h --m"
      : `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground/80 bg-background/50 py-1.5 px-3 rounded-md border border-card-border/50 backdrop-blur-sm">
      <Clock className="w-4 h-4 text-primary" />
      <span>
        {display}
        {timeLeft !== null && (
          <span className="ml-1 text-xs text-foreground/50">(UTC)</span>
        )}
      </span>
    </div>
  )
}
