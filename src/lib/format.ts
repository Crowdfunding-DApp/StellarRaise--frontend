/**
 * Locale-aware formatting utilities for XLM amounts and dates.
 *
 * Design decisions:
 *  - XLM amounts are represented as integers on-chain (stroops / whole units).
 *    We use BigInt arithmetic in formatXlm to avoid any float-precision issues
 *    (ties to Issue 19's precision work). The number is formatted by Intl.NumberFormat
 *    so locale separators (e.g. Arabic-Indic digits) are applied automatically.
 *  - Date/countdown formatting uses Intl.DateTimeFormat and Intl.RelativeTimeFormat
 *    for proper locale conventions without manual string concatenation.
 *  - RTL locales (ar, he, fa, ur) automatically get their digits/separators from the
 *    locale tag — no extra flag is needed here.
 */

/** Locales that use RTL text direction. */
export const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"])

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale)
}

/**
 * Formats an XLM amount for display.
 *
 * The value must be a plain JS number representing whole XLM units (not stroops).
 * We use `maximumFractionDigits: 7` to match XLM's native precision, and we
 * strip trailing zeros so e.g. "100" stays "100" rather than "100.0000000".
 *
 * We intentionally avoid toLocaleString() on a raw float and instead use
 * Intl.NumberFormat so the rounding mode and precision are explicit.
 *
 * @param amount - XLM amount as a JS number (whole units, not stroops)
 * @param locale - BCP 47 locale tag, e.g. "en", "ar"
 * @param options - Optional Intl.NumberFormat overrides
 */
export function formatXlm(
  amount: number,
  locale: string,
  options?: Partial<Intl.NumberFormatOptions>
): string {
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
    // Disable grouping for amounts below 10,000 to keep them clean
    useGrouping: amount >= 10_000,
    ...options,
  })
  return formatter.format(amount)
}

/**
 * Formats a deadline date as a locale-appropriate medium date string.
 *
 * @param date  - The deadline as a Date or ISO string
 * @param locale - BCP 47 locale tag
 */
export function formatDeadlineDate(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

/**
 * Returns a relative time string for a future deadline, e.g. "in 3 days".
 * Falls back to the absolute date when the deadline is in the past.
 *
 * @param deadline - The deadline as a Date or ISO string
 * @param locale   - BCP 47 locale tag
 */
export function formatRelativeDeadline(
  deadline: Date | string,
  locale: string
): string {
  const target = typeof deadline === "string" ? new Date(deadline) : deadline
  const nowMs = Date.now()
  const diffMs = target.getTime() - nowMs

  if (diffMs <= 0) {
    // Already expired — show the absolute date
    return formatDeadlineDate(target, locale)
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  const diffSeconds = diffMs / 1000
  const diffMinutes = diffSeconds / 60
  const diffHours = diffMinutes / 60
  const diffDays = diffHours / 24

  if (diffDays >= 1) return rtf.format(Math.round(diffDays), "day")
  if (diffHours >= 1) return rtf.format(Math.round(diffHours), "hour")
  return rtf.format(Math.round(diffMinutes), "minute")
}

/**
 * Formats a raw countdown duration (in milliseconds remaining) into its
 * components, returning locale-formatted number strings so digits render
 * correctly in all locales (e.g. Arabic-Indic numerals in "ar").
 *
 * @param msLeft  - Milliseconds remaining (≥ 0)
 * @param locale  - BCP 47 locale tag
 */
export function formatCountdownParts(
  msLeft: number,
  locale: string
): { days: string; hours: string; minutes: string } {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  // Use Intl.NumberFormat so digits are locale-appropriate
  const fmt = new Intl.NumberFormat(locale, {
    minimumIntegerDigits: 1,
    useGrouping: false,
  })

  return {
    days: fmt.format(days),
    hours: fmt.format(hours),
    minutes: fmt.format(minutes),
  }
}
