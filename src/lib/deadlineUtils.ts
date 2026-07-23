/**
 * Timezone-safe deadline utilities for StellarRaise.
 *
 * ## Hydration-safe strategy
 *
 * Next.js renders pages on the server (SSR/SSG) and then "hydrates" the same
 * HTML on the client.  If any value computed during SSR differs from the value
 * computed during the first client render, React emits a hydration-mismatch
 * warning and replaces the server-rendered HTML — causing a flash and a
 * potential CLS penalty.
 *
 * Countdown timers are the classic offender: `new Date()` returns different
 * values on the server and on the client.  The safe pattern is:
 *
 * 1. **Render a stable placeholder on the server** – e.g. `{ days:0, hours:0,
 *    minutes:0 }` or `null` — so both the server pass and the initial client
 *    render produce identical HTML.
 * 2. **Start the real timer inside `useEffect`** – `useEffect` only runs in
 *    the browser, never on the server, so any value computed there will never
 *    cause a mismatch.
 * 3. **Use UTC timestamps for all arithmetic** – `Date.prototype.getTime()`
 *    (alias `.valueOf()`) always returns milliseconds since the Unix epoch in
 *    UTC, regardless of the host's locale or timezone.  Comparing two such
 *    values is therefore deterministic across every timezone.
 *
 * ### Why `new Date(isoString).getTime()` is timezone-safe
 *
 * ISO-8601 strings that include a timezone designator (e.g. `"Z"` or
 * `"+05:30"`) are parsed to the correct UTC instant by every ES5-compliant
 * engine.  Deadlines stored by the contract are already UTC ISO strings
 * (produced by `new Date(unixSeconds * 1000).toISOString()`), so parsing them
 * with `new Date()` and extracting `.getTime()` is safe.
 *
 * ### Future SSR migration checklist
 *
 * - Pass `nowMs` as a prop when rendering CountdownTimer from a Server
 *   Component so the initial render is deterministic.
 * - Keep `useEffect` as the mutation point for subsequent ticks.
 * - Never call `Date.now()` or `new Date()` outside of `useEffect` / event
 *   handlers in components that are rendered on the server.
 */

/** Milliseconds per unit — useful for readable arithmetic. */
const MS = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
} as const

export interface TimeLeft {
  days: number
  hours: number
  minutes: number
}

/**
 * Returns the number of milliseconds remaining until `deadline`.
 *
 * Both `deadlineMs` and `nowMs` must be UTC milliseconds (i.e. the result of
 * `Date.prototype.getTime()`).  The subtraction is purely numeric and is
 * therefore independent of the host timezone.
 *
 * Returns `0` when the deadline has already passed.
 */
export function msUntilDeadline(deadlineMs: number, nowMs: number): number {
  return Math.max(0, deadlineMs - nowMs)
}

/**
 * Converts a millisecond duration into `{ days, hours, minutes }`.
 *
 * All values are non-negative integers; excess is carried up (i.e. 25 hours
 * becomes `{ days: 1, hours: 1, minutes: 0 }`).
 */
export function msToTimeLeft(ms: number): TimeLeft {
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0 }
  }
  return {
    days: Math.floor(ms / MS.day),
    hours: Math.floor((ms % MS.day) / MS.hour),
    minutes: Math.floor((ms % MS.hour) / MS.minute),
  }
}

/**
 * Parses a deadline value (UTC ISO string or `Date`) to UTC milliseconds.
 *
 * Accepts the same union type that `CountdownTimer` and `page.tsx` use so
 * call-sites don't need to repeat the conversion.
 */
export function deadlineToMs(deadline: Date | string): number {
  return new Date(deadline).getTime()
}

/**
 * Returns `true` when the deadline is in the past relative to `nowMs`.
 *
 * This is the timezone-safe replacement for:
 *   `new Date(campaign.deadline) < new Date()`
 *
 * Using UTC milliseconds ensures the comparison behaves identically for a
 * user in UTC-12 and a user in UTC+14.
 */
export function isDeadlinePassed(
  deadline: Date | string,
  nowMs: number
): boolean {
  return deadlineToMs(deadline) <= nowMs
}

/**
 * Computes the time remaining until a deadline given an explicit `nowMs`.
 *
 * Combines `msUntilDeadline` and `msToTimeLeft` for convenience.
 */
export function computeTimeLeft(
  deadline: Date | string,
  nowMs: number
): TimeLeft {
  return msToTimeLeft(msUntilDeadline(deadlineToMs(deadline), nowMs))
}
