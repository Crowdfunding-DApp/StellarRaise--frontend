/**
 * Pure validation helpers (Issue #78).
 *
 * - Email validation is RFC-pragmatic: rejects whitespace, requires a single '@'
 *   and a TLD-like suffix. Good enough for client-side gating.
 * - Consent is a strict boolean: the caller must have an explicit affirmative
 *   signal before any contact information is persisted.
 * - `redactEmail` produces a log-safe representation; it is used wherever a raw
 *   email might otherwise leak (logs, deliveries, error reports).
 *
 * The redactor intentionally collapses multi-level domains (e.g.
 * `bob@mail.example.co` → `b***@m***.co`) so the country TLD is the only
 * domain hint visible to anyone scanning logs.
 */

// Pragmatic email pattern: local@domain.tld with no whitespace and a 254-char cap
// matches RFC 5321 path length limits.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX_LENGTH = 254;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

export function validateEmail(raw: unknown): ValidationResult {
  if (typeof raw !== "string") {
    return { valid: false, error: "Email is required." };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Email is required." };
  }
  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return { valid: false, error: "Email is too long." };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: "Please enter a valid email address (e.g. name@example.com).",
    };
  }
  return { valid: true, normalized: trimmed.toLowerCase() };
}

export function requireConsent(consent: unknown): ValidationResult {
  if (consent !== true) {
    return {
      valid: false,
      error:
        "Explicit consent is required before we store your contact information.",
    };
  }
  return { valid: true };
}

/**
 * Produces a log-safe representation of an email such as `j***@e***.com`.
 * Multi-level domains collapse to their top-level TLD only — never returns
 * intermediate domain segments.
 */
export function redactEmail(email: string): string {
  if (!email || typeof email !== "string") return "***";
  const at = email.indexOf("@");
  if (at <= 0 || at === email.length - 1) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const firstDot = domain.indexOf(".");
  if (firstDot <= 0) return "***";
  const user = domain.slice(0, firstDot);
  // If there are multiple dots, only the TLD is shown; intermediate segments
  // are dropped entirely for privacy.
  const lastDot = domain.lastIndexOf(".");
  const tld =
    lastDot > firstDot ? domain.slice(lastDot) : domain.slice(firstDot);
  const redact = (s: string): string =>
    s.length === 0 ? "" : s[0] + "***";
  return `${redact(local)}@${redact(user)}${tld}`;
}

/** Redact a Stellar address for safe logging (first 5 chars + '...'). */
export function redactWallet(address: string | null | undefined): string {
  if (!address || typeof address !== "string" || address.length < 6) {
    return "***";
  }
  return `${address.slice(0, 5)}***`;
}
