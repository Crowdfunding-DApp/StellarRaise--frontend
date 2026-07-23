/**
 * Tests for src/lib/deadlineUtils.ts
 *
 * Timezone test matrix
 * --------------------
 * All functions operate on UTC milliseconds (from Date.prototype.getTime()).
 * The "timezone" of the runtime host is irrelevant; we test this explicitly
 * by constructing ISO strings with different offset designators and verifying
 * that the computed UTC instant is the same regardless of the offset notation.
 *
 * | Scenario              | Input deadline ISO string              | nowMs offset |
 * |-----------------------|----------------------------------------|--------------|
 * | UTC (Z)               | 2026-08-01T12:00:00Z                   | −1 hr        |
 * | Negative UTC offset   | 2026-08-01T07:00:00-05:00 (= 12:00 Z) | −1 hr        |
 * | Positive UTC offset   | 2026-08-01T15:30:00+03:30 (= 12:00 Z) | −1 hr        |
 * | Already passed        | any past timestamp                     | +1 hr        |
 * | Exactly at deadline   | equals nowMs                           | 0            |
 */

import {
  msUntilDeadline,
  msToTimeLeft,
  deadlineToMs,
  isDeadlinePassed,
  computeTimeLeft,
} from "@/lib/deadlineUtils"

// ---------------------------------------------------------------------------
// Helper: a fixed reference deadline expressed three equivalent ways
// ---------------------------------------------------------------------------
// 2026-08-01 12:00:00 UTC  →  Unix ms = 1785326400000
const DEADLINE_UTC_MS = new Date("2026-08-01T12:00:00Z").getTime()
// Same instant written with a negative offset (New York summer, UTC-5)
const DEADLINE_NEG_ISO = "2026-08-01T07:00:00-05:00"
// Same instant written with a positive offset (Tehran summer, UTC+3:30)
const DEADLINE_POS_ISO = "2026-08-01T15:30:00+03:30"

// nowMs = 1 hour before the deadline
const ONE_HOUR_MS = 60 * 60 * 1000
const NOW_BEFORE = DEADLINE_UTC_MS - ONE_HOUR_MS
// nowMs = 1 hour after the deadline
const NOW_AFTER = DEADLINE_UTC_MS + ONE_HOUR_MS

// ---------------------------------------------------------------------------
// deadlineToMs
// ---------------------------------------------------------------------------
describe("deadlineToMs", () => {
  it("parses a UTC ISO string (Z suffix) to the correct UTC ms", () => {
    expect(deadlineToMs("2026-08-01T12:00:00Z")).toBe(DEADLINE_UTC_MS)
  })

  it("parses a negative-offset ISO string to the same UTC ms as Z", () => {
    expect(deadlineToMs(DEADLINE_NEG_ISO)).toBe(DEADLINE_UTC_MS)
  })

  it("parses a positive-offset ISO string to the same UTC ms as Z", () => {
    expect(deadlineToMs(DEADLINE_POS_ISO)).toBe(DEADLINE_UTC_MS)
  })

  it("accepts a Date object and returns its getTime() value", () => {
    const d = new Date(DEADLINE_UTC_MS)
    expect(deadlineToMs(d)).toBe(DEADLINE_UTC_MS)
  })
})

// ---------------------------------------------------------------------------
// msUntilDeadline
// ---------------------------------------------------------------------------
describe("msUntilDeadline", () => {
  it("returns the positive difference when deadline is in the future", () => {
    expect(msUntilDeadline(DEADLINE_UTC_MS, NOW_BEFORE)).toBe(ONE_HOUR_MS)
  })

  it("returns 0 when deadline is in the past", () => {
    expect(msUntilDeadline(DEADLINE_UTC_MS, NOW_AFTER)).toBe(0)
  })

  it("returns 0 when nowMs equals deadlineMs (exactly at deadline)", () => {
    expect(msUntilDeadline(DEADLINE_UTC_MS, DEADLINE_UTC_MS)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// msToTimeLeft
// ---------------------------------------------------------------------------
describe("msToTimeLeft", () => {
  it("converts 0 ms to zeros", () => {
    expect(msToTimeLeft(0)).toEqual({ days: 0, hours: 0, minutes: 0 })
  })

  it("converts negative ms to zeros", () => {
    expect(msToTimeLeft(-1000)).toEqual({ days: 0, hours: 0, minutes: 0 })
  })

  it("converts exactly 1 minute (60 000 ms)", () => {
    expect(msToTimeLeft(60_000)).toEqual({ days: 0, hours: 0, minutes: 1 })
  })

  it("converts exactly 1 hour (3 600 000 ms)", () => {
    expect(msToTimeLeft(3_600_000)).toEqual({ days: 0, hours: 1, minutes: 0 })
  })

  it("converts exactly 1 day (86 400 000 ms)", () => {
    expect(msToTimeLeft(86_400_000)).toEqual({ days: 1, hours: 0, minutes: 0 })
  })

  it("carries excess hours into days (25 hours)", () => {
    expect(msToTimeLeft(25 * 3_600_000)).toEqual({
      days: 1,
      hours: 1,
      minutes: 0,
    })
  })

  it("handles mixed days + hours + minutes (1d 2h 30m)", () => {
    const ms = 1 * 86_400_000 + 2 * 3_600_000 + 30 * 60_000
    expect(msToTimeLeft(ms)).toEqual({ days: 1, hours: 2, minutes: 30 })
  })

  it("truncates sub-minute remainder (89 seconds → 1 minute)", () => {
    // 89 seconds is less than 2 minutes, so should floor to 1 minute
    expect(msToTimeLeft(89_000)).toEqual({ days: 0, hours: 0, minutes: 1 })
  })
})

// ---------------------------------------------------------------------------
// isDeadlinePassed — timezone matrix
// ---------------------------------------------------------------------------
describe("isDeadlinePassed", () => {
  describe("UTC deadline (Z suffix)", () => {
    const deadline = "2026-08-01T12:00:00Z"

    it("returns false when now is before the deadline", () => {
      expect(isDeadlinePassed(deadline, NOW_BEFORE)).toBe(false)
    })

    it("returns true when now is after the deadline", () => {
      expect(isDeadlinePassed(deadline, NOW_AFTER)).toBe(true)
    })

    it("returns true when now equals the deadline (boundary)", () => {
      expect(isDeadlinePassed(deadline, DEADLINE_UTC_MS)).toBe(true)
    })
  })

  describe("negative UTC offset (−05:00, New York summer)", () => {
    it("returns false when now is 1 hour before the UTC-equivalent deadline", () => {
      expect(isDeadlinePassed(DEADLINE_NEG_ISO, NOW_BEFORE)).toBe(false)
    })

    it("returns true when now is 1 hour after the UTC-equivalent deadline", () => {
      expect(isDeadlinePassed(DEADLINE_NEG_ISO, NOW_AFTER)).toBe(true)
    })
  })

  describe("positive UTC offset (+03:30, Tehran summer)", () => {
    it("returns false when now is 1 hour before the UTC-equivalent deadline", () => {
      expect(isDeadlinePassed(DEADLINE_POS_ISO, NOW_BEFORE)).toBe(false)
    })

    it("returns true when now is 1 hour after the UTC-equivalent deadline", () => {
      expect(isDeadlinePassed(DEADLINE_POS_ISO, NOW_AFTER)).toBe(true)
    })
  })

  it("all three ISO representations agree on passed/not-passed", () => {
    // For nowMs before the deadline, all three must return false
    expect(isDeadlinePassed("2026-08-01T12:00:00Z", NOW_BEFORE)).toBe(false)
    expect(isDeadlinePassed(DEADLINE_NEG_ISO, NOW_BEFORE)).toBe(false)
    expect(isDeadlinePassed(DEADLINE_POS_ISO, NOW_BEFORE)).toBe(false)

    // For nowMs after the deadline, all three must return true
    expect(isDeadlinePassed("2026-08-01T12:00:00Z", NOW_AFTER)).toBe(true)
    expect(isDeadlinePassed(DEADLINE_NEG_ISO, NOW_AFTER)).toBe(true)
    expect(isDeadlinePassed(DEADLINE_POS_ISO, NOW_AFTER)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// computeTimeLeft — integration (covers the full pipeline)
// ---------------------------------------------------------------------------
describe("computeTimeLeft", () => {
  it("returns { days:0, hours:1, minutes:0 } when 1 hour remains (UTC Z)", () => {
    expect(computeTimeLeft("2026-08-01T12:00:00Z", NOW_BEFORE)).toEqual({
      days: 0,
      hours: 1,
      minutes: 0,
    })
  })

  it("returns zeros when deadline has passed (UTC Z)", () => {
    expect(computeTimeLeft("2026-08-01T12:00:00Z", NOW_AFTER)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
    })
  })

  it("negative-offset deadline returns identical result to Z deadline", () => {
    expect(computeTimeLeft(DEADLINE_NEG_ISO, NOW_BEFORE)).toEqual(
      computeTimeLeft("2026-08-01T12:00:00Z", NOW_BEFORE)
    )
  })

  it("positive-offset deadline returns identical result to Z deadline", () => {
    expect(computeTimeLeft(DEADLINE_POS_ISO, NOW_BEFORE)).toEqual(
      computeTimeLeft("2026-08-01T12:00:00Z", NOW_BEFORE)
    )
  })

  it("handles a multi-day + mixed time remaining", () => {
    // 3 days + 2 hours + 30 minutes before the deadline
    const nowMs =
      DEADLINE_UTC_MS - (3 * 86_400_000 + 2 * 3_600_000 + 30 * 60_000)
    expect(computeTimeLeft("2026-08-01T12:00:00Z", nowMs)).toEqual({
      days: 3,
      hours: 2,
      minutes: 30,
    })
  })
})
