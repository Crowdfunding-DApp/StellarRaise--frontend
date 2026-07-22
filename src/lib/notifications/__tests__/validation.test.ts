import { describe, expect, it } from "vitest";

import {
  redactEmail,
  redactWallet,
  requireConsent,
  validateEmail,
} from "../validation";

describe("validateEmail", () => {
  it("accepts a normal email", () => {
    const r = validateEmail("User@Example.COM");
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe("user@example.com");
  });

  it("rejects empty input", () => {
    const r = validateEmail("");
    expect(r.valid).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it("rejects whitespace-only input", () => {
    expect(validateEmail("   ").valid).toBe(false);
  });

  it("rejects missing local-part", () => {
    expect(validateEmail("@example.com").valid).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(validateEmail("user@").valid).toBe(false);
  });

  it("rejects missing TLD", () => {
    expect(validateEmail("user@example").valid).toBe(false);
  });

  it("rejects whitespace anywhere", () => {
    expect(validateEmail("us er@example.com").valid).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(validateEmail(undefined).valid).toBe(false);
    expect(validateEmail(42).valid).toBe(false);
    expect(validateEmail({}).valid).toBe(false);
  });

  it("rejects emails longer than 254 chars", () => {
    const long = "a".repeat(250) + "@b.io";
    expect(validateEmail(long).valid).toBe(false);
  });

  it("preserves normalized lowercase", () => {
    const r = validateEmail("  Mixed@CASE.org ");
    expect(r.normalized).toBe("mixed@case.org");
  });
});

describe("requireConsent", () => {
  it("accepts true", () => {
    expect(requireConsent(true).valid).toBe(true);
  });

  it("rejects false", () => {
    const r = requireConsent(false);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/consent/i);
  });

  it("rejects truthy non-boolean values", () => {
    expect(requireConsent("yes").valid).toBe(false);
    expect(requireConsent(1).valid).toBe(false);
    expect(requireConsent(null).valid).toBe(false);
  });
});

describe("redactEmail", () => {
  it("redacts local part and domain user", () => {
    expect(redactEmail("alice@example.com")).toBe("a***@e***.com");
  });

  it("handles sub-domain", () => {
    expect(redactEmail("bob@mail.example.co")).toBe("b***@m***.co");
  });

  it("returns asterisks for malformed input", () => {
    expect(redactEmail("not-an-email")).toBe("***");
    expect(redactEmail("@example.com")).toBe("***");
    expect(redactEmail("user@")).toBe("***");
    expect(redactEmail("")).toBe("***");
    expect(redactEmail(null as unknown as string)).toBe("***");
  });
});

describe("redactWallet", () => {
  it("returns first 5 chars and asterisks", () => {
    expect(redactWallet("GABCDEFGHIJKLMNOP")).toBe("GABCD***");
  });

  it("returns asterisks for short / null inputs", () => {
    expect(redactWallet("")).toBe("***");
    expect(redactWallet("ABCD")).toBe("***");
    expect(redactWallet(null)).toBe("***");
    expect(redactWallet(undefined)).toBe("***");
  });
});
